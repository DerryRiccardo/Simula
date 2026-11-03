package hook

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
)

var testNow = time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)

// Mock hanya mengimplementasikan method yang dipakai ReviewHook.

type mockEnrollmentRepo struct {
	coreRepo.EnrollmentRepository
	mock.Mock
}

func (m *mockEnrollmentRepo) GetByIDWithCase(ctx context.Context, id string) (entity.Enrollment, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

type mockUserRepo struct {
	coreRepo.UserRepository
	mock.Mock
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (entity.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.User), args.Error(1)
}

type mockReviewRepo struct {
	mock.Mock
}

func (m *mockReviewRepo) Finalize(ctx context.Context, finalization entity.ReviewFinalization) error {
	return m.Called(ctx, finalization).Error(0)
}

func (m *mockReviewRepo) GetBySubmission(ctx context.Context, submissionID string) (entity.Review, error) {
	args := m.Called(ctx, submissionID)
	return args.Get(0).(entity.Review), args.Error(1)
}

type hookEnv struct {
	hook        *ReviewHook
	enrollments *mockEnrollmentRepo
	users       *mockUserRepo
	reviews     *mockReviewRepo
}

func newHookEnv() *hookEnv {
	env := &hookEnv{enrollments: &mockEnrollmentRepo{}, users: &mockUserRepo{}, reviews: &mockReviewRepo{}}
	env.hook = NewReviewHook(ReviewHookDeps{
		Enrollments: env.enrollments, Users: env.users, Reviews: env.reviews,
		RandomBytes: func(n int) ([]byte, error) { return make([]byte, n), nil },
		Now:         func() time.Time { return testNow },
	})
	return env
}

func aiEnrollment() entity.Enrollment {
	return entity.Enrollment{
		ID: "enrollment-1", UserID: "user-1", CaseID: "case-1", Status: entity.EnrollmentAIGrading,
		Case: &entity.Case{ID: "case-1", Title: "Optimasi API", FieldKey: "backend", Tier: entity.TierAI, PassingScore: 70},
	}
}

func outcome(levels ...int) entity.ReviewOutcome {
	runID := "run-1"
	scores := make([]entity.ReviewCriterionScore, 0, len(levels))
	for i, level := range levels {
		scores = append(scores, entity.ReviewCriterionScore{Position: i + 1, Name: "K", Weight: 100 / len(levels), Level: level, Reason: "r"})
	}
	return entity.ReviewOutcome{
		EnrollmentID: "enrollment-1", SubmissionID: "sub-1", ReviewerType: entity.ReviewerAI,
		ReviewerRole: entity.AIReviewerRole, Scores: scores, IsRecommended: true, GradingRunID: &runID,
		Feedback: entity.ReviewFeedback{Strengths: []string{"a"}, Improvements: []string{"b"}, NextSteps: []string{"c"}},
	}
}

func TestOnReviewed_PassIssuesCertificate(t *testing.T) {
	env := newHookEnv()
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(aiEnrollment(), nil)
	env.users.On("GetByID", mock.Anything, "user-1").Return(entity.User{ID: "user-1", Name: "Rani"}, nil)
	var got entity.ReviewFinalization
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		got = args.Get(1).(entity.ReviewFinalization)
	}).Return(nil)

	require.NoError(t, env.hook.OnReviewed(context.Background(), outcome(4, 4)))

	assert.Equal(t, []entity.EnrollmentStatus{entity.EnrollmentAIGrading}, got.From)
	assert.Equal(t, entity.EnrollmentPassed, got.To)
	assert.Equal(t, 80, got.Review.TotalScore)
	assert.True(t, got.Review.IsPassed)
	assert.True(t, got.Review.IsRecommended)
	assert.Equal(t, 70, got.Review.PassingScore)
	for _, score := range got.Review.Scores {
		assert.NotEmpty(t, score.ID)
	}
	require.NotNil(t, got.Certificate)
	assert.Equal(t, "SIM-00000000", got.Certificate.PublicID)
	assert.Equal(t, "Rani", got.Certificate.RecipientName)
	assert.Equal(t, 80, got.Certificate.Score)
	assert.Nil(t, got.Certificate.PartnerName)
	require.NotNil(t, got.GradingRunID)
	assert.Equal(t, "run-1", *got.GradingRunID)
}

func TestOnReviewed_FailHasNoCertificate(t *testing.T) {
	env := newHookEnv()
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(aiEnrollment(), nil)
	var got entity.ReviewFinalization
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		got = args.Get(1).(entity.ReviewFinalization)
	}).Return(nil)

	require.NoError(t, env.hook.OnReviewed(context.Background(), outcome(3, 3)))

	assert.Equal(t, entity.EnrollmentFailed, got.To)
	assert.Equal(t, 60, got.Review.TotalScore)
	assert.False(t, got.Review.IsRecommended, "a failed attempt is never recommended")
	assert.Nil(t, got.Certificate)
	env.users.AssertNotCalled(t, "GetByID", mock.Anything, mock.Anything)
}

func TestOnReviewed_AlreadyFinalizedIsIgnored(t *testing.T) {
	env := newHookEnv()
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(aiEnrollment(), nil)
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Return(coreErrors.ErrStatusConflict)

	assert.NoError(t, env.hook.OnReviewed(context.Background(), outcome(2, 2)))
}

func TestOnReviewed_B2BWaitsForInReview(t *testing.T) {
	env := newHookEnv()
	enrollment := aiEnrollment()
	partner := "PT Mitra"
	enrollment.Case.Tier = entity.TierB2B
	enrollment.Case.Partner = &entity.Partner{Name: partner}
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(enrollment, nil)
	env.users.On("GetByID", mock.Anything, "user-1").Return(entity.User{ID: "user-1", Name: "Rani"}, nil)
	var got entity.ReviewFinalization
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		got = args.Get(1).(entity.ReviewFinalization)
	}).Return(nil)

	require.NoError(t, env.hook.OnReviewed(context.Background(), outcome(5, 5)))

	assert.Equal(t, []entity.EnrollmentStatus{entity.EnrollmentInReview}, got.From)
	require.NotNil(t, got.Certificate)
	require.NotNil(t, got.Certificate.PartnerName)
	assert.Equal(t, partner, *got.Certificate.PartnerName)
}

func TestOnReviewed_HumanReviewLocksReviewerAndAsksConsent(t *testing.T) {
	env := newHookEnv()
	enrollment := aiEnrollment()
	enrollment.Case.Tier = entity.TierB2B
	enrollment.Case.Partner = &entity.Partner{Name: "PT Mitra"}
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(enrollment, nil)
	env.users.On("GetByID", mock.Anything, "user-1").
		Return(entity.User{ID: "user-1", Name: "Rani", ShareDefault: entity.ShareDefaultAsk}, nil)
	var got entity.ReviewFinalization
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		got = args.Get(1).(entity.ReviewFinalization)
	}).Return(nil)
	review := outcome(5, 4)
	reviewerID := "reviewer-1"
	review.ReviewerType = entity.ReviewerHuman
	review.ReviewerID = &reviewerID
	review.GradingRunID = nil

	require.NoError(t, env.hook.OnReviewed(context.Background(), review))

	require.NotNil(t, got.ReviewerID)
	assert.Equal(t, reviewerID, *got.ReviewerID)
	require.NotNil(t, got.ShareConsent)
	assert.Equal(t, entity.ShareConsentPending, *got.ShareConsent)
	assert.Nil(t, got.GradingRunID)
}

func TestOnReviewed_NotRecommendedHasNoConsent(t *testing.T) {
	env := newHookEnv()
	env.enrollments.On("GetByIDWithCase", mock.Anything, "enrollment-1").Return(aiEnrollment(), nil)
	env.users.On("GetByID", mock.Anything, "user-1").Return(entity.User{ID: "user-1", Name: "Rani"}, nil)
	var got entity.ReviewFinalization
	env.reviews.On("Finalize", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		got = args.Get(1).(entity.ReviewFinalization)
	}).Return(nil)
	review := outcome(5, 5)
	review.IsRecommended = false

	require.NoError(t, env.hook.OnReviewed(context.Background(), review))

	assert.Nil(t, got.ShareConsent)
}
