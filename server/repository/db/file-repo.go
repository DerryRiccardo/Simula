package db

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type fileRepo struct {
	db *gorm.DB
}

// InitFileRepo membuat repository metadata berkas.
func InitFileRepo(db *gorm.DB) coreRepo.FileRepository {
	return &fileRepo{db: db}
}

func (r *fileRepo) Create(ctx context.Context, file *entity.File) error {
	if err := r.db.WithContext(ctx).Create(file).Error; err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	return nil
}

func (r *fileRepo) ListByIDs(ctx context.Context, uploadedBy string, ids []string) ([]entity.File, error) {
	files := make([]entity.File, 0, len(ids))
	if len(ids) == 0 {
		return files, nil
	}
	err := r.db.WithContext(ctx).Where("uploaded_by = ? AND id IN ?", uploadedBy, ids).Find(&files).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}
	return files, nil
}

func (r *fileRepo) ListPendingBefore(ctx context.Context, before time.Time, limit int) ([]entity.File, error) {
	files := make([]entity.File, 0)
	err := r.db.WithContext(ctx).
		Where("status = ? AND created_at < ?", entity.FileStatusPending, before).
		Order("created_at").
		Limit(limit).
		Find(&files).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list pending files: %w", err)
	}
	return files, nil
}

func (r *fileRepo) DeletePending(ctx context.Context, ids []string) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	result := r.db.WithContext(ctx).
		Where("id IN ? AND status = ?", ids, entity.FileStatusPending).
		Delete(&entity.File{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to delete pending files: %w", result.Error)
	}
	return result.RowsAffected, nil
}
