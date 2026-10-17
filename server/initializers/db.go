package initializers

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"

	"github.com/DerryRiccardo/Simula/server/config"
)

const dbConnectTimeout = 10 * time.Second

// NewDB membuka koneksi GORM ke Supabase PostgreSQL lewat pooler mode transaction, lalu
// memastikan database bisa dijangkau sebelum service mulai menerima request.
func NewDB(ctx context.Context, cfg *config.Config) (*gorm.DB, error) {
	dialector := postgres.New(postgres.Config{
		DSN: cfg.DatabaseURL,
		// Pooler mode transaction tidak mendukung prepared statement lintas transaksi.
		PreferSimpleProtocol: true,
	})

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:         newGormLogger(cfg),
		NowFunc:        func() time.Time { return time.Now().UTC() },
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql db: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	pingCtx, cancel := context.WithTimeout(ctx, dbConnectTimeout)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	return db, nil
}

// CloseDB menutup pool koneksi. Error hanya dicatat karena dipanggil saat shutdown.
func CloseDB(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		log.Error().Err(err).Msg("failed to get sql db on close")
		return
	}
	if err := sqlDB.Close(); err != nil {
		log.Error().Err(err).Msg("failed to close database")
	}
}

func newGormLogger(cfg *config.Config) gormLogger.Interface {
	return gormLogger.New(gormWriter{}, gormLogger.Config{
		SlowThreshold:             cfg.DBSlowQuery,
		LogLevel:                  gormLogger.Warn,
		IgnoreRecordNotFoundError: true,
		// Nilai parameter tidak ikut dicatat agar data pribadi tidak masuk log.
		ParameterizedQueries: true,
	})
}

// gormWriter meneruskan log GORM (query lambat, error) ke zerolog global.
type gormWriter struct{}

func (gormWriter) Printf(format string, args ...any) {
	log.Warn().Str("source", "gorm").Msgf(format, args...)
}
