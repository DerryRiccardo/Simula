// Package db berisi implementasi repository dengan GORM.
package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type healthRepo struct {
	db *gorm.DB
}

// InitHealthRepo membuat probe untuk database.
func InitHealthRepo(db *gorm.DB) coreRepo.HealthProbe {
	return &healthRepo{db: db}
}

func (r *healthRepo) Name() string {
	return "database"
}

func (r *healthRepo) Ping(ctx context.Context) error {
	sqlDB, err := r.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql db: %w", err)
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}
	return nil
}
