package entity

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateScore(t *testing.T) {
	tests := []struct {
		name   string
		scores []ReviewCriterionScore
		want   int
	}{
		{
			// Contoh AI-CONTEXT.md §6.4: 24 + 20 + 20 + 12 = 76.
			name: "rubric example",
			scores: []ReviewCriterionScore{
				{Weight: 30, Level: 4}, {Weight: 25, Level: 4}, {Weight: 25, Level: 4}, {Weight: 20, Level: 3},
			},
			want: 76,
		},
		{name: "all max", scores: []ReviewCriterionScore{{Weight: 60, Level: 5}, {Weight: 40, Level: 5}}, want: 100},
		{name: "all min", scores: []ReviewCriterionScore{{Weight: 60, Level: 1}, {Weight: 40, Level: 1}}, want: 20},
		// 3/5 × 33 = 19,8 dan 4/5 × 67 = 53,6 → 73,4 dibulatkan 73.
		// Poin selalu kelipatan 0,2, jadi tidak pernah tepat ,5.
		// 3/5 × 33 = 19,8 dan 4/5 × 67 = 53,6 → 73,4 → 73.
		{name: "rounds down", scores: []ReviewCriterionScore{{Weight: 33, Level: 3}, {Weight: 67, Level: 4}}, want: 73},
		// 4/5 × 33 = 26,4 dan 3/5 × 67 = 40,2 → 66,6 → 67.
		{name: "rounds up", scores: []ReviewCriterionScore{{Weight: 33, Level: 4}, {Weight: 67, Level: 3}}, want: 67},
		{name: "exact points", scores: []ReviewCriterionScore{{Weight: 25, Level: 3}, {Weight: 75, Level: 4}}, want: 75},
		{name: "empty", scores: nil, want: 0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, CalculateScore(tc.scores))
		})
	}
}

func TestIsPassed(t *testing.T) {
	assert.True(t, IsPassed(70, 70))
	assert.False(t, IsPassed(69, 70))
}

func TestValidateCriterionVerdict(t *testing.T) {
	assert.NoError(t, ValidateCriterionVerdict(3, "Alasan yang jelas."))
	assert.Error(t, ValidateCriterionVerdict(0, "Alasan."))
	assert.Error(t, ValidateCriterionVerdict(6, "Alasan."))
	assert.Error(t, ValidateCriterionVerdict(3, "   "))
	assert.Error(t, ValidateCriterionVerdict(3, strings.Repeat("a", CriterionReasonMaxRunes+1)))
}

func TestValidateFeedback(t *testing.T) {
	valid := ReviewFeedback{Strengths: []string{"a"}, Improvements: []string{"b"}, NextSteps: []string{"c", "d"}}
	assert.NoError(t, ValidateFeedback(valid))

	empty := valid
	empty.Strengths = nil
	assert.Error(t, ValidateFeedback(empty))

	tooMany := valid
	tooMany.NextSteps = []string{"1", "2", "3", "4"}
	assert.Error(t, ValidateFeedback(tooMany))

	blank := valid
	blank.Improvements = []string{" "}
	assert.Error(t, ValidateFeedback(blank))
}

func TestCertificatePublicID(t *testing.T) {
	id := CertificatePublicID([]byte{0, 1, 31, 32, 255, 18, 10, 200})

	assert.Equal(t, "SIM-01Z0ZJA8", id)
	require.Len(t, id, len("SIM-")+CertificatePublicIDLength)
	for _, r := range id[len("SIM-"):] {
		assert.True(t, strings.ContainsRune(certificateAlphabet, r), "unexpected %q", r)
		assert.NotContains(t, "ILOU", string(r))
	}
}

func TestReviewerRoleFor(t *testing.T) {
	role := "Engineering Manager"
	assert.Equal(t, AIReviewerRole, ReviewerRoleFor(&Case{Tier: TierAI, ReviewerRole: &role}))
	assert.Equal(t, role, ReviewerRoleFor(&Case{Tier: TierB2B, ReviewerRole: &role}))
	assert.Equal(t, FallbackReviewerRole, ReviewerRoleFor(&Case{Tier: TierB2B}))
}

func TestEnrollmentCanRetry(t *testing.T) {
	failed := Enrollment{Status: EnrollmentFailed}
	assert.True(t, failed.CanRetry(TierAI))
	assert.True(t, failed.CanRetry(TierB2B))

	retried := Enrollment{Status: EnrollmentFailed, RetryCount: B2BMaxRetries}
	assert.True(t, retried.CanRetry(TierAI), "AI case can be retried without limit")
	assert.False(t, retried.CanRetry(TierB2B))

	passed := Enrollment{Status: EnrollmentPassed}
	assert.False(t, passed.CanRetry(TierAI))
}

func TestRetryDeadline(t *testing.T) {
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)
	assert.Nil(t, RetryDeadline(TierAI, now))

	deadline := RetryDeadline(TierB2B, now)
	require.NotNil(t, deadline)
	days := B2BRetryDeadlineDays
	assert.Equal(t, *WorkDeadline(now, &days), *deadline)
}

func TestAIGradingRun(t *testing.T) {
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)
	run := NewAIGradingRun("run-1", "sub-1", "fake-v1", []string{"c1", "c2", "c3"}, now)

	require.Len(t, run.Criteria, 3)
	assert.Equal(t, AIGradingQueued, run.Status)
	assert.Equal(t, []int{1, 2, 3}, []int{run.Criteria[0].CriterionPosition, run.Criteria[1].CriterionPosition, run.Criteria[2].CriterionPosition})
	assert.Equal(t, now.Add(4*AIGradingEstimatePerCriterion), run.EstimatedDoneAt)
	assert.Equal(t, 1, run.NextPendingPosition())
	assert.False(t, run.IsFinished())

	run.Criteria[0].Status = AIGradingCriterionDone
	run.Criteria[2].Status = AIGradingCriterionDone
	assert.Equal(t, 2, run.CheckedCriteria())
	assert.Equal(t, 2, run.NextPendingPosition())
	assert.Equal(t, 2, run.Progress().CheckedCriteria)

	run.Criteria[1].Status = AIGradingCriterionDone
	assert.Equal(t, 0, run.NextPendingPosition())

	run.Status = AIGradingFailed
	assert.True(t, run.IsFinished())
}
