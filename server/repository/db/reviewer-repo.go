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

// reviewerVisibleSQL: submission yang dipegang reviewer, atau yang masih menunggu tanpa pemegang
// dari case yang ditugaskan kepadanya (misalnya case belum punya reviewer aktif saat peserta submit).
const reviewerVisibleSQL = `enrollments.status IN ? AND cases.tier = 'b2b' AND (
	enrollments.assigned_reviewer_id = ? OR (
		enrollments.assigned_reviewer_id IS NULL AND enrollments.status = 'in_review' AND EXISTS (
			SELECT 1 FROM reviewer_assignments ra WHERE ra.case_id = enrollments.case_id AND ra.reviewer_id = ?)))`

// claimSQL mengunci submission ke reviewer saat ia menyimpan draft atau memutuskan.
const claimSQL = "(assigned_reviewer_id IS NULL OR assigned_reviewer_id = ?)"

type reviewerRepo struct {
	db *gorm.DB
}

// InitReviewerRepo membuat repository portal reviewer.
func InitReviewerRepo(db *gorm.DB) coreRepo.ReviewerRepository {
	return &reviewerRepo{db: db}
}

func (r *reviewerRepo) visible(ctx context.Context, reviewerID string) *gorm.DB {
	return r.db.WithContext(ctx).
		Joins("JOIN cases ON cases.id = enrollments.case_id").
		Preload("Case", func(tx *gorm.DB) *gorm.DB { return tx.Select(caseSummaryColumns) }).
		Preload("Case.Partner").
		Where(reviewerVisibleSQL, entity.ReviewerStatuses, reviewerID, reviewerID)
}

func (r *reviewerRepo) ListQueue(ctx context.Context, reviewerID string, limit int) ([]entity.ReviewQueueEntry, error) {
	enrollments := make([]entity.Enrollment, 0)
	err := r.visible(ctx, reviewerID).
		Order("enrollments.updated_at DESC").
		Limit(limit).
		Find(&enrollments).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list review queue: %w", err)
	}
	return r.withLatestSubmissions(ctx, enrollments, false)
}

func (r *reviewerRepo) GetEntry(ctx context.Context, reviewerID, enrollmentID string) (entity.ReviewQueueEntry, error) {
	var enrollment entity.Enrollment
	err := r.visible(ctx, reviewerID).Where("enrollments.id = ?", enrollmentID).Take(&enrollment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.ReviewQueueEntry{}, coreErrors.ErrEnrollmentNotFound
	}
	if err != nil {
		return entity.ReviewQueueEntry{}, fmt.Errorf("failed to get review entry %s: %w", enrollmentID, err)
	}
	entries, err := r.withLatestSubmissions(ctx, []entity.Enrollment{enrollment}, true)
	if err != nil {
		return entity.ReviewQueueEntry{}, err
	}
	return entries[0], nil
}

// withLatestSubmissions memasangkan setiap enrollment dengan submission terkirim terakhirnya
// (satu query untuk semua enrollment).
func (r *reviewerRepo) withLatestSubmissions(ctx context.Context, enrollments []entity.Enrollment, withScores bool) ([]entity.ReviewQueueEntry, error) {
	entries := make([]entity.ReviewQueueEntry, 0, len(enrollments))
	if len(enrollments) == 0 {
		return entries, nil
	}
	ids := make([]string, 0, len(enrollments))
	for _, enrollment := range enrollments {
		ids = append(ids, enrollment.ID)
	}
	query := r.db.WithContext(ctx).Preload("RevisionRequest")
	if withScores {
		query = query.Preload("Review.Scores", func(tx *gorm.DB) *gorm.DB { return tx.Order("position") })
	} else {
		query = query.Preload("Review")
	}
	submissions := make([]entity.Submission, 0, len(ids))
	err := query.
		Where("enrollment_id IN ? AND status <> ?", ids, entity.SubmissionDraft).
		Order("enrollment_id, attempt DESC").
		Find(&submissions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to load reviewed submissions: %w", err)
	}
	latest := make(map[string]*entity.Submission, len(ids))
	for i := range submissions {
		if _, ok := latest[submissions[i].EnrollmentID]; !ok {
			latest[submissions[i].EnrollmentID] = &submissions[i]
		}
	}
	for _, enrollment := range enrollments {
		entries = append(entries, entity.ReviewQueueEntry{Enrollment: enrollment, Submission: latest[enrollment.ID]})
	}
	return entries, nil
}

func (r *reviewerRepo) LastRevision(ctx context.Context, enrollmentID string) (*entity.RevisionRequest, error) {
	var revision entity.RevisionRequest
	err := r.db.WithContext(ctx).
		Joins("JOIN submissions ON submissions.id = revision_requests.submission_id").
		Where("submissions.enrollment_id = ?", enrollmentID).
		Order("revision_requests.created_at DESC").
		Take(&revision).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last revision of %s: %w", enrollmentID, err)
	}
	return &revision, nil
}

func (r *reviewerRepo) GetDraft(ctx context.Context, submissionID string) (entity.ReviewDraft, error) {
	var draft entity.ReviewDraft
	err := r.db.WithContext(ctx).Where("submission_id = ?", submissionID).Take(&draft).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.ReviewDraft{}, coreErrors.ErrReviewDraftNotFound
	}
	if err != nil {
		return entity.ReviewDraft{}, fmt.Errorf("failed to get review draft of %s: %w", submissionID, err)
	}
	return draft, nil
}

func (r *reviewerRepo) SaveDraft(ctx context.Context, enrollmentID string, draft *entity.ReviewDraft) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := claim(tx, enrollmentID, draft.ReviewerID); err != nil {
			return err
		}
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "submission_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"reviewer_id", "decision", "grade", "revision", "saved_at"}),
		}).Create(draft).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to save review draft of %s: %w", draft.SubmissionID, err)
	}
	return nil
}

func (r *reviewerRepo) RequestRevision(ctx context.Context, d entity.RevisionDecision) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&entity.Enrollment{}).
			Where("id = ? AND status = ? AND revision_count < ? AND "+claimSQL,
				d.EnrollmentID, entity.EnrollmentInReview, entity.MaxRevisions, d.ReviewerID).
			Updates(map[string]any{
				"status":               entity.EnrollmentRevisionRequested,
				"revision_count":       gorm.Expr("revision_count + 1"),
				"deadline_at":          d.DeadlineAt,
				"review_due_at":        nil,
				"assigned_reviewer_id": d.ReviewerID,
				"updated_at":           d.At,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		result = tx.Model(&entity.Submission{}).
			Where("id = ? AND enrollment_id = ? AND status = ?", d.SubmissionID, d.EnrollmentID, entity.SubmissionSubmitted).
			Updates(map[string]any{"status": entity.SubmissionRevisionRequested, "updated_at": d.At})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		request := entity.RevisionRequest{
			SubmissionID: d.SubmissionID, ReviewerID: d.ReviewerID, Reason: d.Reason, Note: d.Note, CreatedAt: d.At,
		}
		if err := tx.Create(&request).Error; err != nil {
			return err
		}
		return tx.Where("submission_id = ?", d.SubmissionID).Delete(&entity.ReviewDraft{}).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to request revision of %s: %w", d.SubmissionID, err)
	}
	return nil
}

// claim mengunci enrollment yang menunggu ke reviewer. Postgres menghitung baris yang cocok, jadi
// reviewer yang sudah memegang tetap lolos.
func claim(tx *gorm.DB, enrollmentID, reviewerID string) error {
	result := tx.Model(&entity.Enrollment{}).
		Where("id = ? AND status = ? AND "+claimSQL, enrollmentID, entity.EnrollmentInReview, reviewerID).
		Update("assigned_reviewer_id", reviewerID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrStatusConflict
	}
	return nil
}
