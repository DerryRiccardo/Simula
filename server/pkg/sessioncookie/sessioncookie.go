// Package sessioncookie menulis dan membaca cookie sesi (httpOnly) dan cookie state OAuth Google.
package sessioncookie

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Nama dan path cookie. Refresh token hanya dikirim browser ke /api/auth (refresh dan logout),
// sehingga tidak ikut di setiap request API.
const (
	AccessName      = "access_token"
	RefreshName     = "refresh_token"
	GoogleStateName = "google_oauth"

	accessPath      = "/api"
	refreshPath     = "/api/auth"
	googleStatePath = "/api/auth/google"
)

// Config adalah atribut cookie yang bergantung pada lingkungan.
type Config struct {
	Secure bool
	Domain string
}

// GoogleState disimpan di cookie singkat antara redirect ke Google dan callback.
type GoogleState struct {
	State        string `json:"s"`
	CodeVerifier string `json:"v"`
	Next         string `json:"n"`
}

// SetSession memasang access token dan refresh token.
func SetSession(w http.ResponseWriter, cfg Config, access string, accessExpiresAt time.Time, refresh string, refreshExpiresAt time.Time, now time.Time) {
	http.SetCookie(w, cfg.cookie(AccessName, access, accessPath, accessExpiresAt.Sub(now)))
	http.SetCookie(w, cfg.cookie(RefreshName, refresh, refreshPath, refreshExpiresAt.Sub(now)))
}

// ClearSession menghapus kedua cookie sesi.
func ClearSession(w http.ResponseWriter, cfg Config) {
	http.SetCookie(w, cfg.expired(AccessName, accessPath))
	http.SetCookie(w, cfg.expired(RefreshName, refreshPath))
}

// SetGoogleState memasang cookie state OAuth.
func SetGoogleState(w http.ResponseWriter, cfg Config, state GoogleState, ttl time.Duration) error {
	payload, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to encode google state: %w", err)
	}
	http.SetCookie(w, cfg.cookie(GoogleStateName, base64.RawURLEncoding.EncodeToString(payload), googleStatePath, ttl))
	return nil
}

// ReadGoogleState membaca cookie state OAuth. ok bernilai false bila cookie tidak ada atau rusak.
func ReadGoogleState(r *http.Request) (GoogleState, bool) {
	cookie, err := r.Cookie(GoogleStateName)
	if err != nil {
		return GoogleState{}, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(cookie.Value)
	if err != nil {
		return GoogleState{}, false
	}
	var state GoogleState
	if err := json.Unmarshal(payload, &state); err != nil {
		return GoogleState{}, false
	}
	return state, true
}

// ClearGoogleState menghapus cookie state OAuth (sekali pakai).
func ClearGoogleState(w http.ResponseWriter, cfg Config) {
	http.SetCookie(w, cfg.expired(GoogleStateName, googleStatePath))
}

// Value membaca nilai cookie, atau "" bila tidak ada.
func Value(r *http.Request, name string) string {
	cookie, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// cookie memakai SameSite=Lax: dikirim pada navigasi top-level (redirect dari Google) dan request
// same-site (front-end dan API di domain yang sama), tetapi tidak pada request lintas situs.
func (cfg Config) cookie(name, value, path string, maxAge time.Duration) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     path,
		Domain:   cfg.Domain,
		MaxAge:   int(maxAge.Seconds()),
		HttpOnly: true,
		Secure:   cfg.Secure,
		SameSite: http.SameSiteLaxMode,
	}
}

func (cfg Config) expired(name, path string) *http.Cookie {
	cookie := cfg.cookie(name, "", path, 0)
	cookie.MaxAge = -1
	return cookie
}
