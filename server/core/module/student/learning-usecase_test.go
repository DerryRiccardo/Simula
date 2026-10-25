package student

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
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

const (
	studentID  = "user-student"
	aiCaseID   = "11111111-1111-1111-1111-111111111111"
	b2bCaseID  = "22222222-2222-2222-2222-222222222222"
	draftCase  = "33333333-3333-3333-3333-333333333333"
	unknownID  = "44444444-4444-4444-4444-444444444444"
	studentCtx = "student"
)

var testNow = time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)

type learningEnv struct {
	uc           LearningUseCase
	users        *mockUserRepo
	cases        *mockCaseRepo
	enrollments  *mockEnrollmentRepo
	certificates *mockCertificateRepo
	candidates   []int
}

func newLearningEnv() *learningEnv {
	env := &learningEnv{
		users:        &mockUserRepo{},
		cases:        &mockCaseRepo{},
		enrollments:  &mockEnrollmentRepo{},
		certificates: &mockCertificateRepo{},
		candidates:   []int{1001, 1002, 1003, 1004, 1005, 1006},
	}
	env.uc = InitLearningUseCase(LearningDeps{
		Users:        env.users,
		Cases:        env.cases,
		Enrollments:  env.enrollments,
		Certificates: env.certificates,
		Now:          func() time.Time { return testNow },
		CandidateNumber: func() int {
			next := env.candidates[0]
			env.candidates = env.candidates[1:]
			return next
		},
	})
	return env
}

func (env *learningEnv) assertExpectations(t *testing.T) {
	t.Helper()
	env.users.AssertExpectations(t)
	env.cases.AssertExpectations(t)
	env.enrollments.AssertExpectations(t)
	env.certificates.AssertExpectations(t)
}

func (env *learningEnv) expectStudent() {
	env.users.On("GetByID", mock.Anything, studentID).Return(entity.User{
		ID:     studentID,
		Role:   entity.RoleStudent,
		Fields: []entity.UserField{{FieldKey: "backend", Position: 1}},
	}, nil)
}

func asStudent() context.Context {
	return authctx.WithUser(context.Background(), authctx.User{ID: studentID, Role: studentCtx})
}

func requireKind(t *testing.T, err error, kind apperror.Kind) *apperror.Error {
	t.Helper()
	var appErr *apperror.Error
	require.ErrorAs(t, err, &appErr)
	assert.Equal(t, kind, appErr.Kind)
	return appErr
}

func publishedCase(id string, tier entity.Tier) entity.Case {
	return entity.Case{ID: id, Tier: tier, Status: entity.CaseStatusPublished, FieldKey: "backend"}
}

func TestListCases(t *testing.T) {
	t.Run("guest gets defaults without personalization", func(t *testing.T) {
		env := newLearningEnv()
		env.cases.On("ListPublished", mock.Anything,
			coreRepo.CaseFilter{Sort: entity.CaseSortRelevance},
			mock.AnythingOfType("*pagination.Pagination"),
		).Return([]entity.Case{publishedCase(aiCaseID, entity.TierAI), publishedCase(b2bCaseID, entity.TierB2B)}, int64(2), nil)

		page, err := env.uc.ListCases(context.Background(), CaseListInput{ExcludeEnrolled: true})

		require.NoError(t, err)
		assert.Len(t, page.Cases, 2)
		assert.Equal(t, 1, page.Meta.Page)
		assert.Equal(t, int64(2), page.Meta.TotalItems)
		env.assertExpectations(t)
	})

	t.Run("logged-in student gets own fields and exclusion", func(t *testing.T) {
		env := newLearningEnv()
		env.expectStudent()
		env.cases.On("ListPublished", mock.Anything,
			coreRepo.CaseFilter{Search: "api", ExcludeUserID: studentID, Sort: entity.CaseSortRelevance, UserFields: []string{"backend"}},
			mock.MatchedBy(func(p *paginationPkg.Pagination) bool { return p.Limit == 24 }),
		).Return([]entity.Case{}, int64(0), nil)

		_, err := env.uc.ListCases(asStudent(), CaseListInput{ExcludeEnrolled: true, Search: "  api  ", Limit: 24})

		require.NoError(t, err)
		env.assertExpectations(t)
	})

	t.Run("invalid enum values", func(t *testing.T) {
		env := newLearningEnv()

		_, err := env.uc.ListCases(context.Background(), CaseListInput{Tier: "premium", Level: "expert", Sort: "random"})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Len(t, appErr.Fields, 3)
		env.cases.AssertNotCalled(t, "ListPublished", mock.Anything, mock.Anything, mock.Anything)
	})
}

func TestGetCase(t *testing.T) {
	env := newLearningEnv()
	detail := publishedCase(aiCaseID, entity.TierAI)
	detail.Slug = "optimasi-api"
	env.cases.On("GetPublishedBySlug", mock.Anything, "optimasi-api").Return(detail, nil)
	env.cases.On("GetPublishedBySlug", mock.Anything, "tidak-ada").Return(entity.Case{}, coreErrors.ErrCaseNotFound)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).
		Return(entity.Enrollment{ID: "e1", UserID: studentID, CaseID: aiCaseID, Status: entity.EnrollmentInProgress}, nil).Once()

	result, err := env.uc.GetCase(asStudent(), "optimasi-api")
	require.NoError(t, err)
	require.NotNil(t, result.MyEnrollmentStatus)
	assert.Equal(t, entity.EnrollmentInProgress, *result.MyEnrollmentStatus)

	guest, err := env.uc.GetCase(context.Background(), "optimasi-api")
	require.NoError(t, err)
	assert.Nil(t, guest.MyEnrollmentStatus)

	_, err = env.uc.GetCase(context.Background(), "tidak-ada")
	requireKind(t, err, apperror.KindNotFound)

	env.assertExpectations(t)
}

func TestStartCase(t *testing.T) {
	tests := []struct {
		name       string
		caseID     string
		ctx        context.Context
		lookupCase bool
		wantKind   apperror.Kind
	}{
		{name: "starts AI case", caseID: aiCaseID, ctx: asStudent(), lookupCase: true},
		{name: "B2B must go through checkout", caseID: b2bCaseID, ctx: asStudent(), lookupCase: true, wantKind: apperror.KindConflict},
		{name: "draft case is hidden", caseID: draftCase, ctx: asStudent(), lookupCase: true, wantKind: apperror.KindNotFound},
		{name: "unknown case", caseID: unknownID, ctx: asStudent(), lookupCase: true, wantKind: apperror.KindNotFound},
		{name: "malformed id", caseID: "c-ai-optimasi-api", ctx: asStudent(), wantKind: apperror.KindNotFound},
		{name: "not logged in", caseID: aiCaseID, ctx: context.Background(), wantKind: apperror.KindUnauthenticated},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newLearningEnv()
			if tc.lookupCase {
				env.cases.On("GetByID", mock.Anything, aiCaseID).Return(publishedCase(aiCaseID, entity.TierAI), nil).Maybe()
				env.cases.On("GetByID", mock.Anything, b2bCaseID).Return(publishedCase(b2bCaseID, entity.TierB2B), nil).Maybe()
				env.cases.On("GetByID", mock.Anything, draftCase).
					Return(entity.Case{ID: draftCase, Tier: entity.TierAI, Status: entity.CaseStatusDraft}, nil).Maybe()
				env.cases.On("GetByID", mock.Anything, unknownID).Return(entity.Case{}, coreErrors.ErrCaseNotFound).Maybe()
			}
			if tc.wantKind == "" {
				env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).
					Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound).Once()
				env.enrollments.On("Create", mock.Anything, mock.MatchedBy(func(e *entity.Enrollment) bool {
					return e.UserID == studentID && e.CaseID == aiCaseID && e.Status == entity.EnrollmentInProgress &&
						e.CandidateNumber == 1001 && e.StartedAt != nil && e.DeadlineAt == nil
				})).Return(nil).Once()
				env.enrollments.On("GetForUser", mock.Anything, studentID, mock.AnythingOfType("string")).
					Return(entity.Enrollment{ID: "e1", Status: entity.EnrollmentInProgress}, nil).Once()
			}

			enrollment, err := env.uc.StartCase(tc.ctx, tc.caseID)

			if tc.wantKind != "" {
				requireKind(t, err, tc.wantKind)
				env.enrollments.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, entity.EnrollmentInProgress, enrollment.Status)
			env.assertExpectations(t)
		})
	}
}

func TestStartCase_IsIdempotent(t *testing.T) {
	env := newLearningEnv()
	existing := entity.Enrollment{ID: "e1", UserID: studentID, CaseID: aiCaseID, Status: entity.EnrollmentInProgress}
	env.cases.On("GetByID", mock.Anything, aiCaseID).Return(publishedCase(aiCaseID, entity.TierAI), nil)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).Return(existing, nil)
	env.enrollments.On("GetForUser", mock.Anything, studentID, "e1").Return(existing, nil)

	first, err := env.uc.StartCase(asStudent(), aiCaseID)
	require.NoError(t, err)
	second, err := env.uc.StartCase(asStudent(), aiCaseID)
	require.NoError(t, err)

	assert.Equal(t, first.ID, second.ID)
	env.enrollments.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestStartCase_RetriesCandidateCollision(t *testing.T) {
	env := newLearningEnv()
	env.cases.On("GetByID", mock.Anything, aiCaseID).Return(publishedCase(aiCaseID, entity.TierAI), nil)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
	env.enrollments.On("Create", mock.Anything, mock.MatchedBy(func(e *entity.Enrollment) bool { return e.CandidateNumber < 1003 })).
		Return(coreErrors.ErrCandidateNumberTaken).Twice()
	env.enrollments.On("Create", mock.Anything, mock.MatchedBy(func(e *entity.Enrollment) bool { return e.CandidateNumber == 1003 })).
		Return(nil).Once()
	env.enrollments.On("GetForUser", mock.Anything, studentID, mock.AnythingOfType("string")).Return(entity.Enrollment{ID: "e1"}, nil)

	_, err := env.uc.StartCase(asStudent(), aiCaseID)

	require.NoError(t, err)
	env.enrollments.AssertNumberOfCalls(t, "Create", 3)
	env.assertExpectations(t)
}

func TestStartCase_GivesUpAfterTooManyCollisions(t *testing.T) {
	env := newLearningEnv()
	env.cases.On("GetByID", mock.Anything, aiCaseID).Return(publishedCase(aiCaseID, entity.TierAI), nil)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
	env.enrollments.On("Create", mock.Anything, mock.Anything).Return(coreErrors.ErrCandidateNumberTaken)

	_, err := env.uc.StartCase(asStudent(), aiCaseID)

	requireKind(t, err, apperror.KindInternal)
	env.enrollments.AssertNumberOfCalls(t, "Create", entity.CandidateNumberAttempts)
}

func TestStartCase_ConcurrentRequestReusesEnrollment(t *testing.T) {
	env := newLearningEnv()
	other := entity.Enrollment{ID: "other-request", UserID: studentID, CaseID: aiCaseID, Status: entity.EnrollmentInProgress}
	env.cases.On("GetByID", mock.Anything, aiCaseID).Return(publishedCase(aiCaseID, entity.TierAI), nil)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound).Once()
	env.enrollments.On("Create", mock.Anything, mock.Anything).Return(coreErrors.ErrEnrollmentExists).Once()
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, aiCaseID).Return(other, nil).Once()
	env.enrollments.On("GetForUser", mock.Anything, studentID, "other-request").Return(other, nil).Once()

	enrollment, err := env.uc.StartCase(asStudent(), aiCaseID)

	require.NoError(t, err)
	assert.Equal(t, "other-request", enrollment.ID)
	env.assertExpectations(t)
}

func TestDashboard(t *testing.T) {
	env := newLearningEnv()
	env.expectStudent()
	aiCase := publishedCase(aiCaseID, entity.TierAI)
	b2bCase := publishedCase(b2bCaseID, entity.TierB2B)
	env.enrollments.On("ListByUser", mock.Anything, studentID, coreRepo.EnrollmentFilter{Sort: entity.EnrollmentSortRecent}).
		Return([]entity.Enrollment{
			{ID: "e1", Status: entity.EnrollmentPassed, Case: &aiCase, UpdatedAt: testNow},
			{ID: "e2", Status: entity.EnrollmentRevisionRequested, Case: &entity.Case{ID: "x", Tier: entity.TierB2B}, UpdatedAt: testNow},
		}, nil)
	env.certificates.On("ListByUser", mock.Anything, studentID, entity.Tier("")).
		Return([]entity.Certificate{{PublicID: "SIM-1"}}, nil)
	env.cases.On("ListPublished", mock.Anything,
		coreRepo.CaseFilter{ExcludeUserID: studentID, Sort: entity.CaseSortPopular},
		mock.MatchedBy(func(p *paginationPkg.Pagination) bool { return p.Limit == entity.RecommendationCandidatePool }),
	).Return([]entity.Case{b2bCase}, int64(1), nil)

	dashboard, err := env.uc.Dashboard(asStudent())

	require.NoError(t, err)
	assert.Equal(t, 2, dashboard.Stats.TotalCount)
	assert.Equal(t, 1, dashboard.Stats.CertificateCount)
	assert.True(t, dashboard.HasPassedAICase)
	assert.False(t, dashboard.HasPassedB2BCase)
	require.Len(t, dashboard.ActionItems, 1)
	assert.Equal(t, "e2", dashboard.ActionItems[0].ID)
	require.Len(t, dashboard.Recommendations, 1, "enrolled cases are excluded by the repository filter")
	assert.Equal(t, b2bCaseID, dashboard.Recommendations[0].ID, "passed AI → B2B recommended")
	env.assertExpectations(t)

	_, err = env.uc.Dashboard(context.Background())
	requireKind(t, err, apperror.KindUnauthenticated)
}

func TestListEnrollments(t *testing.T) {
	env := newLearningEnv()
	env.enrollments.On("ListByUser", mock.Anything, studentID,
		coreRepo.EnrollmentFilter{Status: entity.EnrollmentInReview, Sort: entity.EnrollmentSortDeadline},
	).Return([]entity.Enrollment{}, nil).Once()
	env.enrollments.On("ListByUser", mock.Anything, studentID,
		coreRepo.EnrollmentFilter{Sort: entity.EnrollmentSortRecent},
	).Return([]entity.Enrollment{}, nil).Once()

	_, err := env.uc.ListEnrollments(asStudent(), EnrollmentListInput{Status: "in_review", Sort: "deadline"})
	require.NoError(t, err)

	_, err = env.uc.ListEnrollments(asStudent(), EnrollmentListInput{})
	require.NoError(t, err, "default sort is recent")

	_, err = env.uc.ListEnrollments(asStudent(), EnrollmentListInput{Status: "selesai"})
	requireKind(t, err, apperror.KindValidation)

	env.assertExpectations(t)
}

func TestListCertificates(t *testing.T) {
	env := newLearningEnv()
	env.certificates.On("ListByUser", mock.Anything, studentID, entity.TierB2B).Return([]entity.Certificate{}, nil).Once()

	_, err := env.uc.ListCertificates(asStudent(), "b2b")
	require.NoError(t, err)

	_, err = env.uc.ListCertificates(asStudent(), "gold")
	requireKind(t, err, apperror.KindValidation)

	_, err = env.uc.ListCertificates(context.Background(), "")
	requireKind(t, err, apperror.KindUnauthenticated)

	env.assertExpectations(t)
}
