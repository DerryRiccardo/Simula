package db

import (
	"context"
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type adminOverviewRepo struct {
	db *gorm.DB
}

// InitAdminOverviewRepo membuat repository Dashboard (Ringkasan) panel admin.
func InitAdminOverviewRepo(db *gorm.DB) coreRepo.AdminOverviewRepository {
	return &adminOverviewRepo{db: db}
}

func (r *adminOverviewRepo) LoadOverview(ctx context.Context, now time.Time) (entity.AdminOverviewData, error) {
	db := r.db.WithContext(ctx)
	var data entity.AdminOverviewData

	stats, err := loadOverviewStats(db, now)
	if err != nil {
		return entity.AdminOverviewData{}, err
	}
	data.Stats = stats

	var pendingRows []struct {
		EnrollmentID string
		CaseID       string
		CaseTitle    string
		PartnerName  *string
		MemberName   string
		ReviewDueAt  *time.Time
		UpdatedAt    time.Time
	}
	err = db.Table("enrollments AS e").
		Select("e.id AS enrollment_id, c.id AS case_id, c.title AS case_title, p.name AS partner_name, u.name AS member_name, e.review_due_at, e.updated_at").
		Joins("JOIN cases c ON c.id = e.case_id").
		Joins("JOIN users u ON u.id = e.user_id").
		Joins("LEFT JOIN partners p ON p.id = c.partner_id").
		Where("e.status = ? AND c.tier = ?", entity.EnrollmentInReview, entity.TierB2B).
		Scan(&pendingRows).Error
	if err != nil {
		return entity.AdminOverviewData{}, fmt.Errorf("failed to load pending reviews: %w", err)
	}
	data.PendingReviews = make([]entity.AdminPendingReview, 0, len(pendingRows))
	for _, row := range pendingRows {
		dueAt := entity.AddBusinessDays(row.UpdatedAt, entity.ReviewSLABusinessDays)
		if row.ReviewDueAt != nil {
			dueAt = *row.ReviewDueAt
		}
		data.PendingReviews = append(data.PendingReviews, entity.AdminPendingReview{
			EnrollmentID: row.EnrollmentID, CaseID: row.CaseID, CaseTitle: row.CaseTitle,
			PartnerName: row.PartnerName, MemberName: row.MemberName, ReviewDueAt: dueAt,
		})
	}
	data.Stats.PendingReviewCount = len(data.PendingReviews)

	activeReviewerSub := db.Table("reviewer_assignments AS ra").
		Select("1").
		Joins("JOIN users u ON u.id = ra.reviewer_id").
		Where("ra.case_id = c.id AND u.role = ? AND u.is_active = ?", entity.RoleReviewer, true)
	data.UncoveredCases = make([]entity.AdminUncoveredCase, 0)
	err = db.Table("cases AS c").
		Select("c.id, c.title, p.name AS partner_name, c.updated_at").
		Joins("LEFT JOIN partners p ON p.id = c.partner_id").
		Where("c.tier = ? AND c.status = ? AND NOT EXISTS (?)", entity.TierB2B, entity.CaseStatusPublished, activeReviewerSub).
		Scan(&data.UncoveredCases).Error
	if err != nil {
		return entity.AdminOverviewData{}, fmt.Errorf("failed to load uncovered cases: %w", err)
	}

	data.AwaitingOrders = make([]entity.AdminAwaitingOrder, 0)
	err = db.Table("orders AS o").
		Select("o.id, c.id AS case_id, c.title AS case_title, u.name AS member_name, o.expires_at").
		Joins("JOIN cases c ON c.id = o.case_id").
		Joins("JOIN users u ON u.id = o.user_id").
		Where("o.status = ? AND o.expires_at > ?", entity.OrderAwaitingPayment, now).
		Scan(&data.AwaitingOrders).Error
	if err != nil {
		return entity.AdminOverviewData{}, fmt.Errorf("failed to load awaiting orders: %w", err)
	}

	staleBefore := now.AddDate(0, 0, -entity.AdminDraftStaleDays)
	data.StaleDrafts = make([]entity.AdminStaleDraft, 0)
	err = db.Model(&entity.Case{}).
		Select("id, title, updated_at").
		Where("status = ? AND updated_at < ?", entity.CaseStatusDraft, staleBefore).
		Scan(&data.StaleDrafts).Error
	if err != nil {
		return entity.AdminOverviewData{}, fmt.Errorf("failed to load stale drafts: %w", err)
	}

	activities, err := loadAdminActivities(db)
	if err != nil {
		return entity.AdminOverviewData{}, err
	}
	data.Activities = activities

	return data, nil
}

func loadOverviewStats(db *gorm.DB, now time.Time) (entity.AdminOverviewStats, error) {
	var stats entity.AdminOverviewStats
	var memberCount, activeMemberCount, awaitingCount int64

	if err := db.Model(&entity.User{}).Where("role = ?", entity.RoleStudent).Count(&memberCount).Error; err != nil {
		return stats, fmt.Errorf("failed to count members: %w", err)
	}
	stats.MemberCount = int(memberCount)

	err := db.Table("enrollments AS e").
		Joins("JOIN users u ON u.id = e.user_id").
		Where("u.role = ? AND e.status IN ?", entity.RoleStudent, entity.AdminActiveStatuses).
		Distinct("e.user_id").
		Count(&activeMemberCount).Error
	if err != nil {
		return stats, fmt.Errorf("failed to count active members: %w", err)
	}
	stats.ActiveMemberCount = int(activeMemberCount)

	var caseRows []struct {
		Status entity.CaseStatus
		Tier   entity.Tier
		Count  int
	}
	if err := db.Model(&entity.Case{}).Select("status, tier, COUNT(*) AS count").Group("status, tier").Scan(&caseRows).Error; err != nil {
		return stats, fmt.Errorf("failed to count cases: %w", err)
	}
	for _, row := range caseRows {
		switch row.Status {
		case entity.CaseStatusPublished:
			stats.PublishedCaseCount += row.Count
			if row.Tier == entity.TierAI {
				stats.AICaseCount += row.Count
			} else if row.Tier == entity.TierB2B {
				stats.B2BCaseCount += row.Count
			}
		case entity.CaseStatusDraft:
			stats.DraftCaseCount += row.Count
		}
	}

	since30 := now.AddDate(0, 0, -entity.AdminRevenueDays)
	var paidStats struct {
		Revenue int
		Count   int
	}
	err = db.Model(&entity.Order{}).
		Select("COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count").
		Where("status = ? AND paid_at >= ?", entity.OrderPaid, since30).
		Scan(&paidStats).Error
	if err != nil {
		return stats, fmt.Errorf("failed to aggregate paid orders: %w", err)
	}
	stats.RevenueLast30Days = paidStats.Revenue
	stats.PaidOrderCountLast30Days = paidStats.Count

	err = db.Model(&entity.Order{}).
		Where("status = ? AND expires_at > ?", entity.OrderAwaitingPayment, now).
		Count(&awaitingCount).Error
	if err != nil {
		return stats, fmt.Errorf("failed to count awaiting orders: %w", err)
	}
	stats.AwaitingPaymentCount = int(awaitingCount)

	var aiStats struct {
		GradedCount int
		PassedCount int
	}
	err = db.Table("enrollments AS e").
		Select("COUNT(*) AS graded_count, SUM(CASE WHEN e.status = ? THEN 1 ELSE 0 END) AS passed_count", entity.EnrollmentPassed).
		Joins("JOIN cases c ON c.id = e.case_id").
		Where("c.tier = ? AND e.status IN ?", entity.TierAI, []entity.EnrollmentStatus{entity.EnrollmentPassed, entity.EnrollmentFailed}).
		Scan(&aiStats).Error
	if err != nil {
		return stats, fmt.Errorf("failed to count AI review outcomes: %w", err)
	}
	stats.AIGradedCount = aiStats.GradedCount
	stats.AIPassedCount = aiStats.PassedCount

	return stats, nil
}

type adminActivityRow struct {
	ID         string
	MemberName string
	CaseID     string
	CaseTitle  string
	Tier       entity.Tier
	At         time.Time
}

type prioritizedActivity struct {
	entity.AdminActivity
	priority int
}

func loadAdminActivities(db *gorm.DB) ([]entity.AdminActivity, error) {
	all := make([]prioritizedActivity, 0, entity.AdminActivityLimit*5)

	appendRows := func(rows []adminActivityRow, kind entity.AdminActivityType, suffix string, priority int) {
		for _, row := range rows {
			all = append(all, prioritizedActivity{
				AdminActivity: entity.AdminActivity{
					ID:         row.ID + suffix,
					Type:       kind,
					MemberName: row.MemberName,
					CaseID:     row.CaseID,
					CaseTitle:  row.CaseTitle,
					Tier:       row.Tier,
					At:         row.At,
				},
				priority: priority,
			})
		}
	}

	var submitted []adminActivityRow
	if err := db.Table("submissions AS s").
		Select("s.id, u.name AS member_name, c.id AS case_id, c.title AS case_title, c.tier, s.submitted_at AS at").
		Joins("JOIN enrollments e ON e.id = s.enrollment_id").
		Joins("JOIN users u ON u.id = e.user_id").
		Joins("JOIN cases c ON c.id = e.case_id").
		Where("s.status <> ? AND s.submitted_at IS NOT NULL", entity.SubmissionDraft).
		Order("s.submitted_at DESC").
		Limit(entity.AdminActivityLimit).
		Scan(&submitted).Error; err != nil {
		return nil, fmt.Errorf("failed to load submitted activities: %w", err)
	}
	appendRows(submitted, entity.AdminActivitySubmitted, "-sub", 1)

	var revisions []adminActivityRow
	if err := db.Table("revision_requests AS rr").
		Select("rr.submission_id AS id, u.name AS member_name, c.id AS case_id, c.title AS case_title, c.tier, rr.created_at AS at").
		Joins("JOIN submissions s ON s.id = rr.submission_id").
		Joins("JOIN enrollments e ON e.id = s.enrollment_id").
		Joins("JOIN users u ON u.id = e.user_id").
		Joins("JOIN cases c ON c.id = e.case_id").
		Order("rr.created_at DESC").
		Limit(entity.AdminActivityLimit).
		Scan(&revisions).Error; err != nil {
		return nil, fmt.Errorf("failed to load revision activities: %w", err)
	}
	appendRows(revisions, entity.AdminActivityRevisionRequested, "-rev", 2)

	var reviewed []adminActivityRow
	if err := db.Table("reviews AS r").
		Select("r.id, u.name AS member_name, c.id AS case_id, c.title AS case_title, c.tier, r.reviewed_at AS at").
		Joins("JOIN submissions s ON s.id = r.submission_id").
		Joins("JOIN enrollments e ON e.id = s.enrollment_id").
		Joins("JOIN users u ON u.id = e.user_id").
		Joins("JOIN cases c ON c.id = e.case_id").
		Where("r.is_passed = ?", false).
		Order("r.reviewed_at DESC").
		Limit(entity.AdminActivityLimit).
		Scan(&reviewed).Error; err != nil {
		return nil, fmt.Errorf("failed to load review activities: %w", err)
	}
	appendRows(reviewed, entity.AdminActivityReviewed, "-revd", 3)

	var certs []adminActivityRow
	if err := db.Table("certificates AS cert").
		Select("cert.id, u.name AS member_name, c.id AS case_id, c.title AS case_title, c.tier, cert.issued_at AS at").
		Joins("JOIN users u ON u.id = cert.user_id").
		Joins("JOIN cases c ON c.id = cert.case_id").
		Order("cert.issued_at DESC").
		Limit(entity.AdminActivityLimit).
		Scan(&certs).Error; err != nil {
		return nil, fmt.Errorf("failed to load certificate activities: %w", err)
	}
	appendRows(certs, entity.AdminActivityCertificateIssued, "-cert", 4)

	var paid []adminActivityRow
	if err := db.Table("orders AS o").
		Select("o.id, u.name AS member_name, c.id AS case_id, c.title AS case_title, c.tier, o.paid_at AS at").
		Joins("JOIN users u ON u.id = o.user_id").
		Joins("JOIN cases c ON c.id = o.case_id").
		Where("o.status = ? AND o.paid_at IS NOT NULL", entity.OrderPaid).
		Order("o.paid_at DESC").
		Limit(entity.AdminActivityLimit).
		Scan(&paid).Error; err != nil {
		return nil, fmt.Errorf("failed to load paid activities: %w", err)
	}
	appendRows(paid, entity.AdminActivityPaid, "", 5)

	sort.SliceStable(all, func(i, j int) bool {
		if !all[i].At.Equal(all[j].At) {
			return all[i].At.After(all[j].At)
		}
		return all[i].priority > all[j].priority
	})

	limit := min(len(all), entity.AdminActivityLimit)
	activities := make([]entity.AdminActivity, 0, limit)
	for i := range limit {
		activities = append(activities, all[i].AdminActivity)
	}
	return activities, nil
}
