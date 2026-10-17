package jwt

import (
	"testing"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
)

const testSecret = "test-secret-with-at-least-32-characters!"

func TestIssuer_IssueAndParse(t *testing.T) {
	now := time.Date(2026, 10, 17, 10, 0, 0, 0, time.UTC)
	iss := NewIssuer(testSecret, 30*time.Minute)

	token, expiresAt, err := iss.Issue("user-1", entity.RoleReviewer, now)
	require.NoError(t, err)
	assert.Equal(t, now.Add(30*time.Minute), expiresAt)

	claims, err := iss.Parse(token, now.Add(29*time.Minute))
	require.NoError(t, err)
	assert.Equal(t, "user-1", claims.UserID)
	assert.Equal(t, entity.RoleReviewer, claims.Role)
}

func TestIssuer_ParseRejects(t *testing.T) {
	now := time.Date(2026, 10, 17, 10, 0, 0, 0, time.UTC)
	iss := NewIssuer(testSecret, 30*time.Minute)
	valid, _, err := iss.Issue("user-1", entity.RoleStudent, now)
	require.NoError(t, err)

	otherSecret, _, err := NewIssuer("another-secret-with-at-least-32-chars!!", time.Minute).Issue("user-1", entity.RoleAdmin, now)
	require.NoError(t, err)

	unsigned, err := gojwt.NewWithClaims(gojwt.SigningMethodNone, claims{
		Role:             entity.RoleAdmin,
		RegisteredClaims: gojwt.RegisteredClaims{Issuer: issuer, Subject: "user-1", ExpiresAt: gojwt.NewNumericDate(now.Add(time.Hour))},
	}).SignedString(gojwt.UnsafeAllowNoneSignatureType)
	require.NoError(t, err)

	tests := []struct {
		name  string
		token string
		at    time.Time
	}{
		{name: "expired", token: valid, at: now.Add(31 * time.Minute)},
		{name: "signed with another secret", token: otherSecret, at: now},
		{name: "alg none", token: unsigned, at: now},
		{name: "garbage", token: "not-a-jwt", at: now},
		{name: "empty", token: "", at: now},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := iss.Parse(tc.token, tc.at)
			assert.ErrorIs(t, err, coreErrors.ErrInvalidAccessToken)
		})
	}
}
