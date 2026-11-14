package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type adminSettingsRepo struct {
	db *gorm.DB
}

// InitAdminSettingsRepo membuat repository menu Pengaturan panel admin.
func InitAdminSettingsRepo(db *gorm.DB) coreRepo.AdminSettingsRepository {
	return &adminSettingsRepo{db: db}
}

type settingsLogRow struct {
	ID        string
	ActorName string
	Changes   entity.SettingChangeList
	CreatedAt time.Time
}

func (r *adminSettingsRepo) GetSettings(ctx context.Context) (entity.PlatformSettings, error) {
	var settings entity.PlatformSettings
	err := r.db.WithContext(ctx).Where("id = ?", true).Take(&settings).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.DefaultPlatformSettings(), nil
	}
	if err != nil {
		return entity.PlatformSettings{}, fmt.Errorf("failed to get platform settings: %w", err)
	}
	return settings, nil
}

func (r *adminSettingsRepo) ListLogs(
	ctx context.Context, limit int,
) ([]entity.SettingsLogEntry, error) {
	var rows []settingsLogRow
	err := r.db.WithContext(ctx).
		Table("platform_settings_logs AS l").
		Select("l.id, u.name AS actor_name, l.changes, l.created_at").
		Joins("JOIN users u ON u.id = l.actor_id").
		Order("l.created_at DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list platform settings logs: %w", err)
	}

	entries := make([]entity.SettingsLogEntry, 0, len(rows))
	for _, row := range rows {
		changes := []entity.SettingChange(row.Changes)
		if changes == nil {
			changes = []entity.SettingChange{}
		}
		entries = append(entries, entity.SettingsLogEntry{
			ID:        row.ID,
			At:        row.CreatedAt,
			ActorName: row.ActorName,
			Changes:   changes,
		})
	}
	return entries, nil
}

func (r *adminSettingsRepo) SaveSettings(
	ctx context.Context,
	settings entity.PlatformSettings,
	logEntry *entity.PlatformSettingsLog,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		settings.ID = true
		err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&settings).Error
		if err != nil {
			return fmt.Errorf("failed to save platform settings: %w", err)
		}
		if err := tx.Create(logEntry).Error; err != nil {
			return fmt.Errorf("failed to create platform settings log: %w", err)
		}
		return nil
	})
}
