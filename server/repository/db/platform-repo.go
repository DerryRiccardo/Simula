package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type platformRepo struct {
	db       *gorm.DB
	settings coreRepo.AdminSettingsRepository
}

// InitPlatformRepo membuat repository pembaca bidang studi aktif dan pengaturan platform.
func InitPlatformRepo(db *gorm.DB) coreRepo.PlatformRepository {
	return &platformRepo{
		db:       db,
		settings: InitAdminSettingsRepo(db),
	}
}

func (r *platformRepo) ListActiveFields(ctx context.Context) ([]entity.Field, error) {
	var rows []entity.Field
	err := r.db.WithContext(ctx).
		Table("fields").
		Where("is_active = ?", true).
		Order("sort_order ASC").
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list active fields: %w", err)
	}
	return rows, nil
}

func (r *platformRepo) GetSettings(ctx context.Context) (entity.PlatformSettings, error) {
	return r.settings.GetSettings(ctx)
}
