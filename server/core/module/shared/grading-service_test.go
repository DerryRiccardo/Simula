package shared

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

var testNow = time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)

const (
	runID   = "run-1"
	caseID  = "case-1"
	subID   = "sub-1"
	enrolID = "enrollment-1"
)

type mockGradingRepo struct {
	mock.Mock
}

func (m *mockGradingRepo) LoadJob(ctx context.Context, id string) (entity.GradingJob, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.GradingJob), args.Error(1)
}

func (m *mockGradingRepo) GetRunBySubmission(ctx context.Context, submissionID string) (entity.AIGradingRun, error) {
	args := m.Called(ctx, submissionID)
	return args.Get(0).(entity.AIGradingRun), args.Error(1)
}

func (m *mockGradingRepo) SaveCriterionResult(ctx context.Context, criterionID string, verdict entity.CriterionVerdict, now time.Time) error {
	return m.Called(ctx, criterionID, verdict, now).Error(0)
}

func (m *mockGradingRepo) ListStalled(ctx context.Context, before time.Time, limit int) ([]entity.AIGradingRun, error) {
	args := m.Called(ctx, before, limit)
	return args.Get(0).([]entity.AIGradingRun), args.Error(1)
}

func (m *mockGradingRepo) ListUngraded(ctx context.Context, limit int) ([]entity.UngradedSubmission, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.UngradedSubmission), args.Error(1)
}

func (m *mockGradingRepo) CreateRun(ctx context.Context, run *entity.AIGradingRun) (bool, error) {
	args := m.Called(ctx, run)
	return args.Bool(0), args.Error(1)
}

func (m *mockCaseRepo) CountRubricCriteria(ctx context.Context, id string) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}

func (m *mockGradingRepo) Fail(ctx context.Context, id, message string, now time.Time) error {
	return m.Called(ctx, id, message, now).Error(0)
}

// mockCaseRepo hanya mengimplementasikan method yang dipakai GradingService.
type mockCaseRepo struct {
	coreRepo.CaseRepository
	mock.Mock
}

func (m *mockCaseRepo) GetWithBriefByID(ctx context.Context, id string) (entity.Case, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Case), args.Error(1)
}

type mockLLM struct {
	mock.Mock
}

func (m *mockLLM) Model() string { return "test" }

func (m *mockLLM) EvaluateCriterion(ctx context.Context, in entity.CriterionEvaluation) (entity.CriterionVerdict, error) {
	args := m.Called(ctx, in)
	return args.Get(0).(entity.CriterionVerdict), args.Error(1)
}

func (m *mockLLM) ComposeFeedback(ctx context.Context, in entity.FeedbackRequest) (entity.ReviewFeedback, error) {
	args := m.Called(ctx, in)
	return args.Get(0).(entity.ReviewFeedback), args.Error(1)
}

type mockQueue struct {
	mock.Mock
}

func (m *mockQueue) EnqueueCriterion(ctx context.Context, id string, position int) error {
	return m.Called(ctx, id, position).Error(0)
}

func (m *mockQueue) EnqueueFeedback(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}

type gradingEnv struct {
	svc      *GradingService
	grading  *mockGradingRepo
	cases    *mockCaseRepo
	llm      *mockLLM
	queue    *mockQueue
	outcomes []entity.ReviewOutcome
}

func newGradingEnv() *gradingEnv {
	env := &gradingEnv{grading: &mockGradingRepo{}, cases: &mockCaseRepo{}, llm: &mockLLM{}, queue: &mockQueue{}}
	env.svc = NewGradingService(GradingDeps{
		Grading: env.grading, Cases: env.cases, LLM: env.llm, Queue: env.queue,
		OnReviewed: func(_ context.Context, outcome entity.ReviewOutcome) error {
			env.outcomes = append(env.outcomes, outcome)
			return nil
		},
		Now: func() time.Time { return testNow },
	})
	return env
}

func (env *gradingEnv) assertExpectations(t *testing.T) {
	t.Helper()
	env.grading.AssertExpectations(t)
	env.cases.AssertExpectations(t)
	env.llm.AssertExpectations(t)
	env.queue.AssertExpectations(t)
}

func gradingCase() entity.Case {
	return entity.Case{
		ID: caseID, Tier: entity.TierAI, PassingScore: 70,
		Rubric: []entity.RubricCriterion{
			{Position: 1, Name: "Analisis", Weight: 60},
			{Position: 2, Name: "Dokumentasi", Weight: 40},
		},
	}
}

// job menyiapkan run dua kriteria; levels berisi level kriteria yang sudah dinilai (0 = pending).
func job(levels ...int) entity.GradingJob {
	run := entity.NewAIGradingRun(runID, subID, "test", []string{"c1", "c2"}, testNow)
	for i, level := range levels {
		if level > 0 {
			run.Criteria[i].Status = entity.AIGradingCriterionDone
			run.Criteria[i].Level = &level
			run.Criteria[i].Reason = "alasan"
		}
	}
	return entity.GradingJob{
		Run:        run,
		Submission: entity.Submission{ID: subID},
		Enrollment: entity.Enrollment{ID: enrolID, CaseID: caseID},
	}
}

func TestEvaluateCriterion(t *testing.T) {
	t.Run("saves the verdict and queues the next criterion", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(), nil)
		env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(gradingCase(), nil)
		verdict := entity.CriterionVerdict{Level: 4, Reason: "Analisis runtut."}
		env.llm.On("EvaluateCriterion", mock.Anything, mock.MatchedBy(func(in entity.CriterionEvaluation) bool {
			return in.Criterion.Name == "Analisis"
		})).Return(verdict, nil)
		env.grading.On("SaveCriterionResult", mock.Anything, "c1", verdict, testNow).Return(nil)
		env.queue.On("EnqueueCriterion", mock.Anything, runID, 2).Return(nil)

		require.NoError(t, env.svc.EvaluateCriterion(context.Background(), runID, 1))
		env.assertExpectations(t)
	})

	t.Run("last criterion queues feedback", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(4), nil)
		env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(gradingCase(), nil)
		verdict := entity.CriterionVerdict{Level: 3, Reason: "Cukup."}
		env.llm.On("EvaluateCriterion", mock.Anything, mock.Anything).Return(verdict, nil)
		env.grading.On("SaveCriterionResult", mock.Anything, "c2", verdict, testNow).Return(nil)
		env.queue.On("EnqueueFeedback", mock.Anything, runID).Return(nil)

		require.NoError(t, env.svc.EvaluateCriterion(context.Background(), runID, 2))
		env.assertExpectations(t)
	})

	t.Run("repeated task skips the LLM", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(4), nil)
		env.queue.On("EnqueueCriterion", mock.Anything, runID, 2).Return(nil)

		require.NoError(t, env.svc.EvaluateCriterion(context.Background(), runID, 1))
		env.llm.AssertNotCalled(t, "EvaluateCriterion", mock.Anything, mock.Anything)
		env.assertExpectations(t)
	})

	t.Run("invalid verdict is retried, not saved", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(), nil)
		env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(gradingCase(), nil)
		env.llm.On("EvaluateCriterion", mock.Anything, mock.Anything).Return(entity.CriterionVerdict{Level: 9, Reason: "x"}, nil)

		assert.Error(t, env.svc.EvaluateCriterion(context.Background(), runID, 1))
		env.grading.AssertNotCalled(t, "SaveCriterionResult", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("finished or missing run is ignored", func(t *testing.T) {
		env := newGradingEnv()
		done := job(4, 3)
		done.Run.Status = entity.AIGradingDone
		env.grading.On("LoadJob", mock.Anything, runID).Return(done, nil).Once()
		env.grading.On("LoadJob", mock.Anything, "gone").Return(entity.GradingJob{}, coreErrors.ErrGradingRunNotFound).Once()

		assert.NoError(t, env.svc.EvaluateCriterion(context.Background(), runID, 1))
		assert.NoError(t, env.svc.EvaluateCriterion(context.Background(), "gone", 1))
		env.assertExpectations(t)
	})
}

func TestComposeFeedback(t *testing.T) {
	feedback := entity.ReviewFeedback{Strengths: []string{"a"}, Improvements: []string{"b"}, NextSteps: []string{"c"}}

	t.Run("passes scores copied from the rubric to OnReviewed", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(4, 3), nil)
		env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(gradingCase(), nil)
		env.llm.On("ComposeFeedback", mock.Anything, mock.Anything).Return(feedback, nil)

		require.NoError(t, env.svc.ComposeFeedback(context.Background(), runID))

		require.Len(t, env.outcomes, 1)
		outcome := env.outcomes[0]
		assert.Equal(t, entity.ReviewerAI, outcome.ReviewerType)
		assert.Equal(t, entity.AIReviewerRole, outcome.ReviewerRole)
		assert.Equal(t, enrolID, outcome.EnrollmentID)
		require.NotNil(t, outcome.GradingRunID)
		assert.Equal(t, runID, *outcome.GradingRunID)
		require.Len(t, outcome.Scores, 2)
		assert.Equal(t, entity.ReviewCriterionScore{Position: 1, Name: "Analisis", Weight: 60, Level: 4, Reason: "alasan"}, outcome.Scores[0])
		// 4/5 × 60 + 3/5 × 40 = 72.
		assert.Equal(t, 72, entity.CalculateScore(outcome.Scores))
		env.assertExpectations(t)
	})

	t.Run("pending criterion is queued first", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(4), nil)
		env.queue.On("EnqueueCriterion", mock.Anything, runID, 2).Return(nil)

		require.NoError(t, env.svc.ComposeFeedback(context.Background(), runID))
		assert.Empty(t, env.outcomes)
		env.assertExpectations(t)
	})

	t.Run("invalid feedback is retried", func(t *testing.T) {
		env := newGradingEnv()
		env.grading.On("LoadJob", mock.Anything, runID).Return(job(4, 3), nil)
		env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(gradingCase(), nil)
		env.llm.On("ComposeFeedback", mock.Anything, mock.Anything).Return(entity.ReviewFeedback{}, nil)

		assert.Error(t, env.svc.ComposeFeedback(context.Background(), runID))
		assert.Empty(t, env.outcomes)
	})
}

func TestFailRun(t *testing.T) {
	env := newGradingEnv()
	env.grading.On("Fail", mock.Anything, runID, "llm unavailable", testNow).Return(nil)

	require.NoError(t, env.svc.FailRun(context.Background(), runID, errors.New("llm unavailable")))
	env.assertExpectations(t)
}

func TestResumeStalled(t *testing.T) {
	env := newGradingEnv()
	pending := job(4).Run
	pending.ID = "run-pending"
	complete := job(4, 3).Run
	complete.ID = "run-complete"
	broken := job().Run
	broken.ID = "run-broken"
	env.grading.On("ListUngraded", mock.Anything, entity.AIGradingStalledBatch).Return([]entity.UngradedSubmission{}, nil)
	env.grading.On("ListStalled", mock.Anything, testNow.Add(-entity.AIGradingStallAfter), entity.AIGradingStalledBatch).
		Return([]entity.AIGradingRun{pending, complete, broken}, nil)
	env.queue.On("EnqueueCriterion", mock.Anything, "run-pending", 2).Return(nil)
	env.queue.On("EnqueueFeedback", mock.Anything, "run-complete").Return(nil)
	env.queue.On("EnqueueCriterion", mock.Anything, "run-broken", 1).Return(errors.New("redis down"))

	resumed, err := env.svc.ResumeStalled(context.Background())

	require.NoError(t, err)
	assert.Equal(t, 2, resumed)
	env.assertExpectations(t)
}

func TestResumeStalled_StartsSubmissionsWithoutRun(t *testing.T) {
	env := newGradingEnv()
	env.grading.On("ListUngraded", mock.Anything, entity.AIGradingStalledBatch).Return([]entity.UngradedSubmission{
		{SubmissionID: "sub-new", CaseID: caseID},
		{SubmissionID: "sub-raced", CaseID: caseID},
	}, nil)
	env.cases.On("CountRubricCriteria", mock.Anything, caseID).Return(2, nil)
	var newRunID string
	env.grading.On("CreateRun", mock.Anything, mock.MatchedBy(func(run *entity.AIGradingRun) bool {
		return run.SubmissionID == "sub-new"
	})).Run(func(args mock.Arguments) {
		run := args.Get(1).(*entity.AIGradingRun)
		newRunID = run.ID
		assert.Len(t, run.Criteria, 2)
		assert.Equal(t, "test", run.Model)
		assert.Equal(t, entity.AIGradingQueued, run.Status)
	}).Return(true, nil)
	// Run sudah dibuat proses lain: tidak diantrekan dua kali.
	env.grading.On("CreateRun", mock.Anything, mock.MatchedBy(func(run *entity.AIGradingRun) bool {
		return run.SubmissionID == "sub-raced"
	})).Return(false, nil)
	env.queue.On("EnqueueCriterion", mock.Anything, mock.MatchedBy(func(id string) bool { return id == newRunID }), 1).Return(nil)
	env.grading.On("ListStalled", mock.Anything, mock.Anything, mock.Anything).Return([]entity.AIGradingRun{}, nil)

	resumed, err := env.svc.ResumeStalled(context.Background())

	require.NoError(t, err)
	assert.Equal(t, 1, resumed)
	env.queue.AssertNumberOfCalls(t, "EnqueueCriterion", 1)
	env.assertExpectations(t)
}
