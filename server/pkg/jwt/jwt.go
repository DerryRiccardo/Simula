// Package jwt menerbitkan dan memverifikasi access token (JWT HS256).
package jwt

import (
	"errors"
	"fmt"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

const issuer = "simula"

type claims struct {
	Role entity.Role `json:"role"`
	gojwt.RegisteredClaims
}

// Issuer mengimplementasikan repository.AccessTokenIssuer.
type Issuer struct {
	secret []byte
	ttl    time.Duration
}

// NewIssuer membuat issuer dengan secret dan masa berlaku token.
func NewIssuer(secret string, ttl time.Duration) *Issuer {
	return &Issuer{secret: []byte(secret), ttl: ttl}
}

// Issue membuat access token untuk user.
func (i *Issuer) Issue(userID string, role entity.Role, now time.Time) (string, time.Time, error) {
	expiresAt := now.Add(i.ttl)
	token := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims{
		Role: role,
		RegisteredClaims: gojwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   userID,
			IssuedAt:  gojwt.NewNumericDate(now),
			ExpiresAt: gojwt.NewNumericDate(expiresAt),
		},
	})
	signed, err := token.SignedString(i.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign access token: %w", err)
	}
	return signed, expiresAt, nil
}

// Parse memverifikasi tanda tangan, algoritma, issuer, dan masa berlaku token.
func (i *Issuer) Parse(token string, now time.Time) (coreRepo.AccessClaims, error) {
	var parsed claims
	_, err := gojwt.ParseWithClaims(token, &parsed,
		func(*gojwt.Token) (any, error) { return i.secret, nil },
		gojwt.WithValidMethods([]string{gojwt.SigningMethodHS256.Alg()}),
		gojwt.WithIssuer(issuer),
		gojwt.WithExpirationRequired(),
		gojwt.WithTimeFunc(func() time.Time { return now }),
	)
	if err != nil {
		return coreRepo.AccessClaims{}, errors.Join(coreErrors.ErrInvalidAccessToken, err)
	}
	if parsed.Subject == "" {
		return coreRepo.AccessClaims{}, coreErrors.ErrInvalidAccessToken
	}
	return coreRepo.AccessClaims{UserID: parsed.Subject, Role: parsed.Role}, nil
}
