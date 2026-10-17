package entity

import "time"

// RefreshTokenReuseInterval memberi toleransi bagi beberapa tab yang me-refresh bersamaan: token
// yang baru saja dirotasi masih diterima sebentar tanpa dianggap pencurian.
const RefreshTokenReuseInterval = 30 * time.Second

// RefreshToken adalah satu refresh token. Hanya hash-nya yang disimpan.
type RefreshToken struct {
	ID           string
	UserID       string
	FamilyID     string
	TokenHash    string
	ExpiresAt    time.Time
	RevokedAt    *time.Time
	ReplacedByID *string
	UserAgent    string
	IPAddress    string
	CreatedAt    time.Time
}

// RefreshTokenState adalah hasil pemeriksaan refresh token pada suatu waktu.
type RefreshTokenState int

const (
	// RefreshTokenValid boleh dirotasi.
	RefreshTokenValid RefreshTokenState = iota
	// RefreshTokenExpired ditolak tanpa mencabut sesi lain.
	RefreshTokenExpired
	// RefreshTokenRecentlyRotated baru saja dirotasi (tab lain me-refresh bersamaan); boleh
	// menerbitkan token baru di family yang sama.
	RefreshTokenRecentlyRotated
	// RefreshTokenReused dipakai ulang setelah dicabut: indikasi pencurian, seluruh family dicabut.
	RefreshTokenReused
)

// StateAt menentukan status token pada waktu now.
func (t *RefreshToken) StateAt(now time.Time) RefreshTokenState {
	if t.RevokedAt != nil {
		if t.ReplacedByID != nil && now.Sub(*t.RevokedAt) <= RefreshTokenReuseInterval {
			return RefreshTokenRecentlyRotated
		}
		return RefreshTokenReused
	}
	if !now.Before(t.ExpiresAt) {
		return RefreshTokenExpired
	}
	return RefreshTokenValid
}
