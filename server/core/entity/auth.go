package entity

import (
	"net/mail"
	"net/url"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// Batas input auth. Sama dengan validasi form di client (app/(auth)/_schemas.ts dan onboarding).
const (
	NameMinLength       = 3
	NameMaxLength       = 80
	EmailMaxLength      = 254
	PasswordMinLength   = 8
	PasswordMaxBytes    = 72 // batas bcrypt; sisanya diabaikan diam-diam bila tidak dibatasi
	MaxOnboardingFields = 3
	MajorMaxLength      = 100
	NextPathMaxLength   = 512
)

// RateLimit adalah batas jumlah percobaan dalam satu jendela waktu.
type RateLimit struct {
	Limit  int
	Window time.Duration
}

// Batas percobaan auth per kunci (lihat fungsi *RateLimitKey).
var (
	LoginRateLimit    = RateLimit{Limit: 5, Window: 15 * time.Minute}
	RegisterRateLimit = RateLimit{Limit: 10, Window: time.Hour}
	RefreshRateLimit  = RateLimit{Limit: 30, Window: time.Minute}
)

// LoginRateLimitKey membatasi percobaan login per kombinasi email dan IP.
func LoginRateLimitKey(email, ip string) string {
	return "ratelimit:login:" + email + ":" + ip
}

// RegisterRateLimitKey membatasi pendaftaran per IP.
func RegisterRateLimitKey(ip string) string {
	return "ratelimit:register:" + ip
}

// RefreshRateLimitKey membatasi refresh sesi per IP.
func RefreshRateLimitKey(ip string) string {
	return "ratelimit:refresh:" + ip
}

// NormalizeEmail membuang spasi dan menjadikan huruf kecil, agar satu alamat = satu akun.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// ValidateName mengembalikan pesan error untuk user, atau "" bila valid. Nama sudah di-trim.
func ValidateName(name string) string {
	length := utf8.RuneCountInString(name)
	switch {
	case length == 0:
		return "Nama wajib diisi"
	case length < NameMinLength:
		return "Nama minimal 3 karakter"
	case length > NameMaxLength:
		return "Nama maksimal 80 karakter"
	default:
		return ""
	}
}

// ValidateEmail mengembalikan pesan error untuk user, atau "" bila valid. Email sudah dinormalisasi.
func ValidateEmail(email string) string {
	if email == "" {
		return "Email wajib diisi"
	}
	if len(email) > EmailMaxLength {
		return "Email terlalu panjang"
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || !strings.Contains(email[strings.LastIndex(email, "@")+1:], ".") {
		return "Format email tidak valid"
	}
	return ""
}

// ValidatePassword mengembalikan pesan error untuk user, atau "" bila valid.
func ValidatePassword(password string) string {
	if len(password) < PasswordMinLength {
		return "Kata sandi minimal 8 karakter"
	}
	if len(password) > PasswordMaxBytes {
		return "Kata sandi maksimal 72 karakter"
	}
	var hasLetter, hasDigit bool
	for _, r := range password {
		hasLetter = hasLetter || unicode.IsLetter(r)
		hasDigit = hasDigit || unicode.IsDigit(r)
	}
	if !hasLetter {
		return "Kata sandi harus mengandung huruf"
	}
	if !hasDigit {
		return "Kata sandi harus mengandung angka"
	}
	return ""
}

// Halaman client yang dipakai untuk redirect setelah login.
const (
	PathLogin      = "/login"
	PathRegister   = "/register"
	PathOnboarding = "/onboarding"
	PathDashboard  = "/dashboard"
	PathReviewer   = "/reviewer"
	PathAdmin      = "/admin/cases"
)

// HomePath adalah beranda tiap peran setelah login.
func HomePath(role Role) string {
	switch role {
	case RoleReviewer:
		return PathReviewer
	case RoleAdmin:
		return PathAdmin
	default:
		return PathDashboard
	}
}

// SafeNextPath mengembalikan next bila berupa path internal yang aman, atau "" bila tidak. Mencegah
// open redirect (URL eksternal, "//host", backslash) dan putaran ke halaman alur masuk.
func SafeNextPath(next string) string {
	if next == "" || len(next) > NextPathMaxLength {
		return ""
	}
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") || strings.ContainsAny(next, "\\\r\n\t") {
		return ""
	}
	path, _, _ := strings.Cut(next, "?")
	switch path {
	case PathLogin, PathRegister, PathOnboarding:
		return ""
	}
	return next
}

// PostAuthPath adalah tujuan setelah login: onboarding dulu bila belum, lalu next atau beranda
// peran. Sama dengan getPostAuthPath di client.
func PostAuthPath(user *User, next string) string {
	safeNext := SafeNextPath(next)
	if user.NeedsOnboarding() {
		if safeNext == "" {
			return PathOnboarding
		}
		return PathOnboarding + "?next=" + url.QueryEscape(safeNext)
	}
	if safeNext != "" {
		return safeNext
	}
	return HomePath(user.Role)
}
