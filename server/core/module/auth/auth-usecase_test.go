package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
)

var testStart = time.Date(2026, 10, 17, 10, 0, 0, 0, time.UTC)

var testMeta = SessionMeta{IP: "10.0.0.1", UserAgent: "test-agent"}

type testEnv struct {
	uc      AuthUseCase
	users   *fakeUserRepo
	tokens  *fakeRefreshTokenRepo
	limiter *fakeRateLimiter
	hasher  *fakeHasher
	google  *fakeGoogle
	now     time.Time
}

func newTestEnv(users ...entity.User) *testEnv {
	env := &testEnv{
		users:   newFakeUserRepo(users...),
		tokens:  newFakeRefreshTokenRepo(),
		limiter: &fakeRateLimiter{blocked: map[string]bool{}},
		hasher:  &fakeHasher{},
		google:  &fakeGoogle{},
		now:     testStart,
	}
	env.uc = InitAuthUseCase(Deps{
		Users:           env.users,
		Fields:          &fakeFieldRepo{keys: map[string]bool{"backend": true, "data": true, "marketing": true, "legal": true}},
		RefreshTokens:   env.tokens,
		RateLimiter:     env.limiter,
		Hasher:          env.hasher,
		AccessTokens:    fakeIssuer{},
		Google:          env.google,
		RefreshTokenTTL: 30 * 24 * time.Hour,
		Now:             func() time.Time { return env.now },
	})
	return env
}

func passwordUser(id, email, password string) entity.User {
	hash := "hashed:" + password
	return entity.User{ID: id, Name: "Budi Santoso", Email: email, PasswordHash: &hash, Role: entity.RoleStudent, IsActive: true}
}

func requireAppError(t *testing.T, err error, kind apperror.Kind) *apperror.Error {
	t.Helper()
	var appErr *apperror.Error
	require.ErrorAs(t, err, &appErr)
	assert.Equal(t, kind, appErr.Kind)
	return appErr
}

func ctxAs(userID string, role entity.Role) context.Context {
	return authctx.WithUser(context.Background(), authctx.User{ID: userID, Role: string(role)})
}

func TestRegister(t *testing.T) {
	t.Run("creates student and opens session", func(t *testing.T) {
		env := newTestEnv()

		session, err := env.uc.Register(context.Background(), RegisterInput{Name: "  Budi  ", Email: " Budi@Kampus.ac.id ", Password: "rahasia123"}, testMeta)

		require.NoError(t, err)
		assert.Equal(t, "Budi", session.User.Name)
		assert.Equal(t, "budi@kampus.ac.id", session.User.Email)
		assert.Equal(t, entity.RoleStudent, session.User.Role)
		assert.False(t, session.User.IsOnboarded)
		require.NotNil(t, session.User.PasswordHash)
		assert.Equal(t, "hashed:rahasia123", *session.User.PasswordHash)
		assert.Equal(t, "access:"+session.User.ID+":student", session.AccessToken)
		assert.Equal(t, testStart.Add(30*24*time.Hour), session.RefreshExpiresAt)

		stored := env.tokens.active()
		require.Len(t, stored, 1)
		assert.Equal(t, secure.HashToken(session.RefreshToken), stored[0].TokenHash, "only the hash is stored")
		assert.NotEqual(t, session.RefreshToken, stored[0].TokenHash)
		assert.Equal(t, "10.0.0.1", stored[0].IPAddress)
	})

	t.Run("collects validation errors per field", func(t *testing.T) {
		env := newTestEnv()

		_, err := env.uc.Register(context.Background(), RegisterInput{Name: "Bu", Email: "bukan-email", Password: "pendek"}, testMeta)

		appErr := requireAppError(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []apperror.FieldError{
			{Field: "name", Message: "Nama minimal 3 karakter"},
			{Field: "email", Message: "Format email tidak valid"},
			{Field: "password", Message: "Kata sandi minimal 8 karakter"},
		}, appErr.Fields)
	})

	t.Run("email already registered", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@kampus.ac.id", "rahasia123"))

		_, err := env.uc.Register(context.Background(), RegisterInput{Name: "Budi", Email: "BUDI@kampus.ac.id", Password: "rahasia123"}, testMeta)

		appErr := requireAppError(t, err, apperror.KindConflict)
		assert.Equal(t, []apperror.FieldError{{Field: "email", Message: msgEmailTakenField}}, appErr.Fields)
	})

	t.Run("rate limited per ip", func(t *testing.T) {
		env := newTestEnv()
		env.limiter.blocked[entity.RegisterRateLimitKey(testMeta.IP)] = true

		_, err := env.uc.Register(context.Background(), RegisterInput{Name: "Budi", Email: "budi@kampus.ac.id", Password: "rahasia123"}, testMeta)

		requireAppError(t, err, apperror.KindTooManyRequests)
	})
}

func TestLogin(t *testing.T) {
	googleOnly := entity.User{ID: "u2", Name: "Gita", Email: "gita@x.com", GoogleSub: ptr("sub-2"), Role: entity.RoleStudent, IsActive: true}
	disabled := passwordUser("u3", "nonaktif@x.com", "rahasia123")
	disabled.IsActive = false

	tests := []struct {
		name     string
		email    string
		password string
		blocked  bool
		wantKind apperror.Kind
		wantMsg  string
	}{
		{name: "success with normalized email", email: " BUDI@x.com ", password: "rahasia123"},
		{name: "wrong password", email: "budi@x.com", password: "salah12345", wantKind: apperror.KindUnauthenticated, wantMsg: msgInvalidCredentials},
		{name: "unknown email gives same message", email: "siapa@x.com", password: "rahasia123", wantKind: apperror.KindUnauthenticated, wantMsg: msgInvalidCredentials},
		{name: "google-only account gives same message", email: "gita@x.com", password: "rahasia123", wantKind: apperror.KindUnauthenticated, wantMsg: msgInvalidCredentials},
		{name: "disabled account", email: "nonaktif@x.com", password: "rahasia123", wantKind: apperror.KindForbidden, wantMsg: msgAccountDisabled},
		{name: "missing password", email: "budi@x.com", password: "", wantKind: apperror.KindValidation},
		{name: "rate limited", email: "budi@x.com", password: "rahasia123", blocked: true, wantKind: apperror.KindTooManyRequests},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"), googleOnly, disabled)
			if tc.blocked {
				env.limiter.blocked[entity.LoginRateLimitKey("budi@x.com", testMeta.IP)] = true
			}

			session, err := env.uc.Login(context.Background(), LoginInput{Email: tc.email, Password: tc.password}, testMeta)

			if tc.wantKind == "" {
				require.NoError(t, err)
				assert.Equal(t, "u1", session.User.ID)
				assert.NotEmpty(t, session.RefreshToken)
				return
			}
			appErr := requireAppError(t, err, tc.wantKind)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, appErr.Message)
			}
			assert.Empty(t, env.tokens.active(), "failed login must not create a session")
		})
	}
}

func TestLogin_UnknownEmailStillRunsPasswordCheck(t *testing.T) {
	env := newTestEnv()

	_, err := env.uc.Login(context.Background(), LoginInput{Email: "siapa@x.com", Password: "rahasia123"}, testMeta)

	requireAppError(t, err, apperror.KindUnauthenticated)
	assert.Equal(t, 1, env.hasher.compareCalls, "bcrypt runs even for unknown emails to keep timing uniform")
}

func TestLogin_RateLimiterDownFailsOpen(t *testing.T) {
	env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
	env.limiter.err = errors.New("redis down")

	_, err := env.uc.Login(context.Background(), LoginInput{Email: "budi@x.com", Password: "rahasia123"}, testMeta)

	assert.NoError(t, err)
}

func TestRefresh(t *testing.T) {
	login := func(t *testing.T, env *testEnv) Session {
		t.Helper()
		session, err := env.uc.Login(context.Background(), LoginInput{Email: "budi@x.com", Password: "rahasia123"}, testMeta)
		require.NoError(t, err)
		return session
	}

	t.Run("rotates token within the same family", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
		first := login(t, env)
		env.now = env.now.Add(time.Hour)

		second, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)

		require.NoError(t, err)
		assert.NotEqual(t, first.RefreshToken, second.RefreshToken)
		active := env.tokens.active()
		require.Len(t, active, 1)
		assert.Equal(t, secure.HashToken(second.RefreshToken), active[0].TokenHash)
		old, err := env.tokens.GetByHash(context.Background(), secure.HashToken(first.RefreshToken))
		require.NoError(t, err)
		assert.Equal(t, active[0].FamilyID, old.FamilyID)
		assert.Equal(t, active[0].ID, *old.ReplacedByID)
	})

	t.Run("reused old token revokes the whole family", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
		first := login(t, env)
		_, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)
		require.NoError(t, err)
		env.now = env.now.Add(time.Minute)

		_, err = env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)

		requireAppError(t, err, apperror.KindUnauthenticated)
		assert.Empty(t, env.tokens.active(), "stolen-token reuse logs out every device in the family")
	})

	t.Run("concurrent tab refresh within grace period gets a new token", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
		first := login(t, env)
		_, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)
		require.NoError(t, err)
		env.now = env.now.Add(5 * time.Second)

		again, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)

		require.NoError(t, err)
		assert.NotEmpty(t, again.RefreshToken)
		assert.Len(t, env.tokens.active(), 2, "family is not revoked")
	})

	t.Run("expired token", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
		first := login(t, env)
		env.now = env.now.Add(31 * 24 * time.Hour)

		_, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)

		requireAppError(t, err, apperror.KindUnauthenticated)
	})

	t.Run("unknown or empty token", func(t *testing.T) {
		env := newTestEnv()
		for _, token := range []string{"", "tidak-dikenal"} {
			_, err := env.uc.Refresh(context.Background(), token, testMeta)
			requireAppError(t, err, apperror.KindUnauthenticated)
		}
	})

	t.Run("disabled user loses session", func(t *testing.T) {
		env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
		first := login(t, env)
		env.users.users["u1"].IsActive = false

		_, err := env.uc.Refresh(context.Background(), first.RefreshToken, testMeta)

		requireAppError(t, err, apperror.KindUnauthenticated)
		assert.Empty(t, env.tokens.active())
	})
}

func TestLogout(t *testing.T) {
	env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))
	session, err := env.uc.Login(context.Background(), LoginInput{Email: "budi@x.com", Password: "rahasia123"}, testMeta)
	require.NoError(t, err)

	require.NoError(t, env.uc.Logout(context.Background(), session.RefreshToken))
	assert.Empty(t, env.tokens.active())

	assert.NoError(t, env.uc.Logout(context.Background(), ""), "logout without cookie is a no-op")
	assert.NoError(t, env.uc.Logout(context.Background(), "tidak-dikenal"))
}

func TestAuthenticate(t *testing.T) {
	disabled := passwordUser("u2", "nonaktif@x.com", "rahasia123")
	disabled.IsActive = false
	promoted := passwordUser("u3", "rina@x.com", "rahasia123")
	promoted.Role = entity.RoleReviewer

	tests := []struct {
		name     string
		token    string
		wantUser authctx.User
		wantErr  bool
	}{
		{name: "valid", token: "access:u1:student", wantUser: authctx.User{ID: "u1", Role: "student"}},
		{name: "role comes from database", token: "access:u3:student", wantUser: authctx.User{ID: "u3", Role: "reviewer"}},
		{name: "invalid token", token: "rusak", wantErr: true},
		{name: "empty token", token: "", wantErr: true},
		{name: "unknown user", token: "access:u9:student", wantErr: true},
		{name: "disabled user", token: "access:u2:student", wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"), disabled, promoted)

			got, err := env.uc.Authenticate(context.Background(), tc.token)

			if tc.wantErr {
				requireAppError(t, err, apperror.KindUnauthenticated)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantUser, got)
		})
	}
}

func TestMe(t *testing.T) {
	env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))

	user, err := env.uc.Me(ctxAs("u1", entity.RoleStudent))
	require.NoError(t, err)
	assert.Equal(t, "budi@x.com", user.Email)

	_, err = env.uc.Me(context.Background())
	requireAppError(t, err, apperror.KindUnauthenticated)
}

func TestCompleteOnboarding(t *testing.T) {
	tests := []struct {
		name       string
		in         OnboardingInput
		wantFields []string
		wantField  string
	}{
		{
			name:       "dedupes keys, keeps order, empty major becomes null",
			in:         OnboardingInput{FieldKeys: []string{"data", " backend ", "data"}, StudentStatus: "final_year", Major: ptr("   ")},
			wantFields: []string{"data", "backend"},
		},
		{name: "no field", in: OnboardingInput{StudentStatus: "final_year"}, wantField: "fieldKeys"},
		{name: "more than three", in: OnboardingInput{FieldKeys: []string{"data", "backend", "marketing", "legal"}, StudentStatus: "final_year"}, wantField: "fieldKeys"},
		{name: "unknown field", in: OnboardingInput{FieldKeys: []string{"astrologi"}, StudentStatus: "final_year"}, wantField: "fieldKeys"},
		{name: "invalid status", in: OnboardingInput{FieldKeys: []string{"data"}, StudentStatus: "alumni"}, wantField: "studentStatus"},
		{name: "major too long", in: OnboardingInput{FieldKeys: []string{"data"}, StudentStatus: "final_year", Major: ptr(string(make([]rune, 101)))}, wantField: "major"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newTestEnv(passwordUser("u1", "budi@x.com", "rahasia123"))

			user, err := env.uc.CompleteOnboarding(ctxAs("u1", entity.RoleStudent), tc.in)

			if tc.wantField != "" {
				appErr := requireAppError(t, err, apperror.KindValidation)
				require.NotEmpty(t, appErr.Fields)
				assert.Equal(t, tc.wantField, appErr.Fields[0].Field)
				assert.False(t, env.users.users["u1"].IsOnboarded)
				return
			}
			require.NoError(t, err)
			assert.True(t, user.IsOnboarded)
			assert.Equal(t, tc.wantFields, user.FieldKeys())
			assert.Nil(t, user.Major)
		})
	}
}

func TestStartGoogleLogin(t *testing.T) {
	env := newTestEnv()

	start, err := env.uc.StartGoogleLogin("//evil.example")
	require.NoError(t, err)
	assert.NotEmpty(t, start.State)
	assert.NotEmpty(t, start.CodeVerifier)
	assert.NotEqual(t, start.State, start.CodeVerifier)
	assert.Contains(t, start.AuthURL, "state="+start.State)
	assert.Empty(t, start.Next, "unsafe next is dropped")

	start, err = env.uc.StartGoogleLogin("/cases/flash-sale")
	require.NoError(t, err)
	assert.Equal(t, "/cases/flash-sale", start.Next)
}

func TestGoogleLogin_Disabled(t *testing.T) {
	uc := InitAuthUseCase(Deps{Users: newFakeUserRepo(), RefreshTokens: newFakeRefreshTokenRepo()})

	_, err := uc.StartGoogleLogin("")
	requireAppError(t, err, apperror.KindBadRequest)
	_, err = uc.CompleteGoogleLogin(context.Background(), GoogleCallbackInput{}, testMeta)
	requireAppError(t, err, apperror.KindBadRequest)
}

func TestCompleteGoogleLogin(t *testing.T) {
	validInput := GoogleCallbackInput{Code: "valid-code", State: "state-1", ExpectedState: "state-1", CodeVerifier: "verifier-1"}
	identity := coreRepo.GoogleIdentity{Subject: "sub-1", Email: "Budi@Gmail.com", EmailVerified: true, Name: "Budi Google"}
	linked := entity.User{ID: "u-google", Name: "Budi", Email: "budi@gmail.com", GoogleSub: ptr("sub-1"), Role: entity.RoleReviewer, IsActive: true}
	formUser := passwordUser("u-form", "budi@gmail.com", "rahasia123")
	disabledLinked := linked
	disabledLinked.IsActive = false

	tests := []struct {
		name        string
		users       []entity.User
		in          GoogleCallbackInput
		identity    coreRepo.GoogleIdentity
		exchangeErr error
		wantKind    apperror.Kind
		check       func(t *testing.T, env *testEnv, session Session)
	}{
		{
			name: "existing google account", users: []entity.User{linked}, in: validInput, identity: identity,
			check: func(t *testing.T, _ *testEnv, s Session) {
				assert.Equal(t, "u-google", s.User.ID)
				assert.Equal(t, entity.RoleReviewer, s.User.Role)
			},
		},
		{
			name: "links form account with same verified email", users: []entity.User{formUser}, in: validInput, identity: identity,
			check: func(t *testing.T, env *testEnv, s Session) {
				assert.Equal(t, "u-form", s.User.ID)
				assert.Equal(t, "sub-1", *env.users.users["u-form"].GoogleSub)
				assert.True(t, env.users.users["u-form"].HasPassword(), "password login keeps working")
			},
		},
		{
			name: "creates new student", in: validInput, identity: identity,
			check: func(t *testing.T, env *testEnv, s Session) {
				assert.Equal(t, "budi@gmail.com", s.User.Email)
				assert.Equal(t, "Budi Google", s.User.Name)
				assert.Equal(t, entity.RoleStudent, s.User.Role)
				assert.False(t, s.User.HasPassword())
				assert.True(t, s.User.NeedsOnboarding())
				assert.Len(t, env.users.users, 1)
			},
		},
		{
			name: "short google name falls back to email", in: validInput,
			identity: coreRepo.GoogleIdentity{Subject: "sub-2", Email: "rahma@gmail.com", EmailVerified: true, Name: "R"},
			check: func(t *testing.T, _ *testEnv, s Session) {
				assert.Equal(t, "rahma", s.User.Name)
			},
		},
		{name: "unverified email rejected", in: validInput, identity: coreRepo.GoogleIdentity{Subject: "sub-3", Email: "x@gmail.com"}, wantKind: apperror.KindBadRequest},
		{name: "state mismatch", in: GoogleCallbackInput{Code: "valid-code", State: "forged", ExpectedState: "state-1", CodeVerifier: "v"}, identity: identity, wantKind: apperror.KindBadRequest},
		{name: "missing state cookie", in: GoogleCallbackInput{Code: "valid-code", State: "state-1", CodeVerifier: "v"}, identity: identity, wantKind: apperror.KindBadRequest},
		{name: "user cancelled at google", in: GoogleCallbackInput{ProviderError: "access_denied", ExpectedState: "s", State: "s"}, wantKind: apperror.KindBadRequest},
		{name: "code exchange failed", in: validInput, exchangeErr: errors.New("invalid_grant"), wantKind: apperror.KindBadRequest},
		{name: "disabled account", users: []entity.User{disabledLinked}, in: validInput, identity: identity, wantKind: apperror.KindForbidden},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newTestEnv(tc.users...)
			env.google.identity = tc.identity
			env.google.err = tc.exchangeErr

			session, err := env.uc.CompleteGoogleLogin(context.Background(), tc.in, testMeta)

			if tc.wantKind != "" {
				requireAppError(t, err, tc.wantKind)
				assert.Empty(t, env.tokens.active())
				return
			}
			require.NoError(t, err)
			assert.NotEmpty(t, session.RefreshToken)
			tc.check(t, env, session)
		})
	}
}

func ptr[T any](v T) *T {
	return &v
}
