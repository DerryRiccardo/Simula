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

// activeReviewerSQL: user berperan reviewer yang masih aktif.
const activeReviewerSQL = "u.role = 'reviewer' AND u.is_active"

type adminPartnerRepo struct {
	db *gorm.DB
}

// InitAdminPartnerRepo membuat repository menu Reviewer & Mitra.
func InitAdminPartnerRepo(db *gorm.DB) coreRepo.AdminPartnerRepository {
	return &adminPartnerRepo{db: db}
}

func (r *adminPartnerRepo) ListPartners(ctx context.Context) ([]entity.PartnerStat, error) {
	var rows []struct {
		entity.Partner
		CaseCount           int
		ActiveReviewerCount int
		PendingReviewCount  int
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT p.*,
			(SELECT count(*) FROM cases c WHERE c.partner_id = p.id AND c.tier = 'b2b') AS case_count,
			(SELECT count(*) FROM reviewer_profiles rp JOIN users u ON u.id = rp.user_id
			 WHERE rp.partner_id = p.id AND ` + activeReviewerSQL + `) AS active_reviewer_count,
			(SELECT count(*) FROM enrollments e JOIN cases c ON c.id = e.case_id
			 WHERE c.partner_id = p.id AND e.status = 'in_review') AS pending_review_count
		FROM partners p ORDER BY p.name`).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list partners: %w", err)
	}
	stats := make([]entity.PartnerStat, 0, len(rows))
	for _, row := range rows {
		stats = append(stats, entity.PartnerStat{
			Partner: row.Partner, CaseCount: row.CaseCount,
			ActiveReviewerCount: row.ActiveReviewerCount, PendingReviewCount: row.PendingReviewCount,
		})
	}
	return stats, nil
}

func (r *adminPartnerRepo) ListReviewers(ctx context.Context) ([]entity.ReviewerStat, error) {
	db := r.db.WithContext(ctx)
	var rows []struct {
		ID, Name, Email, PartnerID, PartnerName, JobTitle string
		IsActive                                          bool
	}
	err := db.Raw(`
		SELECT u.id, u.name, u.email, u.is_active, rp.partner_id, p.name AS partner_name, rp.job_title
		FROM users u
		JOIN reviewer_profiles rp ON rp.user_id = u.id
		JOIN partners p ON p.id = rp.partner_id
		WHERE u.role = 'reviewer' ORDER BY u.name`).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list reviewers: %w", err)
	}
	reviewers := make([]entity.ReviewerStat, 0, len(rows))
	for _, row := range rows {
		reviewers = append(reviewers, entity.ReviewerStat{
			ID: row.ID, Name: row.Name, Email: row.Email, IsActive: row.IsActive,
			PartnerID: row.PartnerID, PartnerName: row.PartnerName, JobTitle: row.JobTitle,
		})
	}
	if len(reviewers) == 0 {
		return reviewers, nil
	}

	var assignments []struct{ ReviewerID, CaseID string }
	if err := db.Raw("SELECT reviewer_id, case_id FROM reviewer_assignments ORDER BY created_at").Scan(&assignments).Error; err != nil {
		return nil, fmt.Errorf("failed to list reviewer assignments: %w", err)
	}
	var pending []struct {
		ReviewerID string
		Count      int
	}
	err = db.Raw(`SELECT assigned_reviewer_id AS reviewer_id, count(*) AS count FROM enrollments
		WHERE status = 'in_review' AND assigned_reviewer_id IS NOT NULL GROUP BY assigned_reviewer_id`).Scan(&pending).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count pending reviews: %w", err)
	}
	// Keputusan reviewer: penilaian dan pengembalian, masing-masing dari waktu submit percobaannya.
	var decisions []struct {
		ReviewerID  string
		SubmittedAt time.Time
		DecidedAt   time.Time
	}
	err = db.Raw(`
		SELECT r.reviewer_id, s.submitted_at, r.reviewed_at AS decided_at
		FROM reviews r JOIN submissions s ON s.id = r.submission_id
		WHERE r.reviewer_id IS NOT NULL AND s.submitted_at IS NOT NULL
		UNION ALL
		SELECT rr.reviewer_id, s.submitted_at, rr.created_at AS decided_at
		FROM revision_requests rr JOIN submissions s ON s.id = rr.submission_id
		WHERE s.submitted_at IS NOT NULL`).Scan(&decisions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list reviewer decisions: %w", err)
	}

	byID := make(map[string]*entity.ReviewerStat, len(reviewers))
	for i := range reviewers {
		reviewers[i].CaseIDs = []string{}
		reviewers[i].Decisions = []entity.DecisionSpan{}
		byID[reviewers[i].ID] = &reviewers[i]
	}
	for _, a := range assignments {
		if reviewer := byID[a.ReviewerID]; reviewer != nil {
			reviewer.CaseIDs = append(reviewer.CaseIDs, a.CaseID)
		}
	}
	for _, p := range pending {
		if reviewer := byID[p.ReviewerID]; reviewer != nil {
			reviewer.PendingCount = p.Count
		}
	}
	for _, d := range decisions {
		if reviewer := byID[d.ReviewerID]; reviewer != nil {
			reviewer.Decisions = append(reviewer.Decisions, entity.DecisionSpan{SubmittedAt: d.SubmittedAt, DecidedAt: d.DecidedAt})
		}
	}
	return reviewers, nil
}

func (r *adminPartnerRepo) ListB2BCases(ctx context.Context) ([]entity.PartnerCase, error) {
	cases := make([]entity.PartnerCase, 0)
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.id, c.title, c.field_key, c.partner_id, c.status, c.price,
			(SELECT count(*) FROM enrollments e WHERE e.case_id = c.id AND e.status = 'in_review') AS pending_review_count,
			(SELECT count(*) FROM reviewer_assignments ra JOIN users u ON u.id = ra.reviewer_id
			 WHERE ra.case_id = c.id AND ` + activeReviewerSQL + `) AS active_reviewer_count
		FROM cases c WHERE c.tier = 'b2b' ORDER BY c.title`).Scan(&cases).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list b2b cases: %w", err)
	}
	return cases, nil
}

func (r *adminPartnerRepo) GetPartner(ctx context.Context, id string) (entity.Partner, error) {
	var partner entity.Partner
	err := r.db.WithContext(ctx).Where("id = ?", id).Take(&partner).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Partner{}, coreErrors.ErrPartnerNotFound
	}
	if err != nil {
		return entity.Partner{}, fmt.Errorf("failed to get partner %s: %w", id, err)
	}
	return partner, nil
}

func (r *adminPartnerRepo) PartnerNameTaken(ctx context.Context, name, exceptID string) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&entity.Partner{}).Where("lower(name) = lower(?)", name)
	if exceptID != "" {
		query = query.Where("id <> ?", exceptID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check partner name: %w", err)
	}
	return count > 0, nil
}

// SavePartner memperbarui nama, industri, dan profil; logo tidak disentuh. Bila belum ada, dibuat.
func (r *adminPartnerRepo) SavePartner(ctx context.Context, partner *entity.Partner) error {
	db := r.db.WithContext(ctx)
	result := db.Model(&entity.Partner{}).Where("id = ?", partner.ID).Updates(map[string]any{
		"name": partner.Name, "industry": partner.Industry, "about": partner.About, "updated_at": partner.UpdatedAt,
	})
	err := result.Error
	if err == nil && result.RowsAffected == 0 {
		err = db.Create(partner).Error
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return coreErrors.ErrPartnerNameTaken
	}
	if err != nil {
		return fmt.Errorf("failed to save partner %s: %w", partner.ID, err)
	}
	return nil
}

func (r *adminPartnerRepo) CreateReviewer(ctx context.Context, user *entity.User, profile *entity.ReviewerProfile) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit(clause.Associations).Create(user).Error; err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return coreErrors.ErrEmailTaken
			}
			return err
		}
		return tx.Create(profile).Error
	})
	if errors.Is(err, coreErrors.ErrEmailTaken) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to create reviewer: %w", err)
	}
	return nil
}

func (r *adminPartnerRepo) GetReviewerProfile(ctx context.Context, userID string) (entity.ReviewerProfile, error) {
	var profile entity.ReviewerProfile
	err := r.db.WithContext(ctx).
		Joins("JOIN users u ON u.id = reviewer_profiles.user_id AND u.role = 'reviewer'").
		Where("reviewer_profiles.user_id = ?", userID).Take(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.ReviewerProfile{}, coreErrors.ErrReviewerNotFound
	}
	if err != nil {
		return entity.ReviewerProfile{}, fmt.Errorf("failed to get reviewer profile %s: %w", userID, err)
	}
	return profile, nil
}

func (r *adminPartnerRepo) ReplaceAssignments(ctx context.Context, reviewerID string, caseIDs []string, now time.Time) (int, error) {
	blocked := 0
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		query := tx.Model(&entity.Enrollment{}).Where("assigned_reviewer_id = ? AND status = ?", reviewerID, entity.EnrollmentInReview)
		if len(caseIDs) > 0 {
			query = query.Where("case_id NOT IN ?", caseIDs)
		}
		if err := query.Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			blocked = int(count)
			return coreErrors.ErrStatusConflict
		}
		remove := tx.Where("reviewer_id = ?", reviewerID)
		if len(caseIDs) > 0 {
			remove = remove.Where("case_id NOT IN ?", caseIDs)
		}
		if err := remove.Delete(&reviewerAssignment{}).Error; err != nil {
			return err
		}
		for _, caseID := range caseIDs {
			err := tx.Clauses(clause.OnConflict{DoNothing: true}).
				Create(&reviewerAssignment{CaseID: caseID, ReviewerID: reviewerID, CreatedAt: now}).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return blocked, err
	}
	if err != nil {
		return 0, fmt.Errorf("failed to replace assignments of %s: %w", reviewerID, err)
	}
	return 0, nil
}

func (r *adminPartnerRepo) SetReviewerActive(ctx context.Context, reviewerID string, isActive bool, now time.Time) (int, error) {
	pending := 0
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if !isActive {
			var count int64
			err := tx.Model(&entity.Enrollment{}).
				Where("assigned_reviewer_id = ? AND status = ?", reviewerID, entity.EnrollmentInReview).Count(&count).Error
			if err != nil {
				return err
			}
			if count > 0 {
				pending = int(count)
				return coreErrors.ErrStatusConflict
			}
		}
		result := tx.Model(&entity.User{}).Where("id = ? AND role = ?", reviewerID, entity.RoleReviewer).
			Updates(map[string]any{"is_active": isActive, "updated_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrReviewerNotFound
		}
		return nil
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) || errors.Is(err, coreErrors.ErrReviewerNotFound) {
		return pending, err
	}
	if err != nil {
		return 0, fmt.Errorf("failed to set reviewer %s active: %w", reviewerID, err)
	}
	return 0, nil
}

func (r *adminPartnerRepo) SetPartnerActive(ctx context.Context, partnerID string, isActive bool, now time.Time) error {
	result := r.db.WithContext(ctx).Model(&entity.Partner{}).Where("id = ?", partnerID).
		Updates(map[string]any{"is_active": isActive, "updated_at": now})
	if result.Error != nil {
		return fmt.Errorf("failed to set partner %s active: %w", partnerID, result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrPartnerNotFound
	}
	return nil
}

// reviewerAssignment adalah baris tabel reviewer_assignments.
type reviewerAssignment struct {
	CaseID     string `gorm:"primaryKey"`
	ReviewerID string `gorm:"primaryKey"`
	CreatedAt  time.Time
}

// TableName mengikuti nama tabel di migrasi.
func (reviewerAssignment) TableName() string {
	return "reviewer_assignments"
}
