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

// caseColumns adalah kolom cases yang ditulis pembuat case (slug, created_by, dan created_at hanya
// diisi saat dibuat).
var caseColumns = []string{
	"tier", "status", "title", "summary", "field_key", "level", "duration_label", "about", "activities",
	"skills", "prerequisites", "context", "passing_score", "price", "deadline_days", "partner_id",
	"reviewer_role", "published_at", "updated_at",
}

type adminCaseRepo struct {
	db *gorm.DB
}

// InitAdminCaseRepo membuat repository pembuat case.
func InitAdminCaseRepo(db *gorm.DB) coreRepo.AdminCaseRepository {
	return &adminCaseRepo{db: db}
}

func (r *adminCaseRepo) ListCases(ctx context.Context, limit int) ([]entity.AdminCaseSummary, error) {
	rows := make([]entity.AdminCaseSummary, 0)
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.id, c.title, c.tier, c.field_key, c.level, c.status, p.name AS partner_name, c.updated_at,
			(SELECT count(*) FROM enrollments e WHERE e.case_id = c.id AND e.status <> 'pending_payment') AS participant_count,
			(SELECT count(*) FROM enrollments e WHERE e.case_id = c.id AND e.status = 'in_review') AS pending_review_count
		FROM cases c LEFT JOIN partners p ON p.id = c.partner_id
		ORDER BY c.updated_at DESC LIMIT ?`, limit).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list admin cases: %w", err)
	}
	return rows, nil
}

func (r *adminCaseRepo) EnrollmentCounts(ctx context.Context, caseID string) (int, int, error) {
	var counts struct{ Total, Started int }
	err := r.db.WithContext(ctx).Raw(`
		SELECT count(*) AS total, count(*) FILTER (WHERE status IN ?) AS started
		FROM enrollments WHERE case_id = ?`, entity.StructureLockStatuses, caseID).Scan(&counts).Error
	if err != nil {
		return 0, 0, fmt.Errorf("failed to count enrollments of case %s: %w", caseID, err)
	}
	return counts.Total, counts.Started, nil
}

func (r *adminCaseRepo) SlugTaken(ctx context.Context, slug string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.Case{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check slug: %w", err)
	}
	return count > 0, nil
}

func (r *adminCaseRepo) MaterialFiles(ctx context.Context, ids []string) ([]entity.File, error) {
	files := make([]entity.File, 0, len(ids))
	if len(ids) == 0 {
		return files, nil
	}
	err := r.db.WithContext(ctx).Where("id IN ? AND purpose = ?", ids, entity.FilePurposeMaterial).Find(&files).Error
	if err != nil {
		return nil, fmt.Errorf("failed to load material files: %w", err)
	}
	return files, nil
}

func (r *adminCaseRepo) Save(ctx context.Context, save coreRepo.CaseSave) (int, error) {
	c := save.Case
	blocked := 0
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if save.IsNew {
			if err := tx.Omit(clause.Associations).Create(c).Error; err != nil {
				return err
			}
		} else {
			result := tx.Model(c).Select(caseColumns).Omit(clause.Associations).Updates(c)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return coreErrors.ErrCaseNotFound
			}
			count, err := releaseOtherPartnerReviewers(tx, c)
			if err != nil {
				return err
			}
			if count > 0 {
				blocked = count
				return coreErrors.ErrStatusConflict
			}
			for _, child := range []any{&entity.CaseTask{}, &entity.CaseMaterial{}, &entity.CaseSlot{}, &entity.RubricCriterion{}} {
				if err := tx.Where("case_id = ?", c.ID).Delete(child).Error; err != nil {
					return err
				}
			}
		}
		if err := createChildren(tx, c); err != nil {
			return err
		}
		if len(save.AttachFileIDs) == 0 {
			return nil
		}
		return tx.Model(&entity.File{}).Where("id IN ? AND purpose = ?", save.AttachFileIDs, entity.FilePurposeMaterial).
			Update("status", entity.FileStatusAttached).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return blocked, err
	}
	if errors.Is(err, coreErrors.ErrCaseNotFound) {
		return 0, err
	}
	if err != nil {
		return 0, fmt.Errorf("failed to save case %s: %w", c.ID, err)
	}
	return 0, nil
}

// releaseOtherPartnerReviewers melepas penugasan reviewer yang bukan dari mitra case (AI case: semua).
// Ditolak bila reviewer itu masih memegang submission menunggu di case ini.
func releaseOtherPartnerReviewers(tx *gorm.DB, c *entity.Case) (int, error) {
	// Tanpa mitra, partner_id = NULL tidak pernah benar, jadi semua reviewer dianggap dari mitra lain.
	otherPartner := "NOT EXISTS (SELECT 1 FROM reviewer_profiles rp WHERE rp.user_id = %s AND rp.partner_id = ?)"
	partnerID := c.PartnerID
	var count int64
	err := tx.Model(&entity.Enrollment{}).
		Where("case_id = ? AND status = ? AND assigned_reviewer_id IS NOT NULL", c.ID, entity.EnrollmentInReview).
		Where(fmt.Sprintf(otherPartner, "enrollments.assigned_reviewer_id"), partnerID).
		Count(&count).Error
	if err != nil || count > 0 {
		return int(count), err
	}
	return 0, tx.Where("case_id = ?", c.ID).
		Where(fmt.Sprintf(otherPartner, "reviewer_assignments.reviewer_id"), partnerID).
		Delete(&reviewerAssignment{}).Error
}

func createChildren(tx *gorm.DB, c *entity.Case) error {
	if len(c.Tasks) > 0 {
		if err := tx.Create(&c.Tasks).Error; err != nil {
			return err
		}
	}
	if len(c.Slots) > 0 {
		if err := tx.Create(&c.Slots).Error; err != nil {
			return err
		}
	}
	if len(c.Rubric) > 0 {
		if err := tx.Create(&c.Rubric).Error; err != nil {
			return err
		}
	}
	if len(c.Materials) > 0 {
		if err := tx.Omit("File").Create(&c.Materials).Error; err != nil {
			return err
		}
	}
	return nil
}
