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

type profileRepo struct {
	db *gorm.DB
}

// InitProfileRepo membuat repository halaman Profil mahasiswa.
func InitProfileRepo(db *gorm.DB) coreRepo.ProfileRepository {
	return &profileRepo{db: db}
}

func (r *profileRepo) GetProfile(ctx context.Context, userID string) (entity.StudentProfile, error) {
	db := r.db.WithContext(ctx)
	var user entity.User
	err := db.Preload("Fields", func(q *gorm.DB) *gorm.DB {
		return q.Order("position ASC")
	}).Where("id = ?", userID).Take(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.StudentProfile{}, coreErrors.ErrUserNotFound
	}
	if err != nil {
		return entity.StudentProfile{}, fmt.Errorf("failed to get user profile %s: %w", userID, err)
	}

	shared := make([]entity.SharedProfile, 0)
	err = db.Table("enrollments AS e").
		Select(
			"e.id AS enrollment_id, c.title AS case_title, p.name AS partner_name, "+
				"COALESCE(e.share_consent, 'pending') AS consent",
		).
		Joins("JOIN cases c ON c.id = e.case_id").
		Joins("JOIN partners p ON p.id = c.partner_id").
		Joins("JOIN submissions s ON s.enrollment_id = e.id AND s.status = ?", entity.SubmissionReviewed).
		Joins("JOIN reviews r ON r.submission_id = s.id AND r.is_recommended = TRUE").
		Where("e.user_id = ? AND c.tier = ?", userID, entity.TierB2B).
		Order("e.updated_at DESC").
		Scan(&shared).Error
	if err != nil {
		return entity.StudentProfile{}, fmt.Errorf("failed to list shared profiles of %s: %w", userID, err)
	}

	return entity.StudentProfile{
		User:           user,
		SharedProfiles: shared,
	}, nil
}

func (r *profileRepo) UpdateDetails(
	ctx context.Context, userID string, in entity.ProfileDetailsUpdate, now time.Time,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&entity.User{}).Where("id = ?", userID).Updates(map[string]any{
			"name":           in.Name,
			"institution":    in.Institution,
			"major":          in.Major,
			"student_status": in.StudentStatus,
			"linkedin_url":   in.LinkedinURL,
			"is_onboarded":   true,
			"updated_at":     now,
		})
		if result.Error != nil {
			return fmt.Errorf("failed to update user profile details %s: %w", userID, result.Error)
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrUserNotFound
		}

		if err := tx.Where("user_id = ?", userID).Delete(&entity.UserField{}).Error; err != nil {
			return fmt.Errorf("failed to clear user fields of %s: %w", userID, err)
		}
		fields := make([]entity.UserField, 0, len(in.FieldKeys))
		for i, key := range in.FieldKeys {
			fields = append(fields, entity.UserField{
				UserID:   userID,
				FieldKey: key,
				Position: int16(i + 1),
			})
		}
		if err := tx.Create(&fields).Error; err != nil {
			return fmt.Errorf("failed to save user fields of %s: %w", userID, err)
		}
		return nil
	})
}

func (r *profileRepo) UpdateShareDefault(
	ctx context.Context, userID string, shareDefault entity.ShareDefault, now time.Time,
) error {
	result := r.db.WithContext(ctx).
		Model(&entity.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"share_default": shareDefault,
			"updated_at":    now,
		})
	if result.Error != nil {
		return fmt.Errorf("failed to update share default of %s: %w", userID, result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrUserNotFound
	}
	return nil
}
