package admin

import (
	"context"
	"sort"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

// OverviewUseCase melayani menu Dashboard (Ringkasan) panel admin.
type OverviewUseCase interface {
	GetOverview(ctx context.Context) (entity.AdminOverview, error)
}

// OverviewDeps adalah dependency use case Dashboard admin.
type OverviewDeps struct {
	Overview coreRepo.AdminOverviewRepository
	Now      func() time.Time
}

type overviewUseCase struct {
	OverviewDeps
}

// InitOverviewUseCase membuat use case Dashboard admin.
func InitOverviewUseCase(deps OverviewDeps) OverviewUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &overviewUseCase{OverviewDeps: deps}
}

func (uc *overviewUseCase) GetOverview(ctx context.Context) (entity.AdminOverview, error) {
	now := uc.Now()
	data, err := uc.Overview.LoadOverview(ctx, now)
	if err != nil {
		return entity.AdminOverview{}, apperror.Internal(err)
	}
	stats := data.Stats
	stats.PendingReviewCount = len(data.PendingReviews)
	overdueCount := 0
	for _, review := range data.PendingReviews {
		if now.After(review.ReviewDueAt) {
			overdueCount++
		}
	}
	stats.OverdueReviewCount = overdueCount

	activities := data.Activities
	if activities == nil {
		activities = []entity.AdminActivity{}
	}
	return entity.AdminOverview{
		Stats:       stats,
		ActionItems: buildActionItems(data, now),
		Activities:  activities,
	}, nil
}

// buildActionItems mengurutkan butir "Perlu tindakan" dari yang paling mendesak: review terlambat,
// case tanpa reviewer, tenggat terdekat (review jatuh tempo segera dan pembayaran hampir
// kedaluwarsa), lalu draft terlama (sama dengan getActionItems di mocks/adminApi.ts).
func buildActionItems(data entity.AdminOverviewData, now time.Time) []entity.AdminActionItem {
	var overdue, dueSoon, uncovered, drafts []entity.AdminActionItem

	for _, review := range data.PendingReviews {
		kind, ok := entity.ReviewActionKind(review.ReviewDueAt, now)
		if !ok {
			continue
		}
		enrollmentID := review.EnrollmentID
		memberName := review.MemberName
		item := entity.AdminActionItem{
			ID:           "review-" + review.EnrollmentID,
			Kind:         kind,
			EnrollmentID: &enrollmentID,
			CaseID:       review.CaseID,
			CaseTitle:    review.CaseTitle,
			MemberName:   &memberName,
			At:           review.ReviewDueAt,
			PartnerName:  review.PartnerName,
		}
		if kind == entity.AdminActionReviewOverdue {
			overdue = append(overdue, item)
		} else {
			dueSoon = append(dueSoon, item)
		}
	}

	for _, order := range data.AwaitingOrders {
		if !entity.IsPaymentExpiringSoon(order.ExpiresAt, now) {
			continue
		}
		memberName := order.MemberName
		dueSoon = append(dueSoon, entity.AdminActionItem{
			ID:         "payment-" + order.ID,
			Kind:       entity.AdminActionPaymentExpiring,
			CaseID:     order.CaseID,
			CaseTitle:  order.CaseTitle,
			MemberName: &memberName,
			At:         order.ExpiresAt,
		})
	}

	for _, c := range data.UncoveredCases {
		uncovered = append(uncovered, entity.AdminActionItem{
			ID:          "uncovered-" + c.ID,
			Kind:        entity.AdminActionCaseWithoutReviewer,
			CaseID:      c.ID,
			CaseTitle:   c.Title,
			At:          c.UpdatedAt,
			PartnerName: c.PartnerName,
		})
	}

	for _, draft := range data.StaleDrafts {
		drafts = append(drafts, entity.AdminActionItem{
			ID:        "draft-" + draft.ID,
			Kind:      entity.AdminActionDraftStale,
			CaseID:    draft.ID,
			CaseTitle: draft.Title,
			At:        draft.UpdatedAt,
		})
	}

	sortByAt := func(items []entity.AdminActionItem) {
		sort.SliceStable(items, func(i, j int) bool { return items[i].At.Before(items[j].At) })
	}
	sortByAt(overdue)
	sortByAt(uncovered)
	sortByAt(dueSoon)
	sortByAt(drafts)

	items := make([]entity.AdminActionItem, 0, len(overdue)+len(uncovered)+len(dueSoon)+len(drafts))
	items = append(items, overdue...)
	items = append(items, uncovered...)
	items = append(items, dueSoon...)
	items = append(items, drafts...)
	return items
}
