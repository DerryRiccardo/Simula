// Package initializers membangun infrastruktur: logger, database, Redis, Asynq, dan HTTP server.
package initializers

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/config"
)

// InitLogger mengatur logger zerolog global. Level yang tidak dikenal jatuh ke info.
func InitLogger(cfg *config.Config) {
	zerolog.TimeFieldFormat = time.RFC3339
	zerolog.TimestampFunc = func() time.Time { return time.Now().UTC() }

	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil || level == zerolog.NoLevel {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)

	if cfg.LogFormat == "console" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.Kitchen})
		return
	}
	log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
}
