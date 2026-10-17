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

type userRepo struct {
	db *gorm.DB
}

// InitUserRepo membuat repository user.
func InitUserRepo(db *gorm.DB) coreRepo.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, user *entity.User) error {
	err := r.db.WithContext(ctx).Omit("Fields").Create(user).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return coreErrors.ErrEmailTaken
	}
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *userRepo) GetByID(ctx context.Context, id string) (entity.User, error) {
	return r.getBy(ctx, "id = ?", id)
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (entity.User, error) {
	return r.getBy(ctx, "email = ?", email)
}

func (r *userRepo) GetByGoogleSub(ctx context.Context, sub string) (entity.User, error) {
	return r.getBy(ctx, "google_sub = ?", sub)
}

func (r *userRepo) getBy(ctx context.Context, query string, arg string) (entity.User, error) {
	var user entity.User
	err := r.db.WithContext(ctx).Preload("Fields").Where(query, arg).Take(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.User{}, coreErrors.ErrUserNotFound
	}
	if err != nil {
		return entity.User{}, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

func (r *userRepo) LinkGoogle(ctx context.Context, userID, sub string) error {
	result := r.db.WithContext(ctx).Model(&entity.User{}).Where("id = ?", userID).
		Updates(map[string]any{"google_sub": sub, "updated_at": time.Now().UTC()})
	if result.Error != nil {
		return fmt.Errorf("failed to link google account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrUserNotFound
	}
	return nil
}

func (r *userRepo) CompleteOnboarding(
	ctx context.Context, userID string, fieldKeys []string, status entity.StudentStatus, major *string,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&entity.User{}).Where("id = ?", userID).Updates(map[string]any{
			"is_onboarded":   true,
			"student_status": status,
			"major":          major,
			"updated_at":     time.Now().UTC(),
		})
		if result.Error != nil {
			return fmt.Errorf("failed to update user: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrUserNotFound
		}

		if err := tx.Where("user_id = ?", userID).Delete(&entity.UserField{}).Error; err != nil {
			return fmt.Errorf("failed to clear user fields: %w", err)
		}
		fields := make([]entity.UserField, 0, len(fieldKeys))
		for i, key := range fieldKeys {
			fields = append(fields, entity.UserField{UserID: userID, FieldKey: key, Position: int16(i + 1)})
		}
		if err := tx.Create(&fields).Error; err != nil {
			return fmt.Errorf("failed to save user fields: %w", err)
		}
		return nil
	})
}
