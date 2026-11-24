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

type adminReviewRepo struct {
	db *gorm.DB
}

// InitAdminReviewRepo membuat repository menu Penilaian.
func InitAdminReviewRepo(db *gorm.DB) coreRepo.AdminReviewRepository {
	return &adminReviewRepo{db: db}
}

func (r *adminReviewRepo) enrollments(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).
		Select("enrollments.*").
		Preload("Case", func(tx *gorm.DB) *gorm.DB { return tx.Select(caseSummaryColumns) }).
		Preload("Case.Partner").
		Preload("Certificate").
		Where("enrollments.status IN ?", entity.AdminReviewStatuses)
}

func (r *adminReviewRepo) ListRows(ctx context.Context, limit int) ([]entity.AdminReviewRow, error) {
	enrollments := make([]entity.Enrollment, 0)
	if err := r.enrollments(ctx).Order("enrollments.updated_at DESC").Limit(limit).Find(&enrollments).Error; err != nil {
		return nil, fmt.Errorf("failed to list review rows: %w", err)
	}
	return r.buildRows(ctx, enrollments, false)
}

func (r *adminReviewRepo) GetRow(ctx context.Context, enrollmentID string) (entity.AdminReviewRow, error) {
	var enrollment entity.Enrollment
	err := r.enrollments(ctx).Where("enrollments.id = ?", enrollmentID).Take(&enrollment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.AdminReviewRow{}, coreErrors.ErrEnrollmentNotFound
	}
	if err != nil {
		return entity.AdminReviewRow{}, fmt.Errorf("failed to get review row %s: %w", enrollmentID, err)
	}
	rows, err := r.buildRows(ctx, []entity.Enrollment{enrollment}, true)
	if err != nil {
		return entity.AdminReviewRow{}, err
	}
	return rows[0], nil
}

// buildRows melengkapi enrollment dengan identitas peserta, reviewer pemegang, submission terakhir,
// dan tanda bermasalah. Setiap bagian dimuat dengan satu query untuk semua enrollment.
func (r *adminReviewRepo) buildRows(ctx context.Context, enrollments []entity.Enrollment, withScores bool) ([]entity.AdminReviewRow, error) {
	db := r.db.WithContext(ctx)
	rows := make([]entity.AdminReviewRow, 0, len(enrollments))
	if len(enrollments) == 0 {
		return rows, nil
	}
	ids := make([]string, 0, len(enrollments))
	userIDs := make([]string, 0, len(enrollments))
	holderIDs := make([]string, 0)
	for _, e := range enrollments {
		ids = append(ids, e.ID)
		userIDs = append(userIDs, e.UserID)
		if e.AssignedReviewerID != nil {
			holderIDs = append(holderIDs, *e.AssignedReviewerID)
		}
	}

	var members []struct{ ID, Name, Email string }
	if err := db.Raw("SELECT id, name, email FROM users WHERE id IN ?", userIDs).Scan(&members).Error; err != nil {
		return nil, fmt.Errorf("failed to load members: %w", err)
	}
	memberByID := make(map[string]struct{ Name, Email string }, len(members))
	for _, m := range members {
		memberByID[m.ID] = struct{ Name, Email string }{m.Name, m.Email}
	}

	holderByID := make(map[string]*entity.ReviewerSummary, len(holderIDs))
	if len(holderIDs) > 0 {
		var holders []entity.ReviewerSummary
		err := db.Raw(`SELECT u.id, u.name, COALESCE(rp.job_title, '') AS job_title FROM users u
			LEFT JOIN reviewer_profiles rp ON rp.user_id = u.id WHERE u.id IN ?`, holderIDs).Scan(&holders).Error
		if err != nil {
			return nil, fmt.Errorf("failed to load reviewers: %w", err)
		}
		for i := range holders {
			holderByID[holders[i].ID] = &holders[i]
		}
	}

	latest, err := latestSubmissions(db, ids, withScores)
	if err != nil {
		return nil, err
	}
	var flags []entity.ReviewFlag
	if err := db.Where("enrollment_id IN ?", ids).Find(&flags).Error; err != nil {
		return nil, fmt.Errorf("failed to load review flags: %w", err)
	}
	flagByID := make(map[string]*entity.ReviewFlag, len(flags))
	for i := range flags {
		flagByID[flags[i].EnrollmentID] = &flags[i]
	}

	for _, e := range enrollments {
		member := memberByID[e.UserID]
		row := entity.AdminReviewRow{
			Enrollment: e, MemberName: member.Name, MemberEmail: member.Email,
			Submission: latest[e.ID], Flag: flagByID[e.ID],
		}
		if e.AssignedReviewerID != nil {
			row.Holder = holderByID[*e.AssignedReviewerID]
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func (r *adminReviewRepo) SetFlag(ctx context.Context, flag entity.ReviewFlag) error {
	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "enrollment_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"note", "flagged_by", "flagged_at"}),
	}).Create(&flag).Error
	if err != nil {
		return fmt.Errorf("failed to flag %s: %w", flag.EnrollmentID, err)
	}
	return nil
}

func (r *adminReviewRepo) ClearFlag(ctx context.Context, enrollmentID string) error {
	if err := r.db.WithContext(ctx).Where("enrollment_id = ?", enrollmentID).Delete(&entity.ReviewFlag{}).Error; err != nil {
		return fmt.Errorf("failed to clear flag of %s: %w", enrollmentID, err)
	}
	return nil
}

// MarkReminded tidak mengubah updated_at: pengingat bukan perubahan pada submission peserta.
func (r *adminReviewRepo) MarkReminded(ctx context.Context, enrollmentID string, now time.Time) error {
	result := r.db.WithContext(ctx).Model(&entity.Enrollment{}).
		Where("id = ? AND status = ? AND assigned_reviewer_id IS NOT NULL AND (last_reminder_at IS NULL OR last_reminder_at <= ?)",
			enrollmentID, entity.EnrollmentInReview, now.Add(-entity.ReminderCooldown)).
		UpdateColumn("last_reminder_at", now)
	if result.Error != nil {
		return fmt.Errorf("failed to mark reminder of %s: %w", enrollmentID, result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrStatusConflict
	}
	return nil
}

func (r *adminReviewRepo) Reassign(ctx context.Context, enrollmentID, caseID, reviewerID string, now time.Time) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.OnConflict{DoNothing: true}).
			Create(&reviewerAssignment{CaseID: caseID, ReviewerID: reviewerID, CreatedAt: now}).Error
		if err != nil {
			return err
		}
		result := tx.Model(&entity.Enrollment{}).
			Where("id = ? AND status = ?", enrollmentID, entity.EnrollmentInReview).
			UpdateColumns(map[string]any{"assigned_reviewer_id": reviewerID, "last_reminder_at": nil})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		// Draft milik reviewer lama dibuang; reviewer baru mulai dari form kosong.
		return tx.Where("submission_id IN (SELECT id FROM submissions WHERE enrollment_id = ? AND status = ?)",
			enrollmentID, entity.SubmissionSubmitted).Delete(&entity.ReviewDraft{}).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to reassign %s: %w", enrollmentID, err)
	}
	return nil
}

func (r *adminReviewRepo) Regrade(ctx context.Context, enrollmentID, submissionID string, run *entity.AIGradingRun, now time.Time) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&entity.Enrollment{}).
			Where("id = ? AND status = ? AND case_id IN (SELECT id FROM cases WHERE tier = ?)",
				enrollmentID, entity.EnrollmentFailed, entity.TierAI).
			Updates(map[string]any{"status": entity.EnrollmentAIGrading, "score": nil, "share_consent": nil, "updated_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		// Hasil lama dihapus (skor per kriteria ikut terhapus lewat ON DELETE CASCADE).
		if err := tx.Where("submission_id = ?", submissionID).Delete(&entity.Review{}).Error; err != nil {
			return err
		}
		result = tx.Model(&entity.Submission{}).
			Where("id = ? AND enrollment_id = ? AND status = ?", submissionID, enrollmentID, entity.SubmissionReviewed).
			Updates(map[string]any{"status": entity.SubmissionSubmitted, "updated_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		if err := tx.Where("submission_id = ?", submissionID).Delete(&entity.AIGradingRun{}).Error; err != nil {
			return err
		}
		run.SubmissionID = submissionID
		if err := tx.Omit("Criteria").Create(run).Error; err != nil {
			return err
		}
		if len(run.Criteria) == 0 {
			return nil
		}
		return tx.Create(&run.Criteria).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to regrade %s: %w", enrollmentID, err)
	}
	return nil
}
