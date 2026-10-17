package entity

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestValidateName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "valid", input: "Budi", want: ""},
		{name: "empty", input: "", want: "Nama wajib diisi"},
		{name: "too short", input: "Bu", want: "Nama minimal 3 karakter"},
		{name: "multibyte counted as runes", input: "Éva", want: ""},
		{name: "too long", input: strings.Repeat("a", 81), want: "Nama maksimal 80 karakter"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, ValidateName(tc.input))
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "valid", input: "budi@kampus.ac.id", want: ""},
		{name: "empty", input: "", want: "Email wajib diisi"},
		{name: "no at", input: "budi.kampus.ac.id", want: "Format email tidak valid"},
		{name: "no dot in domain", input: "budi@localhost", want: "Format email tidak valid"},
		{name: "display name form rejected", input: "Budi <budi@x.com>", want: "Format email tidak valid"},
		{name: "too long", input: strings.Repeat("a", 250) + "@x.com", want: "Email terlalu panjang"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, ValidateEmail(tc.input))
		})
	}
}

func TestNormalizeEmail(t *testing.T) {
	assert.Equal(t, "budi@x.com", NormalizeEmail("  Budi@X.com "))
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "valid", input: "rahasia123", want: ""},
		{name: "too short", input: "abc12", want: "Kata sandi minimal 8 karakter"},
		{name: "no digit", input: "rahasiasekali", want: "Kata sandi harus mengandung angka"},
		{name: "no letter", input: "12345678", want: "Kata sandi harus mengandung huruf"},
		{name: "over bcrypt limit", input: strings.Repeat("a1", 37), want: "Kata sandi maksimal 72 karakter"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, ValidatePassword(tc.input))
		})
	}
}

func TestSafeNextPath(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "internal path", input: "/cases/flash-sale", want: "/cases/flash-sale"},
		{name: "internal path with query", input: "/cases?tier=b2b", want: "/cases?tier=b2b"},
		{name: "empty", input: "", want: ""},
		{name: "absolute url", input: "https://evil.example", want: ""},
		{name: "protocol relative", input: "//evil.example", want: ""},
		{name: "backslash trick", input: "/\\evil.example", want: ""},
		{name: "relative path", input: "cases", want: ""},
		{name: "login loop", input: "/login?next=/x", want: ""},
		{name: "onboarding loop", input: "/onboarding", want: ""},
		{name: "too long", input: "/" + strings.Repeat("a", 600), want: ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, SafeNextPath(tc.input))
		})
	}
}

func TestPostAuthPath(t *testing.T) {
	tests := []struct {
		name string
		user User
		next string
		want string
	}{
		{name: "new student goes to onboarding", user: User{Role: RoleStudent}, want: "/onboarding"},
		{name: "new student keeps next", user: User{Role: RoleStudent}, next: "/cases/x", want: "/onboarding?next=%2Fcases%2Fx"},
		{name: "onboarded student goes to next", user: User{Role: RoleStudent, IsOnboarded: true}, next: "/cases/x", want: "/cases/x"},
		{name: "onboarded student default", user: User{Role: RoleStudent, IsOnboarded: true}, want: "/dashboard"},
		{name: "reviewer home", user: User{Role: RoleReviewer}, want: "/reviewer"},
		{name: "admin home", user: User{Role: RoleAdmin}, want: "/admin/cases"},
		{name: "unsafe next ignored", user: User{Role: RoleAdmin}, next: "//evil", want: "/admin/cases"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, PostAuthPath(&tc.user, tc.next))
		})
	}
}

func TestUser_FieldKeysSortedByPosition(t *testing.T) {
	user := User{Fields: []UserField{{FieldKey: "data", Position: 2}, {FieldKey: "backend", Position: 1}}}

	assert.Equal(t, []string{"backend", "data"}, user.FieldKeys())
	assert.Equal(t, "data", user.Fields[0].FieldKey, "original slice must not be reordered")
}

func TestRefreshToken_StateAt(t *testing.T) {
	now := time.Date(2026, 10, 17, 10, 0, 0, 0, time.UTC)
	replacement := "new-token-id"
	at := func(d time.Duration) *time.Time {
		v := now.Add(d)
		return &v
	}

	tests := []struct {
		name  string
		token RefreshToken
		want  RefreshTokenState
	}{
		{name: "valid", token: RefreshToken{ExpiresAt: now.Add(time.Hour)}, want: RefreshTokenValid},
		{name: "expired", token: RefreshToken{ExpiresAt: now}, want: RefreshTokenExpired},
		{name: "rotated moments ago", token: RefreshToken{ExpiresAt: now.Add(time.Hour), RevokedAt: at(-10 * time.Second), ReplacedByID: &replacement}, want: RefreshTokenRecentlyRotated},
		{name: "rotated long ago", token: RefreshToken{ExpiresAt: now.Add(time.Hour), RevokedAt: at(-time.Minute), ReplacedByID: &replacement}, want: RefreshTokenReused},
		{name: "revoked by logout", token: RefreshToken{ExpiresAt: now.Add(time.Hour), RevokedAt: at(-time.Second)}, want: RefreshTokenReused},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, tc.token.StateAt(now))
		})
	}
}
