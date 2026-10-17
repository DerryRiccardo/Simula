package google

import (
	"testing"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"

	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
)

func TestClient_ValidateClaims(t *testing.T) {
	now := time.Date(2026, 10, 17, 10, 0, 0, 0, time.UTC)
	client := NewClient("client-123", "secret", "http://localhost/callback")
	valid := func() idTokenClaims {
		return idTokenClaims{RegisteredClaims: gojwt.RegisteredClaims{
			Issuer:    "https://accounts.google.com",
			Audience:  gojwt.ClaimStrings{"client-123"},
			Subject:   "google-sub-1",
			ExpiresAt: gojwt.NewNumericDate(now.Add(time.Hour)),
		}}
	}

	tests := []struct {
		name    string
		mutate  func(c *idTokenClaims)
		wantErr bool
	}{
		{name: "valid", mutate: func(*idTokenClaims) {}},
		{name: "issuer without scheme", mutate: func(c *idTokenClaims) { c.Issuer = "accounts.google.com" }},
		{name: "wrong issuer", mutate: func(c *idTokenClaims) { c.Issuer = "https://evil.example" }, wantErr: true},
		{name: "wrong audience", mutate: func(c *idTokenClaims) { c.Audience = gojwt.ClaimStrings{"other-client"} }, wantErr: true},
		{name: "expired", mutate: func(c *idTokenClaims) { c.ExpiresAt = gojwt.NewNumericDate(now) }, wantErr: true},
		{name: "no expiry", mutate: func(c *idTokenClaims) { c.ExpiresAt = nil }, wantErr: true},
		{name: "no subject", mutate: func(c *idTokenClaims) { c.Subject = "" }, wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			claims := valid()
			tc.mutate(&claims)
			err := client.validateClaims(&claims, now)
			if tc.wantErr {
				assert.ErrorIs(t, err, coreErrors.ErrGoogleIdentityInvalid)
				return
			}
			assert.NoError(t, err)
		})
	}
}
