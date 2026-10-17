package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type refreshTokenRepo struct {
	db *gorm.DB
}

// InitRefreshTokenRepo membuat repository refresh token.
func InitRefreshTokenRepo(db *gorm.DB) coreRepo.RefreshTokenRepository {
	return &refreshTokenRepo{db: db}
}

func (r *refreshTokenRepo) Create(ctx context.Context, token *entity.RefreshToken) error {
	if err := r.db.WithContext(ctx).Create(token).Error; err != nil {
		return fmt.Errorf("failed to create refresh token: %w", err)
	}
	return nil
}

func (r *refreshTokenRepo) GetByHash(ctx context.Context, hash string) (entity.RefreshToken, error) {
	var token entity.RefreshToken
	err := r.db.WithContext(ctx).Where("token_hash = ?", hash).Take(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.RefreshToken{}, coreErrors.ErrRefreshTokenNotFound
	}
	if err != nil {
		return entity.RefreshToken{}, fmt.Errorf("failed to get refresh token: %w", err)
	}
	return token, nil
}

func (r *refreshTokenRepo) Rotate(ctx context.Context, oldID string, next *entity.RefreshToken, now time.Time) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(next).Error; err != nil {
			return fmt.Errorf("failed to create refresh token: %w", err)
		}
		result := tx.Model(&entity.RefreshToken{}).
			Where("id = ? AND revoked_at IS NULL", oldID).
			Updates(map[string]any{"revoked_at": now, "replaced_by_id": next.ID})
		if result.Error != nil {
			return fmt.Errorf("failed to revoke refresh token: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrRefreshTokenRotated
		}
		return nil
	})
}

func (r *refreshTokenRepo) RevokeFamily(ctx context.Context, familyID string, now time.Time) error {
	err := r.db.WithContext(ctx).Model(&entity.RefreshToken{}).
		Where("family_id = ? AND revoked_at IS NULL", familyID).
		Update("revoked_at", now).Error
	if err != nil {
		return fmt.Errorf("failed to revoke refresh token family: %w", err)
	}
	return nil
}

func (r *refreshTokenRepo) DeleteExpiredBefore(ctx context.Context, before time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Where("expires_at < ?", before).Delete(&entity.RefreshToken{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to delete expired refresh tokens: %w", result.Error)
	}
	return result.RowsAffected, nil
}
