package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// lastProgressSQL adalah waktu kemajuan terakhir sebuah run: kriteria terakhir yang selesai, atau
// waktu mulai bila belum ada.
const lastProgressSQL = `GREATEST(ai_grading_runs.started_at,
COALESCE((SELECT max(c.completed_at) FROM ai_grading_criteria c WHERE c.run_id = ai_grading_runs.id), ai_grading_runs.started_at))`

type gradingRepo struct {
	db *gorm.DB
}

// InitGradingRepo membuat repository progres penilaian AI.
func InitGradingRepo(db *gorm.DB) coreRepo.GradingRepository {
	return &gradingRepo{db: db}
}

func (r *gradingRepo) LoadJob(ctx context.Context, runID string) (entity.GradingJob, error) {
	db := r.db.WithContext(ctx)
	var job entity.GradingJob
	err := db.Preload("Criteria", criteriaInOrder).Where("id = ?", runID).Take(&job.Run).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.GradingJob{}, coreErrors.ErrGradingRunNotFound
	}
	if err != nil {
		return entity.GradingJob{}, fmt.Errorf("failed to load grading run %s: %w", runID, err)
	}
	if err := db.Where("id = ?", job.Run.SubmissionID).Take(&job.Submission).Error; err != nil {
		return entity.GradingJob{}, fmt.Errorf("failed to load submission of run %s: %w", runID, err)
	}
	if err := db.Where("id = ?", job.Submission.EnrollmentID).Take(&job.Enrollment).Error; err != nil {
		return entity.GradingJob{}, fmt.Errorf("failed to load enrollment of run %s: %w", runID, err)
	}
	return job, nil
}

func (r *gradingRepo) GetRunBySubmission(ctx context.Context, submissionID string) (entity.AIGradingRun, error) {
	var run entity.AIGradingRun
	err := r.db.WithContext(ctx).Preload("Criteria", criteriaInOrder).Where("submission_id = ?", submissionID).Take(&run).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.AIGradingRun{}, coreErrors.ErrGradingRunNotFound
	}
	if err != nil {
		return entity.AIGradingRun{}, fmt.Errorf("failed to get grading run of %s: %w", submissionID, err)
	}
	return run, nil
}

func (r *gradingRepo) SaveCriterionResult(ctx context.Context, criterionID string, verdict entity.CriterionVerdict, now time.Time) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var criterion entity.AIGradingCriterion
		result := tx.Model(&criterion).
			Where("id = ? AND status = ?", criterionID, entity.AIGradingCriterionPending).
			Updates(map[string]any{
				"status":       entity.AIGradingCriterionDone,
				"level":        verdict.Level,
				"reason":       verdict.Reason,
				"attempts":     gorm.Expr("attempts + 1"),
				"completed_at": now,
			})
		if result.Error != nil || result.RowsAffected == 0 {
			return result.Error
		}
		return tx.Model(&entity.AIGradingRun{}).
			Where("id = (SELECT run_id FROM ai_grading_criteria WHERE id = ?) AND status = ?", criterionID, entity.AIGradingQueued).
			Update("status", entity.AIGradingRunning).Error
	})
	if err != nil {
		return fmt.Errorf("failed to save criterion %s: %w", criterionID, err)
	}
	return nil
}

func (r *gradingRepo) ListStalled(ctx context.Context, before time.Time, limit int) ([]entity.AIGradingRun, error) {
	runs := make([]entity.AIGradingRun, 0)
	err := r.db.WithContext(ctx).
		Preload("Criteria", criteriaInOrder).
		Where("status IN ? AND "+lastProgressSQL+" < ?", []entity.AIGradingStatus{entity.AIGradingQueued, entity.AIGradingRunning}, before).
		Order("started_at").
		Limit(limit).
		Find(&runs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list stalled grading runs: %w", err)
	}
	return runs, nil
}

func (r *gradingRepo) ListUngraded(ctx context.Context, limit int) ([]entity.UngradedSubmission, error) {
	ungraded := make([]entity.UngradedSubmission, 0)
	err := r.db.WithContext(ctx).
		Table("submissions AS s").
		Select("s.id AS submission_id, e.case_id").
		Joins("JOIN enrollments e ON e.id = s.enrollment_id").
		Joins("JOIN cases c ON c.id = e.case_id").
		Where("s.status = ? AND e.status = ? AND c.tier = ?", entity.SubmissionSubmitted, entity.EnrollmentAIGrading, entity.TierAI).
		Where("NOT EXISTS (SELECT 1 FROM ai_grading_runs r WHERE r.submission_id = s.id)").
		Order("s.submitted_at").
		Limit(limit).
		Scan(&ungraded).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list ungraded submissions: %w", err)
	}
	return ungraded, nil
}

func (r *gradingRepo) CreateRun(ctx context.Context, run *entity.AIGradingRun) (bool, error) {
	created := false
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Omit("Criteria").
			Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "submission_id"}}, DoNothing: true}).
			Create(run)
		if result.Error != nil || result.RowsAffected == 0 {
			return result.Error
		}
		created = true
		if len(run.Criteria) == 0 {
			return nil
		}
		return tx.Create(&run.Criteria).Error
	})
	if err != nil {
		return false, fmt.Errorf("failed to create grading run for %s: %w", run.SubmissionID, err)
	}
	return created, nil
}

func (r *gradingRepo) Fail(ctx context.Context, runID, message string, now time.Time) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var run entity.AIGradingRun
		if err := tx.Select("id", "submission_id").Where("id = ?", runID).Take(&run).Error; err != nil {
			return err
		}
		result := tx.Model(&entity.AIGradingRun{}).
			Where("id = ? AND status IN ?", runID, []entity.AIGradingStatus{entity.AIGradingQueued, entity.AIGradingRunning}).
			Updates(map[string]any{"status": entity.AIGradingFailed, "error_message": message, "completed_at": now})
		if result.Error != nil || result.RowsAffected == 0 {
			// Run sudah selesai atau sudah ditandai gagal; tidak ada yang perlu dikembalikan.
			return result.Error
		}
		var submission entity.Submission
		if err := tx.Select("id", "enrollment_id").Where("id = ?", run.SubmissionID).Take(&submission).Error; err != nil {
			return err
		}
		err := tx.Model(&entity.Submission{}).
			Where("id = ? AND status = ?", submission.ID, entity.SubmissionSubmitted).
			Updates(map[string]any{"status": entity.SubmissionDraft, "submitted_at": nil, "updated_at": now}).Error
		if err != nil {
			return err
		}
		return tx.Model(&entity.Enrollment{}).
			Where("id = ? AND status = ?", submission.EnrollmentID, entity.EnrollmentAIGrading).
			Updates(map[string]any{"status": entity.EnrollmentInProgress, "updated_at": now}).Error
	})
	if err != nil {
		return fmt.Errorf("failed to fail grading run %s: %w", runID, err)
	}
	return nil
}

func criteriaInOrder(db *gorm.DB) *gorm.DB {
	return db.Order("criterion_position")
}
