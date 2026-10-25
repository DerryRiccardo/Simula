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

type enrollmentRepo struct {
	db *gorm.DB
}

// InitEnrollmentRepo membuat repository enrollment.
func InitEnrollmentRepo(db *gorm.DB) coreRepo.EnrollmentRepository {
	return &enrollmentRepo{db: db}
}

func (r *enrollmentRepo) ListByUser(ctx context.Context, userID string, filter coreRepo.EnrollmentFilter) ([]entity.Enrollment, error) {
	// Join ke cases hanya untuk filter dan urutan; data case dimuat lewat Preload.
	query := withCase(r.db.WithContext(ctx)).
		Joins("JOIN cases ON cases.id = enrollments.case_id").
		Where("enrollments.user_id = ?", userID)
	if filter.Tier != "" {
		query = query.Where("cases.tier = ?", filter.Tier)
	}
	if filter.Status != "" {
		query = query.Where("enrollments.status = ?", filter.Status)
	}
	if filter.FieldKey != "" {
		query = query.Where("cases.field_key = ?", filter.FieldKey)
	}
	if filter.Search != "" {
		query = query.Where("cases.title ILIKE ?", "%"+escapeLike(filter.Search)+"%")
	}

	enrollments := make([]entity.Enrollment, 0)
	err := query.Select("enrollments.*").
		Order(enrollmentOrder(filter.Sort)).
		Limit(entity.UnpaginatedListLimit).
		Find(&enrollments).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list enrollments: %w", err)
	}
	return enrollments, nil
}

func (r *enrollmentRepo) GetForUser(ctx context.Context, userID, enrollmentID string) (entity.Enrollment, error) {
	var enrollment entity.Enrollment
	err := withCase(r.db.WithContext(ctx)).
		Where("id = ? AND user_id = ?", enrollmentID, userID).
		Take(&enrollment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound
	}
	if err != nil {
		return entity.Enrollment{}, fmt.Errorf("failed to get enrollment %s: %w", enrollmentID, err)
	}
	return enrollment, nil
}

func (r *enrollmentRepo) FindByUserAndCase(ctx context.Context, userID, caseID string) (entity.Enrollment, error) {
	var enrollment entity.Enrollment
	err := r.db.WithContext(ctx).Where("user_id = ? AND case_id = ?", userID, caseID).Take(&enrollment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound
	}
	if err != nil {
		return entity.Enrollment{}, fmt.Errorf("failed to find enrollment: %w", err)
	}
	return enrollment, nil
}

func (r *enrollmentRepo) Create(ctx context.Context, enrollment *entity.Enrollment) error {
	err := r.db.WithContext(ctx).Omit(clause.Associations).Create(enrollment).Error
	if !errors.Is(err, gorm.ErrDuplicatedKey) {
		if err != nil {
			return fmt.Errorf("failed to create enrollment: %w", err)
		}
		return nil
	}
	// Dua UNIQUE bisa bentrok: (user_id, case_id) atau (case_id, candidate_number).
	var existing int64
	countErr := r.db.WithContext(ctx).Model(&entity.Enrollment{}).
		Where("user_id = ? AND case_id = ?", enrollment.UserID, enrollment.CaseID).Count(&existing).Error
	if countErr != nil {
		return fmt.Errorf("failed to check enrollment: %w", countErr)
	}
	if existing > 0 {
		return coreErrors.ErrEnrollmentExists
	}
	return coreErrors.ErrCandidateNumberTaken
}

// withCase memuat ringkasan case, mitranya, dan sertifikat.
func withCase(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Case", func(tx *gorm.DB) *gorm.DB { return tx.Select(caseSummaryColumns) }).
		Preload("Case.Partner").
		Preload("Certificate")
}

func enrollmentOrder(sort entity.EnrollmentSort) string {
	switch sort {
	case entity.EnrollmentSortDeadline:
		return "enrollments.deadline_at ASC NULLS LAST, enrollments.updated_at DESC, enrollments.id"
	case entity.EnrollmentSortTitle:
		return "cases.title ASC, enrollments.id"
	default:
		return "enrollments.updated_at DESC, enrollments.id"
	}
}
