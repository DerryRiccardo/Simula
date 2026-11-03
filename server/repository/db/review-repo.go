package db

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type reviewRepo struct {
	db *gorm.DB
}

// InitReviewRepo membuat repository hasil penilaian.
func InitReviewRepo(db *gorm.DB) coreRepo.ReviewRepository {
	return &reviewRepo{db: db}
}

func (r *reviewRepo) Finalize(ctx context.Context, f entity.ReviewFinalization) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Status enrollment diubah lebih dulu: bila sudah dinilai oleh task lain, transaksi berhenti
		// sebelum menulis review kedua.
		updates := map[string]any{
			"status":        f.To,
			"score":         f.Review.TotalScore,
			"deadline_at":   nil,
			"review_due_at": nil,
			"share_consent": f.ShareConsent,
			"updated_at":    f.At,
		}
		query := tx.Model(&entity.Enrollment{}).Where("id = ? AND status IN ?", f.EnrollmentID, f.From)
		if f.ReviewerID != nil {
			query = query.Where(claimSQL, *f.ReviewerID)
			updates["assigned_reviewer_id"] = *f.ReviewerID
		}
		result := query.Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		if err := tx.Create(&f.Review).Error; err != nil {
			return err
		}
		err := tx.Model(&entity.Submission{}).
			Where("id = ? AND status = ?", f.Review.SubmissionID, entity.SubmissionSubmitted).
			Updates(map[string]any{"status": entity.SubmissionReviewed, "updated_at": f.At}).Error
		if err != nil {
			return err
		}
		if err := tx.Where("submission_id = ?", f.Review.SubmissionID).Delete(&entity.ReviewDraft{}).Error; err != nil {
			return err
		}
		if f.Certificate != nil {
			// Satu sertifikat per enrollment: bila sudah ada, sertifikat lama dipakai.
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "enrollment_id"}}, DoNothing: true}).
				Create(f.Certificate).Error; err != nil {
				return err
			}
		}
		if f.GradingRunID == nil {
			return nil
		}
		return tx.Model(&entity.AIGradingRun{}).
			Where("id = ?", *f.GradingRunID).
			Updates(map[string]any{"status": entity.AIGradingDone, "completed_at": f.At}).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to finalize review of %s: %w", f.Review.SubmissionID, err)
	}
	return nil
}

func (r *reviewRepo) GetBySubmission(ctx context.Context, submissionID string) (entity.Review, error) {
	var review entity.Review
	err := r.db.WithContext(ctx).
		Preload("Scores", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Where("submission_id = ?", submissionID).
		Take(&review).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Review{}, coreErrors.ErrReviewNotFound
	}
	if err != nil {
		return entity.Review{}, fmt.Errorf("failed to get review of %s: %w", submissionID, err)
	}
	return review, nil
}
