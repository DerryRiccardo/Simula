package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBusinessDaysBetween(t *testing.T) {
	monday := time.Date(2026, 11, 2, 3, 0, 0, 0, time.UTC) // Senin 10.00 WIB
	assert.Equal(t, 0, BusinessDaysBetween(monday, monday))
	assert.Equal(t, 1, BusinessDaysBetween(monday, monday.AddDate(0, 0, 1)))
	assert.Equal(t, 5, BusinessDaysBetween(monday, monday.AddDate(0, 0, 7)), "weekend skipped")
	assert.Equal(t, 0, BusinessDaysBetween(monday, monday.Add(-time.Hour)))
}

func TestReviewerStat_AverageReviewDays(t *testing.T) {
	assert.Nil(t, (&ReviewerStat{}).AverageReviewDays())

	monday := time.Date(2026, 11, 2, 3, 0, 0, 0, time.UTC)
	stat := ReviewerStat{Decisions: []DecisionSpan{
		{SubmittedAt: monday, DecidedAt: monday.AddDate(0, 0, 1)},
		{SubmittedAt: monday, DecidedAt: monday.AddDate(0, 0, 3)},
		{SubmittedAt: monday, DecidedAt: monday.AddDate(0, 0, 3)},
	}}
	average := stat.AverageReviewDays()
	require.NotNil(t, average)
	assert.Equal(t, 2.3, *average)
}

func TestAdminReviewRow_Actions(t *testing.T) {
	now := time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)
	ai := &Case{Tier: TierAI}
	b2b := &Case{Tier: TierB2B}

	failedAI := AdminReviewRow{Enrollment: Enrollment{Status: EnrollmentFailed, Case: ai}, Submission: &Submission{}}
	assert.True(t, failedAI.CanRegrade())
	passedAI := AdminReviewRow{Enrollment: Enrollment{Status: EnrollmentPassed, Case: ai}, Submission: &Submission{}}
	assert.False(t, passedAI.CanRegrade(), "certificates cannot be revoked")
	failedB2B := AdminReviewRow{Enrollment: Enrollment{Status: EnrollmentFailed, Case: b2b}, Submission: &Submission{}}
	assert.False(t, failedB2B.CanRegrade())

	pending := AdminReviewRow{Enrollment: Enrollment{Status: EnrollmentInReview, Case: b2b}, Holder: &ReviewerSummary{ID: "r"}}
	assert.True(t, pending.CanRemind(now))
	recent := now.Add(-23 * time.Hour)
	pending.Enrollment.LastReminderAt = &recent
	assert.False(t, pending.CanRemind(now))
	old := now.Add(-24 * time.Hour)
	pending.Enrollment.LastReminderAt = &old
	assert.True(t, pending.CanRemind(now))
	pending.Holder = nil
	assert.False(t, pending.CanRemind(now), "no holder to remind")
}

func TestReviewActionKind(t *testing.T) {
	monday := time.Date(2026, 11, 2, 3, 0, 0, 0, time.UTC) // Senin 10.00 WIB

	kind, ok := ReviewActionKind(monday.Add(-time.Minute), monday)
	assert.True(t, ok)
	assert.Equal(t, AdminActionReviewOverdue, kind)

	kind, ok = ReviewActionKind(monday.AddDate(0, 0, 1), monday)
	assert.True(t, ok)
	assert.Equal(t, AdminActionReviewDueSoon, kind)

	_, ok = ReviewActionKind(monday.AddDate(0, 0, 2), monday)
	assert.False(t, ok)
}

func TestIsPaymentExpiringSoon(t *testing.T) {
	now := time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)
	assert.False(t, IsPaymentExpiringSoon(now.Add(-time.Minute), now))
	assert.True(t, IsPaymentExpiringSoon(now, now))
	assert.True(t, IsPaymentExpiringSoon(now.Add(24*time.Hour), now))
	assert.False(t, IsPaymentExpiringSoon(now.Add(24*time.Hour+time.Second), now))
}

func TestAdminOrder_EffectiveStatus(t *testing.T) {
	now := time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)
	awaiting := AdminOrder{Order: Order{Status: OrderAwaitingPayment, ExpiresAt: now.Add(time.Hour)}}
	assert.Equal(t, OrderAwaitingPayment, awaiting.EffectiveStatus(now))

	overdue := AdminOrder{Order: Order{Status: OrderAwaitingPayment, ExpiresAt: now}}
	assert.Equal(t, OrderExpired, overdue.EffectiveStatus(now))

	paid := AdminOrder{Order: Order{Status: OrderPaid, ExpiresAt: now.Add(-time.Hour)}}
	assert.Equal(t, OrderPaid, paid.EffectiveStatus(now))
}
