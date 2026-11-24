package app

import (
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/core/module/system"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

func newHealthHandler(cfg *config.Config, db *gorm.DB) *publicHandler.HealthHandler {
	uc := system.InitHealthUseCase(
		cfg.HealthCheckTimeout,
		dbRepo.InitHealthRepo(db),
	)
	return publicHandler.Health(uc)
}

func newPlatformHandler(db *gorm.DB) *publicHandler.PlatformHandler {
	return publicHandler.Platform(dbRepo.InitPlatformRepo(db))
}
