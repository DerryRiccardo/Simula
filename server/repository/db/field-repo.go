package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type fieldRepo struct {
	db *gorm.DB
}

// InitFieldRepo membuat repository taksonomi bidang.
func InitFieldRepo(db *gorm.DB) coreRepo.FieldRepository {
	return &fieldRepo{db: db}
}

func (r *fieldRepo) ExistingKeys(ctx context.Context, keys []string) ([]string, error) {
	existing := make([]string, 0, len(keys))
	if len(keys) == 0 {
		return existing, nil
	}
	err := r.db.WithContext(ctx).Table("fields").Where("key IN ?", keys).Pluck("key", &existing).Error
	if err != nil {
		return nil, fmt.Errorf("failed to read fields: %w", err)
	}
	return existing, nil
}
