package app

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/core/module/system"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	cacheRepo "github.com/DerryRiccardo/Simula/server/repository/cache"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

func newHealthHandler(cfg *config.Config, db *gorm.DB, rdb *redis.Client) *publicHandler.HealthHandler {
	uc := system.InitHealthUseCase(
		cfg.HealthCheckTimeout,
		dbRepo.InitHealthRepo(db),
		cacheRepo.InitHealthRepo(rdb),
	)
	return publicHandler.Health(uc)
}
