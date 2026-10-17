package middleware

import (
	"context"
	"slices"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
)

// Authenticator memverifikasi access token. Diimplementasikan use case auth.
type Authenticator interface {
	Authenticate(ctx context.Context, accessToken string) (authctx.User, error)
}

// Auth mewajibkan sesi valid. Tanpa sesi → 401, yang membuat client memanggil /api/auth/refresh.
func Auth(a Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := a.Authenticate(c.Request.Context(), sessioncookie.Value(c.Request, sessioncookie.AccessName))
		if err != nil {
			_ = c.Error(err)
			c.Abort()
			return
		}
		c.Request = c.Request.WithContext(authctx.WithUser(c.Request.Context(), user))
		c.Next()
	}
}

// OptionalAuth memasang user bila sesi valid, dan melanjutkan sebagai tamu bila tidak ada atau
// tidak valid, agar halaman publik (katalog) tetap bisa dibuka.
func OptionalAuth(a Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := sessioncookie.Value(c.Request, sessioncookie.AccessName)
		if token == "" {
			c.Next()
			return
		}
		user, err := a.Authenticate(c.Request.Context(), token)
		if err != nil {
			if appErr := apperror.From(err); appErr.Kind == apperror.KindInternal {
				_ = c.Error(err)
				c.Abort()
				return
			}
			c.Next()
			return
		}
		c.Request = c.Request.WithContext(authctx.WithUser(c.Request.Context(), user))
		c.Next()
	}
}

// RequireRole hanya meneruskan user dengan salah satu peran yang disebut. Dipasang setelah Auth.
func RequireRole(roles ...entity.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := authctx.UserFrom(c.Request.Context())
		if !ok {
			_ = c.Error(apperror.Unauthenticated(""))
			c.Abort()
			return
		}
		if !slices.Contains(roles, entity.Role(user.Role)) {
			_ = c.Error(apperror.Forbidden(""))
			c.Abort()
			return
		}
		c.Next()
	}
}
