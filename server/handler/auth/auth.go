// Package auth berisi handler endpoint /api/auth: daftar, masuk, sesi, dan login Google.
package auth

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	authDto "github.com/DerryRiccardo/Simula/server/handler/dto/auth"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
)

// Kode error di query halaman login client setelah login Google gagal.
const (
	loginErrorGoogle   = "google"
	loginErrorDisabled = "account_disabled"
)

// AuthHandler melayani endpoint auth.
type AuthHandler struct {
	uc          authModule.AuthUseCase
	cookies     sessioncookie.Config
	frontendURL string
	now         func() time.Time
}

// Auth membuat handler auth. frontendURL dipakai untuk redirect setelah login Google.
func Auth(uc authModule.AuthUseCase, cookies sessioncookie.Config, frontendURL string) *AuthHandler {
	return &AuthHandler{
		uc:          uc,
		cookies:     cookies,
		frontendURL: strings.TrimRight(frontendURL, "/"),
		now:         func() time.Time { return time.Now().UTC() },
	}
}

// Register: POST /api/auth/register. Akun baru langsung masuk.
func (h *AuthHandler) Register(c *gin.Context) {
	var req authDto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	session, err := h.uc.Register(c.Request.Context(), authDto.MapRegisterReqToInput(req), sessionMeta(c))
	if err != nil {
		_ = c.Error(err)
		return
	}
	h.setSession(c, session)
	response.Created(c, authDto.MapUserToResponse(session.User))
}

// Login: POST /api/auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req authDto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	session, err := h.uc.Login(c.Request.Context(), authDto.MapLoginReqToInput(req), sessionMeta(c))
	if err != nil {
		_ = c.Error(err)
		return
	}
	h.setSession(c, session)
	response.OK(c, authDto.MapUserToResponse(session.User))
}

// Refresh: POST /api/auth/refresh. Dipanggil client otomatis saat menerima 401.
func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken := sessioncookie.Value(c.Request, sessioncookie.RefreshName)
	session, err := h.uc.Refresh(c.Request.Context(), refreshToken, sessionMeta(c))
	if err != nil {
		if apperror.From(err).Kind == apperror.KindUnauthenticated {
			sessioncookie.ClearSession(c.Writer, h.cookies)
		}
		_ = c.Error(err)
		return
	}
	h.setSession(c, session)
	response.OK(c, authDto.MapUserToResponse(session.User))
}

// Logout: POST /api/auth/logout. Publik agar tetap bisa membersihkan cookie walau sesi sudah habis.
func (h *AuthHandler) Logout(c *gin.Context) {
	err := h.uc.Logout(c.Request.Context(), sessioncookie.Value(c.Request, sessioncookie.RefreshName))
	sessioncookie.ClearSession(c.Writer, h.cookies)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, nil)
}

// Me: GET /api/auth/me.
func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.uc.Me(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, authDto.MapUserToResponse(user))
}

// GoogleStart: GET /api/auth/google?next=/path. Browser diarahkan ke halaman login Google.
func (h *AuthHandler) GoogleStart(c *gin.Context) {
	start, err := h.uc.StartGoogleLogin(c.Query("next"))
	if err != nil {
		h.redirectLoginError(c, loginErrorGoogle, err)
		return
	}
	state := sessioncookie.GoogleState{State: start.State, CodeVerifier: start.CodeVerifier, Next: start.Next}
	if err := sessioncookie.SetGoogleState(c.Writer, h.cookies, state, authModule.GoogleStateTTL); err != nil {
		h.redirectLoginError(c, loginErrorGoogle, err)
		return
	}
	c.Redirect(http.StatusFound, start.AuthURL)
}

// GoogleCallback: GET /api/auth/google/callback. Dipanggil Google setelah user memilih akun.
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	state, _ := sessioncookie.ReadGoogleState(c.Request)
	sessioncookie.ClearGoogleState(c.Writer, h.cookies)

	session, err := h.uc.CompleteGoogleLogin(c.Request.Context(), authModule.GoogleCallbackInput{
		Code:          c.Query("code"),
		State:         c.Query("state"),
		ProviderError: c.Query("error"),
		ExpectedState: state.State,
		CodeVerifier:  state.CodeVerifier,
	}, sessionMeta(c))
	if err != nil {
		code := loginErrorGoogle
		if apperror.From(err).Kind == apperror.KindForbidden {
			code = loginErrorDisabled
		}
		h.redirectLoginError(c, code, err)
		return
	}
	h.setSession(c, session)
	c.Redirect(http.StatusFound, h.frontendURL+entity.PostAuthPath(&session.User, state.Next))
}

func (h *AuthHandler) setSession(c *gin.Context, session authModule.Session) {
	sessioncookie.SetSession(c.Writer, h.cookies,
		session.AccessToken, session.AccessExpiresAt,
		session.RefreshToken, session.RefreshExpiresAt,
		h.now(),
	)
}

func (h *AuthHandler) redirectLoginError(c *gin.Context, code string, err error) {
	log.Info().Err(err).Str("error_code", code).Msg("google login failed")
	c.Redirect(http.StatusFound, h.frontendURL+entity.PathLogin+"?error="+url.QueryEscape(code))
}

func sessionMeta(c *gin.Context) authModule.SessionMeta {
	return authModule.SessionMeta{IP: c.ClientIP(), UserAgent: c.Request.UserAgent()}
}
