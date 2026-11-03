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
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

type resultEnv struct {
	uc           ResultUseCase
	certificate  CertificateUseCase
	cases        *mockCaseRepo
	enrollments  *mockEnrollmentRepo
	submissions  *mockSubmissionRepo
	reviews      *mockReviewRepo
	certificates *mockCertificateRepo
}

func newResultEnv() *resultEnv {
	env := &resultEnv{
		cases:        &mockCaseRepo{},
		enrollments:  &mockEnrollmentRepo{},
		submissions:  &mockSubmissionRepo{},
		reviews:      &mockReviewRepo{},
		certificates: &mockCertificateRepo{},
	}
	env.uc = InitResultUseCase(ResultDeps{
		Cases: env.cases, Enrollments: env.enrollments, Submissions: env.submissions, Reviews: env.reviews,
		Now: func() time.Time { return testNow },
	})
	env.certificate = InitCertificateUseCase(CertificateDeps{Certificates: env.certificates, Cases: env.cases})
	return env
}

func (env *resultEnv) assertExpectations(t *testing.T) {
	t.Helper()
	env.cases.AssertExpectations(t)
	env.enrollments.AssertExpectations(t)
	env.submissions.AssertExpectations(t)
	env.reviews.AssertExpectations(t)
	env.certificates.AssertExpectations(t)
}

func TestGetResult(t *testing.T) {
	t.Run("returns the latest reviewed attempt with its scores", func(t *testing.T) {
		env := newResultEnv()
		c := aiBrief()
		env.cases.On("GetWithBriefBySlug", mock.Anything, "optimasi-api").Return(c, nil)
		env.enrollments.On("FindWithCertificate", mock.Anything, studentID, aiCaseID).
			Return(enrollmentWith(c, entity.EnrollmentFailed), nil)
		env.submissions.On("ListByEnrollment", mock.Anything, enrollmentID).Return([]entity.Submission{
			{ID: "sub-1", Attempt: 1, Status: entity.SubmissionReviewed, Review: &entity.Review{ID: "review-1"}},
			{ID: "sub-2", Attempt: 2, Status: entity.SubmissionReviewed, Review: &entity.Review{ID: "review-2"}},
			{ID: "sub-3", Attempt: 3, Status: entity.SubmissionDraft},
		}, nil)
		review := entity.Review{ID: "review-2", TotalScore: 64, Scores: []entity.ReviewCriterionScore{{Name: "Analisis"}}}
		env.reviews.On("GetBySubmission", mock.Anything, "sub-2").Return(review, nil)

		result, err := env.uc.GetResult(asStudent(), "optimasi-api")

		require.NoError(t, err)
		assert.True(t, result.CanViewBrief)
		assert.True(t, result.CanRetry)
		require.NotNil(t, result.Review)
		assert.Equal(t, 64, result.Review.TotalScore)
		assert.Equal(t, "sub-2", result.Submission.ID)
		env.assertExpectations(t)
	})

	t.Run("not reviewed yet returns the latest submission without a review", func(t *testing.T) {
		env := newResultEnv()
		c := aiBrief()
		env.cases.On("GetWithBriefBySlug", mock.Anything, "optimasi-api").Return(c, nil)
		env.enrollments.On("FindWithCertificate", mock.Anything, studentID, aiCaseID).
			Return(enrollmentWith(c, entity.EnrollmentAIGrading), nil)
		env.submissions.On("ListByEnrollment", mock.Anything, enrollmentID).Return([]entity.Submission{
			{ID: "sub-1", Attempt: 1, Status: entity.SubmissionSubmitted},
		}, nil)

		result, err := env.uc.GetResult(asStudent(), "optimasi-api")

		require.NoError(t, err)
		assert.Nil(t, result.Review)
		assert.False(t, result.CanRetry)
		require.NotNil(t, result.Submission)
		assert.Equal(t, "sub-1", result.Submission.ID)
		env.reviews.AssertNotCalled(t, "GetBySubmission", mock.Anything, mock.Anything)
	})

	t.Run("unpaid B2B hides the brief", func(t *testing.T) {
		env := newResultEnv()
		c := b2bBrief()
		env.cases.On("GetWithBriefBySlug", mock.Anything, "overselling").Return(c, nil)
		env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).
			Return(enrollmentWith(c, entity.EnrollmentPendingPayment), nil)

		result, err := env.uc.GetResult(asStudent(), "overselling")

		require.NoError(t, err)
		assert.False(t, result.CanViewBrief)
		env.submissions.AssertNotCalled(t, "ListByEnrollment", mock.Anything, mock.Anything)
	})
}

func TestRetry(t *testing.T) {
	t.Run("AI case reopens without a deadline", func(t *testing.T) {
		env := newResultEnv()
		c := aiBrief()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(c, entity.EnrollmentFailed), nil)
		env.cases.On("GetByID", mock.Anything, aiCaseID).Return(c, nil)
		env.enrollments.On("Retry", mock.Anything, enrollmentID, (*time.Time)(nil), testNow).Return(nil)
		env.enrollments.On("GetForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(c, entity.EnrollmentInProgress), nil)

		enrollment, err := env.uc.Retry(asStudent(), enrollmentID)

		require.NoError(t, err)
		assert.Equal(t, entity.EnrollmentInProgress, enrollment.Status)
		env.assertExpectations(t)
	})

	t.Run("B2B case gets a new deadline once", func(t *testing.T) {
		env := newResultEnv()
		c := b2bBrief()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(c, entity.EnrollmentFailed), nil)
		env.cases.On("GetByID", mock.Anything, b2bCaseID).Return(c, nil)
		wantDeadline := entity.RetryDeadline(entity.TierB2B, testNow)
		env.enrollments.On("Retry", mock.Anything, enrollmentID, wantDeadline, testNow).Return(nil)
		env.enrollments.On("GetForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(c, entity.EnrollmentInProgress), nil)

		_, err := env.uc.Retry(asStudent(), enrollmentID)

		require.NoError(t, err)
		env.assertExpectations(t)
	})

	t.Run("B2B retry already used", func(t *testing.T) {
		env := newResultEnv()
		c := b2bBrief()
		enrollment := enrollmentWith(c, entity.EnrollmentFailed)
		enrollment.RetryCount = entity.B2BMaxRetries
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollment, nil)
		env.cases.On("GetByID", mock.Anything, b2bCaseID).Return(c, nil)

		_, err := env.uc.Retry(asStudent(), enrollmentID)

		requireKind(t, err, apperror.KindConflict)
		env.enrollments.AssertNotCalled(t, "Retry", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("not failed", func(t *testing.T) {
		env := newResultEnv()
		c := aiBrief()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(c, entity.EnrollmentPassed), nil)
		env.cases.On("GetByID", mock.Anything, aiCaseID).Return(c, nil)

		_, err := env.uc.Retry(asStudent(), enrollmentID)

		requireKind(t, err, apperror.KindConflict)
	})

	t.Run("someone else's enrollment", func(t *testing.T) {
		env := newResultEnv()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
			Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)

		_, err := env.uc.Retry(asStudent(), enrollmentID)

		requireKind(t, err, apperror.KindNotFound)
	})
}

func TestVerifyCertificate(t *testing.T) {
	certificate := entity.Certificate{ID: "cert-1", PublicID: "SIM-7K2Q9X4M", UserID: studentID, CaseID: aiCaseID}

	t.Run("public visitor", func(t *testing.T) {
		env := newResultEnv()
		env.certificates.On("GetByPublicID", mock.Anything, "SIM-7K2Q9X4M").Return(certificate, nil)
		env.cases.On("GetWithBriefByID", mock.Anything, aiCaseID).Return(aiBrief(), nil)

		verification, err := env.certificate.Verify(context.Background(), " sim-7k2q9x4m ")

		require.NoError(t, err)
		assert.False(t, verification.IsOwner)
		assert.Equal(t, entity.AIReviewerRole, verification.ReviewerRole)
		env.assertExpectations(t)
	})

	t.Run("owner is flagged", func(t *testing.T) {
		env := newResultEnv()
		env.certificates.On("GetByPublicID", mock.Anything, "SIM-7K2Q9X4M").Return(certificate, nil)
		env.cases.On("GetWithBriefByID", mock.Anything, aiCaseID).Return(aiBrief(), nil)

		verification, err := env.certificate.Verify(asStudent(), "SIM-7K2Q9X4M")

		require.NoError(t, err)
		assert.True(t, verification.IsOwner)
	})

	t.Run("another logged-in user is not the owner", func(t *testing.T) {
		env := newResultEnv()
		env.certificates.On("GetByPublicID", mock.Anything, "SIM-7K2Q9X4M").Return(certificate, nil)
		env.cases.On("GetWithBriefByID", mock.Anything, aiCaseID).Return(aiBrief(), nil)
		ctx := authctx.WithUser(context.Background(), authctx.User{ID: "other", Role: studentCtx})

		verification, err := env.certificate.Verify(ctx, "SIM-7K2Q9X4M")

		require.NoError(t, err)
		assert.False(t, verification.IsOwner)
	})

	t.Run("unknown or malformed ID", func(t *testing.T) {
		env := newResultEnv()
		env.certificates.On("GetByPublicID", mock.Anything, "SIM-00000000").Return(entity.Certificate{}, coreErrors.ErrCertificateNotFound)

		_, err := env.certificate.Verify(context.Background(), "SIM-00000000")
		requireKind(t, err, apperror.KindNotFound)

		_, err = env.certificate.Verify(context.Background(), "")
		requireKind(t, err, apperror.KindNotFound)
	})
}

func TestSetShareConsent(t *testing.T) {
	pending := entity.ShareConsentPending

	t.Run("grants consent after a recommendation", func(t *testing.T) {
		env := newResultEnv()
		enrollment := enrollmentWith(b2bBrief(), entity.EnrollmentPassed)
		enrollment.ShareConsent = &pending
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollment, nil)
		env.enrollments.On("SetShareConsent", mock.Anything, enrollmentID, entity.ShareConsentGranted, testNow).Return(nil)

		consent, err := env.uc.SetShareConsent(asStudent(), enrollmentID, true)

		require.NoError(t, err)
		assert.Equal(t, entity.ShareConsentGranted, consent)
	})

	t.Run("declines", func(t *testing.T) {
		env := newResultEnv()
		enrollment := enrollmentWith(b2bBrief(), entity.EnrollmentPassed)
		enrollment.ShareConsent = &pending
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollment, nil)
		env.enrollments.On("SetShareConsent", mock.Anything, enrollmentID, entity.ShareConsentDeclined, testNow).Return(nil)

		consent, err := env.uc.SetShareConsent(asStudent(), enrollmentID, false)

		require.NoError(t, err)
		assert.Equal(t, entity.ShareConsentDeclined, consent)
	})

	t.Run("no recommendation", func(t *testing.T) {
		env := newResultEnv()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(b2bBrief(), entity.EnrollmentPassed), nil)

		_, err := env.uc.SetShareConsent(asStudent(), enrollmentID, true)

		requireKind(t, err, apperror.KindConflict)
		env.enrollments.AssertNotCalled(t, "SetShareConsent", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})
}
