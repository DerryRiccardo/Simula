package admin

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const enrollmentID = "66666666-6666-6666-6666-666666666666"

type mockReviewRepo struct {
	mock.Mock
}

func (m *mockReviewRepo) ListRows(ctx context.Context, limit int) ([]entity.AdminReviewRow, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.AdminReviewRow), args.Error(1)
}

func (m *mockReviewRepo) GetRow(ctx context.Context, id string) (entity.AdminReviewRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.AdminReviewRow), args.Error(1)
}

func (m *mockReviewRepo) SetFlag(ctx context.Context, flag entity.ReviewFlag) error {
	return m.Called(ctx, flag).Error(0)
}

func (m *mockReviewRepo) ClearFlag(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}

func (m *mockReviewRepo) MarkReminded(ctx context.Context, id string, now time.Time) error {
	return m.Called(ctx, id, now).Error(0)
}

func (m *mockReviewRepo) Reassign(ctx context.Context, id, caseID, reviewer string, now time.Time) error {
	return m.Called(ctx, id, caseID, reviewer, now).Error(0)
}

func (m *mockReviewRepo) Regrade(ctx context.Context, id, submission string, run *entity.AIGradingRun, now time.Time) error {
	return m.Called(ctx, id, submission, run, now).Error(0)
}

// Mock lain hanya mengimplementasikan method yang dipakai use case.

type mockCaseRepo struct {
	coreRepo.CaseRepository
	mock.Mock
}

func (m *mockCaseRepo) GetWithBriefByID(ctx context.Context, id string) (entity.Case, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Case), args.Error(1)
}

func (m *mockCaseRepo) CountRubricCriteria(ctx context.Context, id string) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}

type mockSubmissionRepo struct {
	coreRepo.SubmissionRepository
	mock.Mock
}

func (m *mockSubmissionRepo) ListByEnrollment(ctx context.Context, id string) ([]entity.Submission, error) {
	args := m.Called(ctx, id)
	return args.Get(0).([]entity.Submission), args.Error(1)
}

type mockQueue struct {
	mock.Mock
}

func (m *mockQueue) EnqueueCriterion(ctx context.Context, runID string, position int) error {
	return m.Called(ctx, runID, position).Error(0)
}

func (m *mockQueue) EnqueueFeedback(ctx context.Context, runID string) error {
	return m.Called(ctx, runID).Error(0)
}

type reviewEnv struct {
	uc       ReviewUseCase
	reviews  *mockReviewRepo
	partners *mockPartnerRepo
	cases    *mockCaseRepo
	subs     *mockSubmissionRepo
	queue    *mockQueue
}

func newReviewEnv(withQueue bool) *reviewEnv {
	env := &reviewEnv{reviews: &mockReviewRepo{}, partners: &mockPartnerRepo{}, cases: &mockCaseRepo{}, subs: &mockSubmissionRepo{}, queue: &mockQueue{}}
	deps := ReviewDeps{
		Reviews: env.reviews, Partners: env.partners, Cases: env.cases, Submissions: env.subs,
		GradingModel: "fake-v1", Now: func() time.Time { return testNow },
	}
	if withQueue {
		deps.GradingQueue = env.queue
	}
	env.uc = InitReviewUseCase(deps)
	return env
}

// expectDetail menyiapkan data yang dimuat setiap kali detail dibangun.
func (env *reviewEnv) expectDetail(row entity.AdminReviewRow) {
	env.cases.On("GetWithBriefByID", mock.Anything, row.Enrollment.CaseID).Return(entity.Case{ID: row.Enrollment.CaseID}, nil)
	env.subs.On("ListByEnrollment", mock.Anything, row.Enrollment.ID).Return([]entity.Submission{}, nil)
}

func aiFailedRow() entity.AdminReviewRow {
	submittedAt := testNow.Add(-time.Hour)
	return entity.AdminReviewRow{
		Enrollment: entity.Enrollment{ID: enrollmentID, CaseID: caseOwned, Status: entity.EnrollmentFailed, Case: &entity.Case{ID: caseOwned, Tier: entity.TierAI}},
		Submission: &entity.Submission{ID: "sub-1", Status: entity.SubmissionReviewed, SubmittedAt: &submittedAt},
	}
}

func b2bPendingRow() entity.AdminReviewRow {
	pid := partnerID
	return entity.AdminReviewRow{
		Enrollment: entity.Enrollment{
			ID: enrollmentID, CaseID: caseOwned, Status: entity.EnrollmentInReview,
			Case: &entity.Case{ID: caseOwned, Tier: entity.TierB2B, PartnerID: &pid},
		},
		Holder:     &entity.ReviewerSummary{ID: reviewerID, Name: "Andika"},
		Submission: &entity.Submission{ID: "sub-1", Status: entity.SubmissionSubmitted},
	}
}

func asAdmin() context.Context {
	return authctx.WithUser(context.Background(), authctx.User{ID: "admin-1", Role: "admin"})
}

func TestListReviews_SortsAndSummarizes(t *testing.T) {
	env := newReviewEnv(false)
	older, newer := testNow.Add(-48*time.Hour), testNow.Add(-time.Hour)
	score60, score80 := 60, 80
	aiCase := &entity.Case{ID: "ai-1", Title: "Optimasi API", Tier: entity.TierAI}
	rows := []entity.AdminReviewRow{
		{Enrollment: entity.Enrollment{ID: "a", CaseID: "ai-1", Status: entity.EnrollmentFailed, Score: &score60, Case: aiCase},
			Submission: &entity.Submission{SubmittedAt: &older}, Flag: &entity.ReviewFlag{}},
		{Enrollment: entity.Enrollment{ID: "b", CaseID: "ai-1", Status: entity.EnrollmentPassed, Score: &score80, Case: aiCase},
			Submission: &entity.Submission{SubmittedAt: &newer}},
		{Enrollment: entity.Enrollment{ID: "c", CaseID: "ai-1", Status: entity.EnrollmentAIGrading, Case: aiCase},
			Submission: &entity.Submission{SubmittedAt: &older}},
	}
	env.reviews.On("ListRows", mock.Anything, entity.AdminReviewListLimit).Return(rows, nil)

	list, err := env.uc.ListReviews(context.Background())

	require.NoError(t, err)
	assert.Equal(t, "b", list.Rows[0].Enrollment.ID, "newest submit first")
	require.Len(t, list.AICaseStats, 1)
	stat := list.AICaseStats[0]
	assert.Equal(t, 2, stat.GradedCount, "still grading is not counted")
	assert.Equal(t, 1, stat.PassedCount)
	assert.Equal(t, 1, stat.FlaggedCount)
	require.NotNil(t, stat.AverageScore)
	assert.Equal(t, 70, *stat.AverageScore)
}

func TestRegrade(t *testing.T) {
	t.Run("restarts AI grading for a failed attempt", func(t *testing.T) {
		env := newReviewEnv(true)
		row := aiFailedRow()
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)
		env.cases.On("CountRubricCriteria", mock.Anything, caseOwned).Return(3, nil)
		var runID string
		env.reviews.On("Regrade", mock.Anything, enrollmentID, "sub-1", mock.MatchedBy(func(run *entity.AIGradingRun) bool {
			runID = run.ID
			return len(run.Criteria) == 3 && run.Model == "fake-v1" && run.Status == entity.AIGradingQueued
		}), testNow).Return(nil)
		env.queue.On("EnqueueCriterion", mock.Anything, mock.MatchedBy(func(id string) bool { return id == runID }), 1).Return(nil)
		env.expectDetail(row)
		env.partners.On("ListReviewers", mock.Anything).Return([]entity.ReviewerStat{}, nil).Maybe()

		_, err := env.uc.Regrade(context.Background(), enrollmentID)

		require.NoError(t, err)
		env.queue.AssertExpectations(t)
	})

	t.Run("passed attempts keep their certificate", func(t *testing.T) {
		env := newReviewEnv(true)
		row := aiFailedRow()
		row.Enrollment.Status = entity.EnrollmentPassed
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)

		_, err := env.uc.Regrade(context.Background(), enrollmentID)

		requireKind(t, err, apperror.KindConflict)
		env.reviews.AssertNotCalled(t, "Regrade", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("AI grading disabled", func(t *testing.T) {
		env := newReviewEnv(false)
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(aiFailedRow(), nil)

		_, err := env.uc.Regrade(context.Background(), enrollmentID)

		requireKind(t, err, apperror.KindConflict)
	})
}

func TestSetFlag(t *testing.T) {
	env := newReviewEnv(false)
	row := aiFailedRow()
	env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)

	_, err := env.uc.SetFlag(asAdmin(), enrollmentID, true, "pendek")
	appErr := requireKind(t, err, apperror.KindValidation)
	assert.Equal(t, []string{"note"}, fieldNames(appErr))

	env.reviews.On("SetFlag", mock.Anything, entity.ReviewFlag{
		EnrollmentID: enrollmentID, Note: "Skor kriteria 2 tidak sesuai rubrik.", FlaggedBy: "admin-1", FlaggedAt: testNow,
	}).Return(nil)
	env.expectDetail(row)
	_, err = env.uc.SetFlag(asAdmin(), enrollmentID, true, "  Skor kriteria 2 tidak sesuai rubrik.  ")
	require.NoError(t, err)

	env.reviews.On("ClearFlag", mock.Anything, enrollmentID).Return(nil)
	_, err = env.uc.SetFlag(asAdmin(), enrollmentID, false, "")
	require.NoError(t, err)
	env.reviews.AssertExpectations(t)
}

func TestRemindReviewer(t *testing.T) {
	t.Run("sends a reminder", func(t *testing.T) {
		env := newReviewEnv(false)
		row := b2bPendingRow()
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)
		env.reviews.On("MarkReminded", mock.Anything, enrollmentID, testNow).Return(nil)
		env.expectDetail(row)
		env.partners.On("ListReviewers", mock.Anything).Return([]entity.ReviewerStat{}, nil)

		_, err := env.uc.RemindReviewer(context.Background(), enrollmentID)

		require.NoError(t, err)
	})

	t.Run("cooldown", func(t *testing.T) {
		env := newReviewEnv(false)
		row := b2bPendingRow()
		recent := testNow.Add(-time.Hour)
		row.Enrollment.LastReminderAt = &recent
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)

		_, err := env.uc.RemindReviewer(context.Background(), enrollmentID)

		requireKind(t, err, apperror.KindConflict)
		env.reviews.AssertNotCalled(t, "MarkReminded", mock.Anything, mock.Anything, mock.Anything)
	})
}

func TestReassignReviewer(t *testing.T) {
	pid, other := partnerID, otherID
	reviewers := []entity.ReviewerStat{
		{ID: reviewerID, Name: "Andika", IsActive: true, PartnerID: pid, CaseIDs: []string{caseOwned}, PendingCount: 3},
		{ID: "r-busy", Name: "Budi", IsActive: true, PartnerID: pid, CaseIDs: []string{caseOwned}, PendingCount: 2},
		{ID: "r-free", Name: "Citra", IsActive: true, PartnerID: pid, PendingCount: 0},
		{ID: "r-off", Name: "Dewi", IsActive: false, PartnerID: pid},
		{ID: "r-other", Name: "Eka", IsActive: true, PartnerID: other},
	}

	t.Run("options exclude holder, inactive, and other partners", func(t *testing.T) {
		env := newReviewEnv(false)
		row := b2bPendingRow()
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)
		env.partners.On("ListReviewers", mock.Anything).Return(reviewers, nil)
		env.expectDetail(row)

		detail, err := env.uc.GetReview(context.Background(), enrollmentID)

		require.NoError(t, err)
		require.Len(t, detail.ReassignOptions, 2)
		assert.Equal(t, "r-free", detail.ReassignOptions[0].ID, "fewest pending first")
		assert.False(t, detail.ReassignOptions[0].IsAssignedToCase)
		assert.True(t, detail.ReassignOptions[1].IsAssignedToCase)
		assert.True(t, detail.CanRemind)
	})

	t.Run("moves to an allowed reviewer", func(t *testing.T) {
		env := newReviewEnv(false)
		row := b2bPendingRow()
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(row, nil)
		env.partners.On("ListReviewers", mock.Anything).Return(reviewers, nil)
		env.reviews.On("Reassign", mock.Anything, enrollmentID, caseOwned, "r-free", testNow).Return(nil)
		env.expectDetail(row)

		_, err := env.uc.ReassignReviewer(context.Background(), enrollmentID, "r-free")

		require.NoError(t, err)
		env.reviews.AssertExpectations(t)
	})

	t.Run("rejects a reviewer from another partner", func(t *testing.T) {
		env := newReviewEnv(false)
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(b2bPendingRow(), nil)
		env.partners.On("ListReviewers", mock.Anything).Return(reviewers, nil)

		_, err := env.uc.ReassignReviewer(context.Background(), enrollmentID, "r-other")

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"reviewerId"}, fieldNames(appErr))
	})

	t.Run("already decided", func(t *testing.T) {
		env := newReviewEnv(false)
		env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(b2bPendingRow(), nil)
		env.partners.On("ListReviewers", mock.Anything).Return(reviewers, nil)
		env.reviews.On("Reassign", mock.Anything, enrollmentID, caseOwned, "r-free", testNow).Return(coreErrors.ErrStatusConflict)

		_, err := env.uc.ReassignReviewer(context.Background(), enrollmentID, "r-free")

		requireKind(t, err, apperror.KindConflict)
	})
}

func TestGetReview_NotFound(t *testing.T) {
	env := newReviewEnv(false)
	env.reviews.On("GetRow", mock.Anything, enrollmentID).Return(entity.AdminReviewRow{}, coreErrors.ErrEnrollmentNotFound)

	_, err := env.uc.GetReview(context.Background(), enrollmentID)
	requireKind(t, err, apperror.KindNotFound)

	_, err = env.uc.GetReview(context.Background(), "bukan-uuid")
	requireKind(t, err, apperror.KindNotFound)
}
