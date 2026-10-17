package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
)

const (
	msgGoogleDisabled  = "Login Google belum tersedia."
	msgGoogleFailed    = "Login Google gagal. Silakan coba lagi."
	msgGoogleCancelled = "Login Google dibatalkan."
	fallbackGoogleName = "Pengguna Simula"
)

// GoogleStateTTL adalah masa berlaku cookie state OAuth.
const GoogleStateTTL = 10 * time.Minute

// GoogleLoginStart berisi URL tujuan dan data yang harus disimpan handler di cookie singkat sampai
// Google memanggil callback.
type GoogleLoginStart struct {
	AuthURL      string
	State        string
	CodeVerifier string
	Next         string
}

// GoogleCallbackInput adalah query callback Google dan data dari cookie GoogleLoginStart.
type GoogleCallbackInput struct {
	Code          string
	State         string
	ProviderError string
	ExpectedState string
	CodeVerifier  string
}

func (uc *authUseCase) StartGoogleLogin(next string) (GoogleLoginStart, error) {
	if uc.Google == nil {
		return GoogleLoginStart{}, apperror.BadRequest(msgGoogleDisabled)
	}
	state, err := secure.RandomToken()
	if err != nil {
		return GoogleLoginStart{}, apperror.Internal(err)
	}
	verifier, err := secure.RandomToken()
	if err != nil {
		return GoogleLoginStart{}, apperror.Internal(err)
	}
	return GoogleLoginStart{
		AuthURL:      uc.Google.AuthCodeURL(state, verifier),
		State:        state,
		CodeVerifier: verifier,
		Next:         entity.SafeNextPath(next),
	}, nil
}

func (uc *authUseCase) CompleteGoogleLogin(ctx context.Context, in GoogleCallbackInput, meta SessionMeta) (Session, error) {
	if uc.Google == nil {
		return Session{}, apperror.BadRequest(msgGoogleDisabled)
	}
	if in.ProviderError != "" {
		return Session{}, apperror.BadRequest(msgGoogleCancelled)
	}
	if in.ExpectedState == "" || in.CodeVerifier == "" || in.Code == "" || !secure.Equal(in.State, in.ExpectedState) {
		return Session{}, apperror.BadRequest(msgGoogleFailed)
	}

	identity, err := uc.Google.Exchange(ctx, in.Code, in.CodeVerifier)
	if err != nil {
		log.Warn().Err(err).Msg("google code exchange failed")
		return Session{}, apperror.BadRequest(msgGoogleFailed)
	}
	email := entity.NormalizeEmail(identity.Email)
	if !identity.EmailVerified || entity.ValidateEmail(email) != "" {
		return Session{}, apperror.BadRequest(msgGoogleFailed)
	}

	user, err := uc.findOrCreateGoogleUser(ctx, identity, email)
	if err != nil {
		return Session{}, err
	}
	if !user.IsActive {
		return Session{}, apperror.Forbidden(msgAccountDisabled)
	}
	return uc.startSession(ctx, user, meta)
}

// findOrCreateGoogleUser mencocokkan akun lewat google_sub, lalu lewat email terverifikasi
// (menautkan akun yang dibuat dengan form), dan membuat akun mahasiswa baru bila belum ada.
func (uc *authUseCase) findOrCreateGoogleUser(ctx context.Context, identity coreRepo.GoogleIdentity, email string) (entity.User, error) {
	user, err := uc.Users.GetByGoogleSub(ctx, identity.Subject)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to get user by google sub: %w", err))
	}

	user, err = uc.Users.GetByEmail(ctx, email)
	if err == nil {
		return uc.linkGoogle(ctx, user, identity.Subject)
	}
	if !errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to get user by email: %w", err))
	}

	now := uc.Now()
	sub := identity.Subject
	user = entity.User{
		ID:           uuid.NewString(),
		Name:         googleDisplayName(identity.Name, email),
		Email:        email,
		GoogleSub:    &sub,
		Role:         entity.RoleStudent,
		IsActive:     true,
		ShareDefault: entity.ShareDefaultAsk,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	err = uc.Users.Create(ctx, &user)
	if errors.Is(err, coreErrors.ErrEmailTaken) {
		// Akun dengan email yang sama baru saja dibuat request lain; tautkan saja.
		existing, getErr := uc.Users.GetByEmail(ctx, email)
		if getErr != nil {
			return entity.User{}, apperror.Internal(getErr)
		}
		return uc.linkGoogle(ctx, existing, identity.Subject)
	}
	if err != nil {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to create google user: %w", err))
	}
	return user, nil
}

func (uc *authUseCase) linkGoogle(ctx context.Context, user entity.User, sub string) (entity.User, error) {
	if err := uc.Users.LinkGoogle(ctx, user.ID, sub); err != nil {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to link google account: %w", err))
	}
	user.GoogleSub = &sub
	user.UpdatedAt = uc.Now()
	return user, nil
}

// googleDisplayName memakai nama dari Google bila memenuhi aturan nama, lalu bagian depan email,
// lalu nama umum.
func googleDisplayName(name, email string) string {
	name = strings.TrimSpace(name)
	if utf8.RuneCountInString(name) > entity.NameMaxLength {
		name = string([]rune(name)[:entity.NameMaxLength])
	}
	if entity.ValidateName(name) == "" {
		return name
	}
	local, _, _ := strings.Cut(email, "@")
	if entity.ValidateName(local) == "" {
		return local
	}
	return fallbackGoogleName
}
