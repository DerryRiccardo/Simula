package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// Fake di memori dipakai bersama semua test di package ini. Alur auth bersifat stateful
// (token dibuat, dirotasi, dicabut), jadi fake lebih jelas dibanding mock per panggilan.

type fakeUserRepo struct {
	users map[string]*entity.User
}

func newFakeUserRepo(users ...entity.User) *fakeUserRepo {
	repo := &fakeUserRepo{users: map[string]*entity.User{}}
	for i := range users {
		user := users[i]
		repo.users[user.ID] = &user
	}
	return repo
}

func (r *fakeUserRepo) Create(_ context.Context, user *entity.User) error {
	for _, existing := range r.users {
		if existing.Email == user.Email {
			return coreErrors.ErrEmailTaken
		}
	}
	copied := *user
	r.users[user.ID] = &copied
	return nil
}

func (r *fakeUserRepo) find(match func(*entity.User) bool) (entity.User, error) {
	for _, user := range r.users {
		if match(user) {
			return *user, nil
		}
	}
	return entity.User{}, coreErrors.ErrUserNotFound
}

func (r *fakeUserRepo) GetByID(_ context.Context, id string) (entity.User, error) {
	return r.find(func(u *entity.User) bool { return u.ID == id })
}

func (r *fakeUserRepo) GetByEmail(_ context.Context, email string) (entity.User, error) {
	return r.find(func(u *entity.User) bool { return u.Email == email })
}

func (r *fakeUserRepo) GetByGoogleSub(_ context.Context, sub string) (entity.User, error) {
	return r.find(func(u *entity.User) bool { return u.GoogleSub != nil && *u.GoogleSub == sub })
}

func (r *fakeUserRepo) LinkGoogle(_ context.Context, userID, sub string) error {
	user, ok := r.users[userID]
	if !ok {
		return coreErrors.ErrUserNotFound
	}
	user.GoogleSub = &sub
	return nil
}

func (r *fakeUserRepo) CompleteOnboarding(_ context.Context, userID string, fieldKeys []string, status entity.StudentStatus, major *string) error {
	user, ok := r.users[userID]
	if !ok {
		return coreErrors.ErrUserNotFound
	}
	user.IsOnboarded = true
	user.StudentStatus = &status
	user.Major = major
	user.Fields = nil
	for i, key := range fieldKeys {
		user.Fields = append(user.Fields, entity.UserField{UserID: userID, FieldKey: key, Position: int16(i + 1)})
	}
	return nil
}

type fakeFieldRepo struct {
	keys map[string]bool
}

func (r *fakeFieldRepo) ExistingKeys(_ context.Context, keys []string) ([]string, error) {
	existing := make([]string, 0, len(keys))
	for _, key := range keys {
		if r.keys[key] {
			existing = append(existing, key)
		}
	}
	return existing, nil
}

type fakeRefreshTokenRepo struct {
	tokens map[string]*entity.RefreshToken
}

func newFakeRefreshTokenRepo() *fakeRefreshTokenRepo {
	return &fakeRefreshTokenRepo{tokens: map[string]*entity.RefreshToken{}}
}

func (r *fakeRefreshTokenRepo) Create(_ context.Context, token *entity.RefreshToken) error {
	copied := *token
	r.tokens[token.ID] = &copied
	return nil
}

func (r *fakeRefreshTokenRepo) GetByHash(_ context.Context, hash string) (entity.RefreshToken, error) {
	for _, token := range r.tokens {
		if token.TokenHash == hash {
			return *token, nil
		}
	}
	return entity.RefreshToken{}, coreErrors.ErrRefreshTokenNotFound
}

func (r *fakeRefreshTokenRepo) Rotate(ctx context.Context, oldID string, next *entity.RefreshToken, now time.Time) error {
	old, ok := r.tokens[oldID]
	if !ok || old.RevokedAt != nil {
		return coreErrors.ErrRefreshTokenRotated
	}
	if err := r.Create(ctx, next); err != nil {
		return err
	}
	old.RevokedAt = &now
	old.ReplacedByID = &next.ID
	return nil
}

func (r *fakeRefreshTokenRepo) RevokeFamily(_ context.Context, familyID string, now time.Time) error {
	for _, token := range r.tokens {
		if token.FamilyID == familyID && token.RevokedAt == nil {
			revokedAt := now
			token.RevokedAt = &revokedAt
		}
	}
	return nil
}

func (r *fakeRefreshTokenRepo) DeleteExpiredBefore(_ context.Context, before time.Time) (int64, error) {
	var deleted int64
	for id, token := range r.tokens {
		if token.ExpiresAt.Before(before) {
			delete(r.tokens, id)
			deleted++
		}
	}
	return deleted, nil
}

func (r *fakeRefreshTokenRepo) active() []entity.RefreshToken {
	var active []entity.RefreshToken
	for _, token := range r.tokens {
		if token.RevokedAt == nil {
			active = append(active, *token)
		}
	}
	return active
}

type fakeRateLimiter struct {
	blocked map[string]bool
	err     error
	keys    []string
}

func (l *fakeRateLimiter) Allow(_ context.Context, key string, _ entity.RateLimit) (bool, error) {
	l.keys = append(l.keys, key)
	if l.err != nil {
		return false, l.err
	}
	return !l.blocked[key], nil
}

// fakeHasher membuat hash "hashed:<password>" agar test cepat dan bisa dibaca.
type fakeHasher struct {
	compareCalls int
}

func (h *fakeHasher) Hash(password string) (string, error) {
	return "hashed:" + password, nil
}

func (h *fakeHasher) Compare(hash, password string) bool {
	h.compareCalls++
	return hash == "hashed:"+password
}

// fakeIssuer membuat token "access:<userID>:<role>".
type fakeIssuer struct{}

func (fakeIssuer) Issue(userID string, role entity.Role, now time.Time) (string, time.Time, error) {
	return "access:" + userID + ":" + string(role), now.Add(30 * time.Minute), nil
}

func (fakeIssuer) Parse(token string, _ time.Time) (coreRepo.AccessClaims, error) {
	parts := strings.Split(token, ":")
	if len(parts) != 3 || parts[0] != "access" {
		return coreRepo.AccessClaims{}, coreErrors.ErrInvalidAccessToken
	}
	return coreRepo.AccessClaims{UserID: parts[1], Role: entity.Role(parts[2])}, nil
}

type fakeGoogle struct {
	identity coreRepo.GoogleIdentity
	err      error
}

func (g *fakeGoogle) AuthCodeURL(state, codeVerifier string) string {
	return "https://accounts.google.test/auth?state=" + state + "&verifier=" + codeVerifier
}

func (g *fakeGoogle) Exchange(_ context.Context, code, _ string) (coreRepo.GoogleIdentity, error) {
	if g.err != nil {
		return coreRepo.GoogleIdentity{}, g.err
	}
	if code != "valid-code" {
		return coreRepo.GoogleIdentity{}, errors.New("invalid code")
	}
	return g.identity, nil
}
