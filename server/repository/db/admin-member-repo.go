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

type adminMemberRepo struct {
	db *gorm.DB
}

// InitAdminMemberRepo membuat repository menu Member panel admin.
func InitAdminMemberRepo(db *gorm.DB) coreRepo.AdminMemberRepository {
	return &adminMemberRepo{db: db}
}

type memberEnrollmentStat struct {
	UserID          string
	LastActiveAt    *time.Time
	AICaseCount     int
	B2BCaseCount    int
	ActiveCaseCount int
}

type memberCountStat struct {
	UserID string
	Count  int
}

type memberSpendStat struct {
	UserID string
	Total  int
}

func (r *adminMemberRepo) ListMembers(ctx context.Context, limit int) ([]entity.AdminMemberSummary, error) {
	db := r.db.WithContext(ctx)
	var users []entity.User
	err := db.Preload("Fields", func(q *gorm.DB) *gorm.DB {
		return q.Order("position ASC")
	}).Where("role = ?", entity.RoleStudent).
		Order("created_at DESC").
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list admin members: %w", err)
	}
	if len(users) == 0 {
		return []entity.AdminMemberSummary{}, nil
	}

	userIDs := make([]string, 0, len(users))
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
	}
	return buildMemberSummaries(db, users, userIDs)
}

func (r *adminMemberRepo) GetMember(ctx context.Context, memberID string) (entity.AdminMemberDetail, error) {
	db := r.db.WithContext(ctx)
	var user entity.User
	err := db.Preload("Fields", func(q *gorm.DB) *gorm.DB {
		return q.Order("position ASC")
	}).Where("id = ? AND role = ?", memberID, entity.RoleStudent).Take(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.AdminMemberDetail{}, coreErrors.ErrUserNotFound
	}
	if err != nil {
		return entity.AdminMemberDetail{}, fmt.Errorf("failed to get admin member %s: %w", memberID, err)
	}

	summaries, err := buildMemberSummaries(db, []entity.User{user}, []string{user.ID})
	if err != nil {
		return entity.AdminMemberDetail{}, err
	}

	var enrollmentRows []struct {
		ID          string
		CaseID      string
		CaseTitle   string
		Tier        entity.Tier
		PartnerName *string
		Status      entity.EnrollmentStatus
		Score       *int
		UpdatedAt   time.Time
	}
	err = db.Table("enrollments AS e").
		Select("e.id, c.id AS case_id, c.title AS case_title, c.tier, p.name AS partner_name, e.status, e.score, e.updated_at").
		Joins("JOIN cases c ON c.id = e.case_id").
		Joins("LEFT JOIN partners p ON p.id = c.partner_id").
		Where("e.user_id = ?", user.ID).
		Order("e.updated_at DESC").
		Scan(&enrollmentRows).Error
	if err != nil {
		return entity.AdminMemberDetail{}, fmt.Errorf("failed to list enrollments of member %s: %w", memberID, err)
	}

	enrollments := make([]entity.AdminMemberEnrollment, 0, len(enrollmentRows))
	for _, item := range enrollmentRows {
		enrollments = append(enrollments, entity.AdminMemberEnrollment{
			ID: item.ID, CaseID: item.CaseID, CaseTitle: item.CaseTitle, Tier: item.Tier,
			PartnerName: item.PartnerName, Status: item.Status, Score: item.Score,
			UpdatedAt: item.UpdatedAt, HasReview: entity.HasAdminReview(item.Status),
		})
	}

	orders, err := listAdminOrders(db, &user.ID, entity.AdminOrderListLimit)
	if err != nil {
		return entity.AdminMemberDetail{}, err
	}

	certificates := make([]entity.AdminMemberCertificate, 0)
	err = db.Table("certificates AS cert").
		Select("cert.public_id AS id, cert.enrollment_id, c.title AS case_title, c.tier, cert.score, cert.issued_at").
		Joins("JOIN cases c ON c.id = cert.case_id").
		Where("cert.user_id = ?", user.ID).
		Order("cert.issued_at DESC").
		Scan(&certificates).Error
	if err != nil {
		return entity.AdminMemberDetail{}, fmt.Errorf("failed to list certificates of member %s: %w", memberID, err)
	}

	return entity.AdminMemberDetail{
		Summary:      summaries[0],
		Institution:  user.Institution,
		LinkedinURL:  user.LinkedinURL,
		ShareDefault: user.ShareDefault,
		Enrollments:  enrollments,
		Orders:       orders,
		Certificates: certificates,
	}, nil
}

func buildMemberSummaries(db *gorm.DB, users []entity.User, userIDs []string) ([]entity.AdminMemberSummary, error) {
	var enrollRows []memberEnrollmentStat
	err := db.Table("enrollments AS e").
		Select(
			"e.user_id, MAX(e.updated_at) AS last_active_at, "+
				"SUM(CASE WHEN c.tier = ? THEN 1 ELSE 0 END) AS ai_case_count, "+
				"SUM(CASE WHEN c.tier = ? THEN 1 ELSE 0 END) AS b2b_case_count, "+
				"SUM(CASE WHEN e.status IN ? THEN 1 ELSE 0 END) AS active_case_count",
			entity.TierAI, entity.TierB2B, entity.AdminActiveStatuses,
		).
		Joins("JOIN cases c ON c.id = e.case_id").
		Where("e.user_id IN ?", userIDs).
		Group("e.user_id").
		Scan(&enrollRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate member enrollments: %w", err)
	}

	var certRows []memberCountStat
	err = db.Model(&entity.Certificate{}).
		Select("user_id, COUNT(*) AS count").
		Where("user_id IN ?", userIDs).
		Group("user_id").
		Scan(&certRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate member certificates: %w", err)
	}

	var spendRows []memberSpendStat
	err = db.Model(&entity.Order{}).
		Select("user_id, COALESCE(SUM(total), 0) AS total").
		Where("user_id IN ? AND status = ?", userIDs, entity.OrderPaid).
		Group("user_id").
		Scan(&spendRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate member spend: %w", err)
	}

	enrollByUser := make(map[string]memberEnrollmentStat, len(enrollRows))
	for _, row := range enrollRows {
		enrollByUser[row.UserID] = row
	}
	certByUser := make(map[string]int, len(certRows))
	for _, row := range certRows {
		certByUser[row.UserID] = row.Count
	}
	spendByUser := make(map[string]int, len(spendRows))
	for _, row := range spendRows {
		spendByUser[row.UserID] = row.Total
	}

	summaries := make([]entity.AdminMemberSummary, 0, len(users))
	for _, user := range users {
		fieldKeys := make([]string, 0, len(user.Fields))
		for _, field := range user.Fields {
			fieldKeys = append(fieldKeys, field.FieldKey)
		}
		stat := enrollByUser[user.ID]
		summaries = append(summaries, entity.AdminMemberSummary{
			ID:               user.ID,
			Name:             user.Name,
			Email:            user.Email,
			StudentStatus:    user.StudentStatus,
			Major:            user.Major,
			FieldKeys:        fieldKeys,
			JoinedAt:         user.CreatedAt,
			LastActiveAt:     stat.LastActiveAt,
			AICaseCount:      stat.AICaseCount,
			B2BCaseCount:     stat.B2BCaseCount,
			ActiveCaseCount:  stat.ActiveCaseCount,
			CertificateCount: certByUser[user.ID],
			TotalSpent:       spendByUser[user.ID],
		})
	}
	return summaries, nil
}
