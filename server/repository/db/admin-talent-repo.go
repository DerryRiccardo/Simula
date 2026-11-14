package db

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type adminTalentPoolRepo struct {
	db *gorm.DB
}

// InitAdminTalentPoolRepo membuat repository menu Talent pool panel admin.
func InitAdminTalentPoolRepo(db *gorm.DB) coreRepo.AdminTalentPoolRepository {
	return &adminTalentPoolRepo{db: db}
}

type talentCandidateRow struct {
	ID            string
	MemberID      string
	MemberName    string
	MemberEmail   string
	CaseID        string
	CaseTitle     string
	PartnerID     *string
	PartnerName   *string
	ReviewerName  *string
	ReviewerRole  string
	Score         int
	RecommendedAt time.Time
	Consent       string
	SharedAt      *time.Time
}

func (r *adminTalentPoolRepo) ListCandidates(ctx context.Context, limit int) ([]entity.TalentCandidate, error) {
	return r.queryCandidates(r.db.WithContext(ctx), nil, limit)
}

func (r *adminTalentPoolRepo) GetCandidate(ctx context.Context, enrollmentID string) (entity.TalentCandidate, error) {
	candidates, err := r.queryCandidates(r.db.WithContext(ctx), &enrollmentID, 1)
	if err != nil {
		return entity.TalentCandidate{}, err
	}
	if len(candidates) == 0 {
		return entity.TalentCandidate{}, coreErrors.ErrEnrollmentNotFound
	}
	return candidates[0], nil
}

func (r *adminTalentPoolRepo) ShareCandidate(ctx context.Context, enrollmentID string, now time.Time) error {
	result := r.db.WithContext(ctx).
		Model(&entity.Enrollment{}).
		Where("id = ? AND share_consent = ? AND profile_shared_at IS NULL", enrollmentID, "granted").
		UpdateColumn("profile_shared_at", now)
	if result.Error != nil {
		return fmt.Errorf("failed to share talent candidate %s: %w", enrollmentID, result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrStatusConflict
	}
	return nil
}

func (r *adminTalentPoolRepo) queryCandidates(
	db *gorm.DB, enrollmentID *string, limit int,
) ([]entity.TalentCandidate, error) {
	query := db.Table("enrollments AS e").
		Select(
			"e.id, e.user_id AS member_id, u.name AS member_name, u.email AS member_email, "+
				"c.id AS case_id, c.title AS case_title, c.partner_id, p.name AS partner_name, "+
				"COALESCE(rev_u.name, assigned_u.name) AS reviewer_name, r.reviewer_role, "+
				"e.score, r.reviewed_at AS recommended_at, "+
				"COALESCE(e.share_consent, 'pending') AS consent, e.profile_shared_at AS shared_at",
		).
		Joins("JOIN cases c ON c.id = e.case_id").
		Joins("LEFT JOIN partners p ON p.id = c.partner_id").
		Joins("JOIN users u ON u.id = e.user_id").
		Joins("JOIN submissions s ON s.enrollment_id = e.id AND s.status = ?", entity.SubmissionReviewed).
		Joins("JOIN reviews r ON r.submission_id = s.id AND r.is_recommended = TRUE").
		Joins("LEFT JOIN users rev_u ON rev_u.id = r.reviewer_id").
		Joins("LEFT JOIN users assigned_u ON assigned_u.id = e.assigned_reviewer_id").
		Where("c.tier = ? AND e.status = ? AND e.score IS NOT NULL", entity.TierB2B, entity.EnrollmentPassed)
	if enrollmentID != nil {
		query = query.Where("e.id = ?", *enrollmentID)
	}

	var rows []talentCandidateRow
	if err := query.Order("r.reviewed_at DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to list talent candidates: %w", err)
	}
	if len(rows) == 0 {
		return []entity.TalentCandidate{}, nil
	}

	memberIDs := make([]string, 0, len(rows))
	seen := make(map[string]bool, len(rows))
	for _, row := range rows {
		if !seen[row.MemberID] {
			seen[row.MemberID] = true
			memberIDs = append(memberIDs, row.MemberID)
		}
	}

	var fieldRows []entity.UserField
	err := db.Model(&entity.UserField{}).
		Where("user_id IN ?", memberIDs).
		Order("position ASC").
		Find(&fieldRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to load candidate fields: %w", err)
	}

	fieldsByUser := make(map[string][]string, len(memberIDs))
	for _, field := range fieldRows {
		fieldsByUser[field.UserID] = append(fieldsByUser[field.UserID], field.FieldKey)
	}

	candidates := make([]entity.TalentCandidate, 0, len(rows))
	for _, row := range rows {
		fieldKeys := fieldsByUser[row.MemberID]
		if fieldKeys == nil {
			fieldKeys = []string{}
		}
		candidates = append(candidates, entity.TalentCandidate{
			ID:            row.ID,
			MemberID:      row.MemberID,
			MemberName:    row.MemberName,
			MemberEmail:   row.MemberEmail,
			FieldKeys:     fieldKeys,
			CaseID:        row.CaseID,
			CaseTitle:     row.CaseTitle,
			PartnerID:     row.PartnerID,
			PartnerName:   row.PartnerName,
			ReviewerName:  row.ReviewerName,
			ReviewerRole:  row.ReviewerRole,
			Score:         row.Score,
			RecommendedAt: row.RecommendedAt,
			Consent:       row.Consent,
			SharedAt:      row.SharedAt,
		})
	}
	return candidates, nil
}
