package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"
	_ "time/tzdata"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/app"
	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/initializers"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatal().Err(err).Msg("failed to load .env")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}
	initializers.InitLogger(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info().Str("mode", cfg.AppMode).Str("env", cfg.AppEnv).Msg("starting simula server")

	switch cfg.AppMode {
	case config.AppModeServer:
		err = app.RunServer(ctx, cfg)
	case config.AppModeWorker:
		err = app.RunWorker(ctx, cfg)
	default:
		err = app.RunAll(ctx, cfg)
	}
	if err != nil {
		log.Fatal().Err(err).Msg("service stopped with error")
	}
	log.Info().Msg("service stopped")
}
