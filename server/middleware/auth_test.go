package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
)

type fakeAuthenticator struct{}

func (fakeAuthenticator) Authenticate(_ context.Context, token string) (authctx.User, error) {
	switch token {
	case "student-token":
		return authctx.User{ID: "u1", Role: "student"}, nil
	case "reviewer-token":
		return authctx.User{ID: "u2", Role: "reviewer"}, nil
	case "db-down":
		return authctx.User{}, apperror.Internal(errors.New("db down"))
	default:
		return authctx.User{}, apperror.Unauthenticated("")
	}
}

func newAuthTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(ErrorHandler())
	whoami := func(c *gin.Context) {
		user, ok := authctx.UserFrom(c.Request.Context())
		if !ok {
			c.String(http.StatusOK, "guest")
			return
		}
		c.String(http.StatusOK, user.ID)
	}
	auth := fakeAuthenticator{}
	engine.GET("/private", Auth(auth), whoami)
	engine.GET("/optional", OptionalAuth(auth), whoami)
	engine.GET("/student-only", Auth(auth), RequireRole(entity.RoleStudent), whoami)
	return engine
}

func TestAuthMiddlewares(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		token      string
		wantStatus int
		wantBody   string
	}{
		{name: "private without cookie", path: "/private", wantStatus: http.StatusUnauthorized},
		{name: "private with invalid token", path: "/private", token: "rusak", wantStatus: http.StatusUnauthorized},
		{name: "private with valid token", path: "/private", token: "student-token", wantStatus: http.StatusOK, wantBody: "u1"},
		{name: "optional as guest", path: "/optional", wantStatus: http.StatusOK, wantBody: "guest"},
		{name: "optional with invalid token stays guest", path: "/optional", token: "rusak", wantStatus: http.StatusOK, wantBody: "guest"},
		{name: "optional with valid token", path: "/optional", token: "student-token", wantStatus: http.StatusOK, wantBody: "u1"},
		{name: "optional surfaces internal errors", path: "/optional", token: "db-down", wantStatus: http.StatusInternalServerError},
		{name: "role allowed", path: "/student-only", token: "student-token", wantStatus: http.StatusOK, wantBody: "u1"},
		{name: "role forbidden", path: "/student-only", token: "reviewer-token", wantStatus: http.StatusForbidden},
	}

	engine := newAuthTestEngine()
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			if tc.token != "" {
				req.AddCookie(&http.Cookie{Name: sessioncookie.AccessName, Value: tc.token})
			}
			rec := httptest.NewRecorder()

			engine.ServeHTTP(rec, req)

			assert.Equal(t, tc.wantStatus, rec.Code)
			if tc.wantBody != "" {
				assert.Equal(t, tc.wantBody, rec.Body.String())
			}
		})
	}
}
