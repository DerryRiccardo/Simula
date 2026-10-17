// Package app merakit dependency (wiring manual) untuk setiap APP_MODE. Konstruksi per domain
// ditaruh di file terpisah (system.go, lalu auth.go, learning.go, dst.) agar bisa dipakai server
// dan worker tanpa ditulis dua kali.
package app

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/initializers"
	"github.com/DerryRiccardo/Simula/server/middleware"
	"github.com/DerryRiccardo/Simula/server/router"
)

// RunServer menjalankan API HTTP sampai ctx selesai.
func RunServer(ctx context.Context, cfg *config.Config) error {
	db, err := initializers.NewDB(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseDB(db)

	rdb, err := initializers.NewRedisClient(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseRedis(rdb)

	engine, err := newEngine(cfg)
	if err != nil {
		return err
	}
	auth := newAuthComponents(cfg, newAuthUseCase(cfg, db, rdb))
	router.Register(engine, router.Handlers{
		Health:     newHealthHandler(cfg, db, rdb),
		Auth:       auth.auth,
		Onboarding: auth.onboarding,
	}, auth.middlewares)

	return initializers.RunHTTPServer(ctx, cfg, initializers.NewHTTPServer(cfg, engine))
}

// newEngine memasang middleware global. Urutan penting: RequestID dan Logger paling luar agar
// panic yang ditangkap Recovery tetap tercatat dengan request ID dan status 500.
func newEngine(cfg *config.Config) (*gin.Engine, error) {
	engine, err := initializers.NewGinEngine(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create gin engine: %w", err)
	}
	engine.Use(
		middleware.RequestID(),
		middleware.Logger(),
		middleware.Recovery(),
		middleware.CORS([]string{cfg.FrontendURL}),
		middleware.BodyLimit(cfg.BodyLimitBytes),
		middleware.ErrorHandler(),
	)
	engine.NoRoute(middleware.NotFound())
	return engine, nil
}
