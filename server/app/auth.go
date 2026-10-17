package app

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	authHandler "github.com/DerryRiccardo/Simula/server/handler/auth"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	"github.com/DerryRiccardo/Simula/server/middleware"
	"github.com/DerryRiccardo/Simula/server/pkg/google"
	"github.com/DerryRiccardo/Simula/server/pkg/jwt"
	"github.com/DerryRiccardo/Simula/server/pkg/password"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
	cacheRepo "github.com/DerryRiccardo/Simula/server/repository/cache"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
	"github.com/DerryRiccardo/Simula/server/router"
)

// newAuthUseCase dipakai server (endpoint) dan worker (task pembersihan sesi).
func newAuthUseCase(cfg *config.Config, db *gorm.DB, rdb *redis.Client) authModule.AuthUseCase {
	var googleClient coreRepo.GoogleOAuth
	if cfg.IsGoogleLoginEnabled() {
		googleClient = google.NewClient(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)
	}
	return authModule.InitAuthUseCase(authModule.Deps{
		Users:           dbRepo.InitUserRepo(db),
		Fields:          dbRepo.InitFieldRepo(db),
		RefreshTokens:   dbRepo.InitRefreshTokenRepo(db),
		RateLimiter:     cacheRepo.InitRateLimitRepo(rdb),
		Hasher:          password.NewHasher(),
		AccessTokens:    jwt.NewIssuer(cfg.JWTSecret, cfg.AccessTokenTTL),
		Google:          googleClient,
		RefreshTokenTTL: cfg.RefreshTokenTTL,
	})
}

type authComponents struct {
	auth        *authHandler.AuthHandler
	onboarding  *studentHandler.OnboardingHandler
	middlewares router.Middlewares
}

func newAuthComponents(cfg *config.Config, uc authModule.AuthUseCase) authComponents {
	cookies := sessioncookie.Config{Secure: cfg.CookieSecure, Domain: cfg.CookieDomain}
	return authComponents{
		auth:       authHandler.Auth(uc, cookies, cfg.FrontendURL),
		onboarding: studentHandler.Onboarding(uc),
		middlewares: router.Middlewares{
			Auth:         middleware.Auth(uc),
			OptionalAuth: middleware.OptionalAuth(uc),
			RequireRole:  middleware.RequireRole,
		},
	}
}
