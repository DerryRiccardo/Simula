// Package secure membuat token acak dan hash satu arah untuk token yang disimpan di database.
package secure

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// TokenBytes adalah panjang entropi token acak (256 bit).
const TokenBytes = 32

// RandomToken membuat token acak URL-safe (43 karakter untuk 32 byte).
func RandomToken() (string, error) {
	buf := make([]byte, TokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to read random bytes: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// HashToken menghasilkan SHA-256 heksadesimal. Token acak 256 bit tidak perlu salt atau bcrypt.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Equal membandingkan dua secret dalam waktu konstan.
func Equal(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
