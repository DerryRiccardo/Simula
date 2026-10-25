package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func view(id string, status EnrollmentStatus, tier Tier, updated time.Time) Enrollment {
	return Enrollment{ID: id, Status: status, Case: &Case{Tier: tier}, UpdatedAt: updated}
}

func TestBuildDashboardStats(t *testing.T) {
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)
	enrollments := []Enrollment{
		view("1", EnrollmentInProgress, TierAI, now),
		view("2", EnrollmentAIGrading, TierAI, now),
		view("3", EnrollmentInReview, TierB2B, now),
		view("4", EnrollmentRevisionRequested, TierB2B, now),
		view("5", EnrollmentPassed, TierAI, now),
		view("6", EnrollmentPassed, TierAI, now),
		view("7", EnrollmentPendingPayment, TierB2B, now),
	}

	stats := BuildDashboardStats(enrollments, 2)

	assert.Equal(t, 7, stats.TotalCount)
	assert.Equal(t, 2, stats.StatusCounts[EnrollmentPassed])
	assert.Equal(t, 5, stats.ActiveCount, "in_progress, ai_grading, in_review, revision, pending_payment")
	assert.Equal(t, 2, stats.InReviewCount, "in_review and ai_grading")
	assert.Equal(t, 1, stats.RevisionCount)
	assert.Equal(t, 2, stats.CertificateCount)
	assert.Zero(t, stats.StatusCounts[EnrollmentFailed])
}

func TestActionItems_OrderedByUrgencyThenRecency(t *testing.T) {
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)
	enrollments := []Enrollment{
		view("old-progress", EnrollmentInProgress, TierAI, now.Add(-2*time.Hour)),
		view("passed", EnrollmentPassed, TierAI, now),
		view("not-started", EnrollmentNotStarted, TierB2B, now),
		view("revision", EnrollmentRevisionRequested, TierB2B, now.Add(-time.Hour)),
		view("new-progress", EnrollmentInProgress, TierAI, now),
		view("payment", EnrollmentPendingPayment, TierB2B, now),
	}

	items := ActionItems(enrollments)

	ids := make([]string, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	assert.Equal(t, []string{"revision", "payment", "new-progress", "old-progress", "not-started"}, ids)
}

func TestHasPassedTier(t *testing.T) {
	now := time.Now()
	enrollments := []Enrollment{view("1", EnrollmentPassed, TierAI, now), view("2", EnrollmentFailed, TierB2B, now)}

	assert.True(t, HasPassedTier(enrollments, TierAI))
	assert.False(t, HasPassedTier(enrollments, TierB2B))
}

func TestRankRecommendations(t *testing.T) {
	candidates := []Case{
		{ID: "ai-marketing-popular", Tier: TierAI, FieldKey: "marketing", ParticipantCount: 900},
		{ID: "b2b-backend", Tier: TierB2B, FieldKey: "backend", ParticipantCount: 50},
		{ID: "ai-backend", Tier: TierAI, FieldKey: "backend", ParticipantCount: 100},
		{ID: "ai-data", Tier: TierAI, FieldKey: "data", ParticipantCount: 300},
	}

	tests := []struct {
		name       string
		fields     []string
		preferTier Tier
		want       []string
	}{
		{
			name: "new student: own field and AI tier first", fields: []string{"backend", "data"}, preferTier: TierAI,
			want: []string{"ai-data", "ai-backend", "b2b-backend"},
		},
		{
			name: "passed AI: B2B in own field first", fields: []string{"backend"}, preferTier: TierB2B,
			want: []string{"b2b-backend", "ai-backend", "ai-marketing-popular"},
		},
		{
			name: "no fields: tier then popularity", preferTier: TierAI,
			want: []string{"ai-marketing-popular", "ai-data", "ai-backend"},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := RankRecommendations(candidates, tc.fields, tc.preferTier, 3)
			ids := make([]string, 0, len(got))
			for _, item := range got {
				ids = append(ids, item.ID)
			}
			assert.Equal(t, tc.want, ids)
		})
	}
	assert.Equal(t, "ai-marketing-popular", candidates[0].ID, "input slice must not be reordered")
}

func TestRecommendedTier(t *testing.T) {
	assert.Equal(t, TierAI, RecommendedTier(false))
	assert.Equal(t, TierB2B, RecommendedTier(true))
}

func TestStringList(t *testing.T) {
	var list StringList
	require.NoError(t, list.Scan([]byte(`["a","b"]`)))
	assert.Equal(t, StringList{"a", "b"}, list)

	require.NoError(t, list.Scan(nil))
	assert.NotNil(t, list)
	assert.Empty(t, list)

	require.NoError(t, list.Scan("null"))
	assert.NotNil(t, list, "JSON null becomes an empty list")

	value, err := StringList(nil).Value()
	require.NoError(t, err)
	assert.Equal(t, "[]", value)

	assert.Error(t, list.Scan(42))
}

func TestEnrollment_CertificatePublicID(t *testing.T) {
	tests := []struct {
		name        string
		certificate *Certificate
		want        *string
	}{
		{name: "no certificate", certificate: nil, want: nil},
		{name: "issued certificate", certificate: &Certificate{PublicID: "SIM-1"}, want: ptr("SIM-1")},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			e := Enrollment{Certificate: tc.certificate}
			assert.Equal(t, tc.want, e.CertificatePublicID())
		})
	}
}

func TestCase_PartnerName(t *testing.T) {
	assert.Nil(t, (&Case{}).PartnerName(), "AI case has no partner")
	assert.Equal(t, ptr("Sagara Commerce"), (&Case{Partner: &Partner{Name: "Sagara Commerce"}}).PartnerName())
}

func ptr(s string) *string {
	return &s
}
