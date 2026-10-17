// Package google menjalankan OAuth Authorization Code + PKCE ke Google dan membaca identitas user
// dari ID token.
package google

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/endpoints"

	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

var validIssuers = []string{"https://accounts.google.com", "accounts.google.com"}

// Client mengimplementasikan repository.GoogleOAuth.
type Client struct {
	config *oauth2.Config
}

// NewClient membuat client OAuth Google.
func NewClient(clientID, clientSecret, redirectURL string) *Client {
	return &Client{config: &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     endpoints.Google,
	}}
}

// AuthCodeURL membuat URL halaman login Google dengan state dan tantangan PKCE.
func (c *Client) AuthCodeURL(state, codeVerifier string) string {
	return c.config.AuthCodeURL(state,
		oauth2.S256ChallengeOption(codeVerifier),
		oauth2.SetAuthURLParam("prompt", "select_account"),
	)
}

type idTokenClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	gojwt.RegisteredClaims
}

// Exchange menukar code (dengan client secret dan PKCE verifier) lalu membaca ID token.
//
// ID token diterima langsung dari endpoint token Google lewat TLS dalam panggilan server ke server,
// sehingga keasliannya dijamin koneksi TLS tersebut (OpenID Connect Core 1.0 §3.1.3.7 butir 6).
// Klaim issuer, audience, dan masa berlaku tetap diperiksa.
func (c *Client) Exchange(ctx context.Context, code, codeVerifier string) (coreRepo.GoogleIdentity, error) {
	token, err := c.config.Exchange(ctx, code, oauth2.VerifierOption(codeVerifier))
	if err != nil {
		return coreRepo.GoogleIdentity{}, errors.Join(coreErrors.ErrGoogleIdentityInvalid, err)
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return coreRepo.GoogleIdentity{}, fmt.Errorf("%w: missing id_token", coreErrors.ErrGoogleIdentityInvalid)
	}

	var claims idTokenClaims
	if _, _, err := gojwt.NewParser().ParseUnverified(rawIDToken, &claims); err != nil {
		return coreRepo.GoogleIdentity{}, errors.Join(coreErrors.ErrGoogleIdentityInvalid, err)
	}
	if err := c.validateClaims(&claims, time.Now()); err != nil {
		return coreRepo.GoogleIdentity{}, err
	}
	return coreRepo.GoogleIdentity{
		Subject:       claims.Subject,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		Name:          claims.Name,
	}, nil
}

func (c *Client) validateClaims(claims *idTokenClaims, now time.Time) error {
	switch {
	case !slices.Contains(validIssuers, claims.Issuer):
		return fmt.Errorf("%w: unexpected issuer", coreErrors.ErrGoogleIdentityInvalid)
	case !slices.Contains(claims.Audience, c.config.ClientID):
		return fmt.Errorf("%w: unexpected audience", coreErrors.ErrGoogleIdentityInvalid)
	case claims.ExpiresAt == nil || !now.Before(claims.ExpiresAt.Time):
		return fmt.Errorf("%w: token expired", coreErrors.ErrGoogleIdentityInvalid)
	case claims.Subject == "":
		return fmt.Errorf("%w: missing subject", coreErrors.ErrGoogleIdentityInvalid)
	}
	return nil
}
