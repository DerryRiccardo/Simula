// Package auth berisi use case autentikasi untuk semua peran: daftar, masuk (password dan Google),
// sesi (access + refresh token), dan onboarding.
package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
)

const (
	msgInvalidCredentials = "Email atau kata sandi salah."
	msgAccountDisabled    = "Akun kamu dinonaktifkan. Hubungi tim Simula untuk bantuan."
	msgEmailTaken         = "Email sudah terdaftar."
	msgEmailTakenField    = "Email ini sudah terdaftar. Silakan masuk."

	maxUserAgentLength = 255
	maxIPLength        = 64
	// dummyPassword di-hash sekali agar login dengan email yang tidak terdaftar tetap menjalankan
	// bcrypt, sehingga waktu respons tidak membocorkan email mana yang terdaftar.
	dummyPassword = "simula-dummy-password-1"
)

// SessionMeta adalah info perangkat yang disimpan bersama refresh token.
type SessionMeta struct {
	IP        string
	UserAgent string
}

// Session adalah hasil login: user dan pasangan token yang dipasang handler sebagai cookie.
type Session struct {
	User             entity.User
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

// RegisterInput adalah isian form daftar.
type RegisterInput struct {
	Name     string
	Email    string
	Password string
}

// LoginInput adalah isian form masuk.
type LoginInput struct {
	Email    string
	Password string
}

// AuthUseCase mengatur akun dan sesi.
type AuthUseCase interface {
	Register(ctx context.Context, in RegisterInput, meta SessionMeta) (Session, error)
	Login(ctx context.Context, in LoginInput, meta SessionMeta) (Session, error)
	// Refresh merotasi refresh token dan menerbitkan access token baru.
	Refresh(ctx context.Context, refreshToken string, meta SessionMeta) (Session, error)
	// Logout mencabut sesi perangkat ini. Selalu berhasil walau token tidak dikenal.
	Logout(ctx context.Context, refreshToken string) error
	// Authenticate memverifikasi access token dan memuat peran terbaru dari database.
	Authenticate(ctx context.Context, accessToken string) (authctx.User, error)
	Me(ctx context.Context) (entity.User, error)
	CompleteOnboarding(ctx context.Context, in OnboardingInput) (entity.User, error)
	StartGoogleLogin(next string) (GoogleLoginStart, error)
	CompleteGoogleLogin(ctx context.Context, in GoogleCallbackInput, meta SessionMeta) (Session, error)
	// CleanupExpiredSessions menghapus refresh token yang sudah lama kedaluwarsa (task periodik).
	CleanupExpiredSessions(ctx context.Context) (int64, error)
}

// ExpiredSessionRetention menyimpan refresh token kedaluwarsa sebentar untuk keperluan audit.
const ExpiredSessionRetention = 7 * 24 * time.Hour

// Deps adalah dependency use case auth. Google boleh nil bila login Google nonaktif.
type Deps struct {
	Users           coreRepo.UserRepository
	Fields          coreRepo.FieldRepository
	RefreshTokens   coreRepo.RefreshTokenRepository
	RateLimiter     coreRepo.RateLimiter
	Hasher          coreRepo.PasswordHasher
	AccessTokens    coreRepo.AccessTokenIssuer
	Google          coreRepo.GoogleOAuth
	RefreshTokenTTL time.Duration
	Now             func() time.Time
}

type authUseCase struct {
	Deps
	dummyHashOnce sync.Once
	dummyHash     string
}

// InitAuthUseCase membuat use case auth. Now default ke waktu sistem UTC.
func InitAuthUseCase(deps Deps) AuthUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &authUseCase{Deps: deps}
}

func (uc *authUseCase) Register(ctx context.Context, in RegisterInput, meta SessionMeta) (Session, error) {
	name := strings.TrimSpace(in.Name)
	email := entity.NormalizeEmail(in.Email)
	if fields := validateRegister(name, email, in.Password); len(fields) > 0 {
		return Session{}, apperror.Validation(fields...)
	}
	if err := uc.checkRateLimit(ctx, entity.RegisterRateLimitKey(meta.IP), entity.RegisterRateLimit); err != nil {
		return Session{}, err
	}

	if _, err := uc.Users.GetByEmail(ctx, email); err == nil {
		return Session{}, emailTakenError()
	} else if !errors.Is(err, coreErrors.ErrUserNotFound) {
		return Session{}, apperror.Internal(fmt.Errorf("failed to check email: %w", err))
	}

	hash, err := uc.Hasher.Hash(in.Password)
	if err != nil {
		return Session{}, apperror.Internal(err)
	}
	now := uc.Now()
	user := entity.User{
		ID:           uuid.NewString(),
		Name:         name,
		Email:        email,
		PasswordHash: &hash,
		Role:         entity.RoleStudent,
		IsActive:     true,
		ShareDefault: entity.ShareDefaultAsk,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := uc.Users.Create(ctx, &user); err != nil {
		if errors.Is(err, coreErrors.ErrEmailTaken) {
			return Session{}, emailTakenError()
		}
		return Session{}, apperror.Internal(fmt.Errorf("failed to register user: %w", err))
	}
	return uc.startSession(ctx, user, meta)
}

func (uc *authUseCase) Login(ctx context.Context, in LoginInput, meta SessionMeta) (Session, error) {
	email := entity.NormalizeEmail(in.Email)
	var fields []apperror.FieldError
	if msg := entity.ValidateEmail(email); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "email", Message: msg})
	}
	if in.Password == "" {
		fields = append(fields, apperror.FieldError{Field: "password", Message: "Kata sandi wajib diisi"})
	}
	if len(fields) > 0 {
		return Session{}, apperror.Validation(fields...)
	}
	if err := uc.checkRateLimit(ctx, entity.LoginRateLimitKey(email, meta.IP), entity.LoginRateLimit); err != nil {
		return Session{}, err
	}

	user, err := uc.Users.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, coreErrors.ErrUserNotFound) {
		return Session{}, apperror.Internal(fmt.Errorf("failed to get user: %w", err))
	}
	if err != nil || !user.HasPassword() {
		uc.Hasher.Compare(uc.getDummyHash(), in.Password)
		return Session{}, apperror.Unauthenticated(msgInvalidCredentials)
	}
	if !uc.Hasher.Compare(*user.PasswordHash, in.Password) {
		return Session{}, apperror.Unauthenticated(msgInvalidCredentials)
	}
	if !user.IsActive {
		return Session{}, apperror.Forbidden(msgAccountDisabled)
	}
	return uc.startSession(ctx, user, meta)
}

func (uc *authUseCase) Refresh(ctx context.Context, refreshToken string, meta SessionMeta) (Session, error) {
	if refreshToken == "" {
		return Session{}, apperror.Unauthenticated("")
	}
	if err := uc.checkRateLimit(ctx, entity.RefreshRateLimitKey(meta.IP), entity.RefreshRateLimit); err != nil {
		return Session{}, err
	}

	current, err := uc.RefreshTokens.GetByHash(ctx, secure.HashToken(refreshToken))
	if errors.Is(err, coreErrors.ErrRefreshTokenNotFound) {
		return Session{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return Session{}, apperror.Internal(fmt.Errorf("failed to get refresh token: %w", err))
	}

	now := uc.Now()
	state := current.StateAt(now)
	switch state {
	case entity.RefreshTokenExpired:
		return Session{}, apperror.Unauthenticated("")
	case entity.RefreshTokenReused:
		log.Warn().Str("user_id", current.UserID).Str("family_id", current.FamilyID).
			Msg("revoked refresh token reused, revoking session family")
		if err := uc.RefreshTokens.RevokeFamily(ctx, current.FamilyID, now); err != nil {
			return Session{}, apperror.Internal(err)
		}
		return Session{}, apperror.Unauthenticated("")
	}

	user, err := uc.Users.GetByID(ctx, current.UserID)
	if errors.Is(err, coreErrors.ErrUserNotFound) || (err == nil && !user.IsActive) {
		if revokeErr := uc.RefreshTokens.RevokeFamily(ctx, current.FamilyID, now); revokeErr != nil {
			return Session{}, apperror.Internal(revokeErr)
		}
		return Session{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return Session{}, apperror.Internal(fmt.Errorf("failed to get user: %w", err))
	}

	next, raw, err := uc.newRefreshToken(user.ID, current.FamilyID, meta, now)
	if err != nil {
		return Session{}, apperror.Internal(err)
	}
	if state == entity.RefreshTokenValid {
		err = uc.RefreshTokens.Rotate(ctx, current.ID, &next, now)
	}
	// Token yang baru saja dirotasi tab lain (atau kalah balapan rotasi) mendapat token baru di
	// family yang sama, tanpa dianggap pencurian.
	if state == entity.RefreshTokenRecentlyRotated || errors.Is(err, coreErrors.ErrRefreshTokenRotated) {
		err = uc.RefreshTokens.Create(ctx, &next)
	}
	if err != nil {
		return Session{}, apperror.Internal(fmt.Errorf("failed to rotate refresh token: %w", err))
	}
	return uc.buildSession(user, raw, next.ExpiresAt, now)
}

func (uc *authUseCase) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	token, err := uc.RefreshTokens.GetByHash(ctx, secure.HashToken(refreshToken))
	if errors.Is(err, coreErrors.ErrRefreshTokenNotFound) {
		return nil
	}
	if err != nil {
		return apperror.Internal(fmt.Errorf("failed to get refresh token: %w", err))
	}
	if err := uc.RefreshTokens.RevokeFamily(ctx, token.FamilyID, uc.Now()); err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (uc *authUseCase) Authenticate(ctx context.Context, accessToken string) (authctx.User, error) {
	if accessToken == "" {
		return authctx.User{}, apperror.Unauthenticated("")
	}
	claims, err := uc.AccessTokens.Parse(accessToken, uc.Now())
	if err != nil {
		return authctx.User{}, apperror.Unauthenticated("")
	}
	user, err := uc.Users.GetByID(ctx, claims.UserID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return authctx.User{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return authctx.User{}, apperror.Internal(fmt.Errorf("failed to get user: %w", err))
	}
	if !user.IsActive {
		return authctx.User{}, apperror.Unauthenticated("")
	}
	return authctx.User{ID: user.ID, Role: string(user.Role)}, nil
}

func (uc *authUseCase) Me(ctx context.Context) (entity.User, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.User{}, apperror.Unauthenticated("")
	}
	user, err := uc.Users.GetByID(ctx, current.ID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.User{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to get user: %w", err))
	}
	return user, nil
}

func (uc *authUseCase) CleanupExpiredSessions(ctx context.Context) (int64, error) {
	deleted, err := uc.RefreshTokens.DeleteExpiredBefore(ctx, uc.Now().Add(-ExpiredSessionRetention))
	if err != nil {
		return 0, fmt.Errorf("failed to clean up expired sessions: %w", err)
	}
	return deleted, nil
}

// startSession membuka sesi baru (family refresh token baru) untuk login dan daftar.
func (uc *authUseCase) startSession(ctx context.Context, user entity.User, meta SessionMeta) (Session, error) {
	now := uc.Now()
	token, raw, err := uc.newRefreshToken(user.ID, uuid.NewString(), meta, now)
	if err != nil {
		return Session{}, apperror.Internal(err)
	}
	if err := uc.RefreshTokens.Create(ctx, &token); err != nil {
		return Session{}, apperror.Internal(fmt.Errorf("failed to save refresh token: %w", err))
	}
	return uc.buildSession(user, raw, token.ExpiresAt, now)
}

func (uc *authUseCase) buildSession(user entity.User, rawRefresh string, refreshExpiresAt, now time.Time) (Session, error) {
	access, accessExpiresAt, err := uc.AccessTokens.Issue(user.ID, user.Role, now)
	if err != nil {
		return Session{}, apperror.Internal(err)
	}
	return Session{
		User:             user,
		AccessToken:      access,
		AccessExpiresAt:  accessExpiresAt,
		RefreshToken:     rawRefresh,
		RefreshExpiresAt: refreshExpiresAt,
	}, nil
}

func (uc *authUseCase) newRefreshToken(userID, familyID string, meta SessionMeta, now time.Time) (entity.RefreshToken, string, error) {
	raw, err := secure.RandomToken()
	if err != nil {
		return entity.RefreshToken{}, "", err
	}
	return entity.RefreshToken{
		ID:        uuid.NewString(),
		UserID:    userID,
		FamilyID:  familyID,
		TokenHash: secure.HashToken(raw),
		ExpiresAt: now.Add(uc.RefreshTokenTTL),
		UserAgent: truncate(meta.UserAgent, maxUserAgentLength),
		IPAddress: truncate(meta.IP, maxIPLength),
		CreatedAt: now,
	}, raw, nil
}

// checkRateLimit gagal terbuka: bila Redis bermasalah, request tetap dilayani dan dicatat, agar
// login tidak ikut mati karena gangguan cache.
func (uc *authUseCase) checkRateLimit(ctx context.Context, key string, limit entity.RateLimit) error {
	allowed, err := uc.RateLimiter.Allow(ctx, key, limit)
	if err != nil {
		log.Warn().Err(err).Msg("rate limiter unavailable, allowing request")
		return nil
	}
	if !allowed {
		return apperror.TooManyRequests()
	}
	return nil
}

func (uc *authUseCase) getDummyHash() string {
	uc.dummyHashOnce.Do(func() {
		hash, err := uc.Hasher.Hash(dummyPassword)
		if err != nil {
			log.Error().Err(err).Msg("failed to prepare dummy password hash")
			return
		}
		uc.dummyHash = hash
	})
	return uc.dummyHash
}

func validateRegister(name, email, password string) []apperror.FieldError {
	var fields []apperror.FieldError
	if msg := entity.ValidateName(name); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "name", Message: msg})
	}
	if msg := entity.ValidateEmail(email); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "email", Message: msg})
	}
	if msg := entity.ValidatePassword(password); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "password", Message: msg})
	}
	return fields
}

func emailTakenError() *apperror.Error {
	return apperror.Conflict(msgEmailTaken).WithFields(apperror.FieldError{Field: "email", Message: msgEmailTakenField})
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	// Potongan byte bisa membelah karakter UTF-8; PostgreSQL menolak teks UTF-8 yang tidak valid.
	return strings.ToValidUTF8(s[:max], "")
}
