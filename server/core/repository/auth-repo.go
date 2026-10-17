package repository

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// UserRepository menyimpan akun. Get* mengembalikan coreErrors.ErrUserNotFound bila tidak ada,
// dengan bidang pilihan (Fields) sudah dimuat.
type UserRepository interface {
	// Create mengembalikan coreErrors.ErrEmailTaken bila email sudah dipakai.
	Create(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id string) (entity.User, error)
	GetByEmail(ctx context.Context, email string) (entity.User, error)
	GetByGoogleSub(ctx context.Context, sub string) (entity.User, error)
	LinkGoogle(ctx context.Context, userID, sub string) error
	// CompleteOnboarding mengganti bidang pilihan dan menandai user selesai onboarding secara atomik.
	CompleteOnboarding(ctx context.Context, userID string, fieldKeys []string, status entity.StudentStatus, major *string) error
}

// FieldRepository membaca taksonomi bidang.
type FieldRepository interface {
	// ExistingKeys mengembalikan key yang terdaftar dari keys.
	ExistingKeys(ctx context.Context, keys []string) ([]string, error)
}

// RefreshTokenRepository menyimpan refresh token (hanya hash-nya).
type RefreshTokenRepository interface {
	Create(ctx context.Context, token *entity.RefreshToken) error
	// GetByHash mengembalikan coreErrors.ErrRefreshTokenNotFound bila tidak ada.
	GetByHash(ctx context.Context, hash string) (entity.RefreshToken, error)
	// Rotate menyimpan next dan mencabut token oldID secara atomik. Mengembalikan
	// coreErrors.ErrRefreshTokenRotated bila oldID sudah dicabut lebih dulu (request bersamaan).
	Rotate(ctx context.Context, oldID string, next *entity.RefreshToken, now time.Time) error
	RevokeFamily(ctx context.Context, familyID string, now time.Time) error
	DeleteExpiredBefore(ctx context.Context, before time.Time) (int64, error)
}

// RateLimiter menghitung percobaan per kunci dalam jendela waktu.
type RateLimiter interface {
	// Allow mencatat satu percobaan dan mengembalikan false bila batas sudah terlampaui.
	Allow(ctx context.Context, key string, limit entity.RateLimit) (bool, error)
}

// PasswordHasher membuat dan memeriksa hash password.
type PasswordHasher interface {
	Hash(password string) (string, error)
	// Compare bernilai true bila password cocok dengan hash.
	Compare(hash, password string) bool
}

// AccessClaims adalah isi access token yang sudah diverifikasi.
type AccessClaims struct {
	UserID string
	Role   entity.Role
}

// AccessTokenIssuer menerbitkan dan memverifikasi access token.
type AccessTokenIssuer interface {
	Issue(userID string, role entity.Role, now time.Time) (token string, expiresAt time.Time, err error)
	// Parse mengembalikan coreErrors.ErrInvalidAccessToken bila token rusak, palsu, atau kedaluwarsa.
	Parse(token string, now time.Time) (AccessClaims, error)
}

// GoogleIdentity adalah identitas user yang sudah diverifikasi dari ID token Google.
type GoogleIdentity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
}

// GoogleOAuth menjalankan alur OAuth Authorization Code + PKCE ke Google.
type GoogleOAuth interface {
	AuthCodeURL(state, codeVerifier string) string
	// Exchange menukar code dan memverifikasi ID token. Mengembalikan
	// coreErrors.ErrGoogleIdentityInvalid bila code atau token tidak valid.
	Exchange(ctx context.Context, code, codeVerifier string) (GoogleIdentity, error)
}
