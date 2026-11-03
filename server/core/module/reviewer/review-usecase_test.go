package reviewer

import (
	"context"
	"strings"
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

const (
	reviewerID   = "reviewer-1"
	enrollmentID = "55555555-5555-5555-5555-555555555555"
	caseID       = "case-1"
	submissionID = "sub-2"
)

var testNow = time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)

type mockReviewerRepo struct {
	mock.Mock
}

func (m *mockReviewerRepo) ListQueue(ctx context.Context, id string, limit int) ([]entity.ReviewQueueEntry, error) {
	args := m.Called(ctx, id, limit)
	return args.Get(0).([]entity.ReviewQueueEntry), args.Error(1)
}

func (m *mockReviewerRepo) GetEntry(ctx context.Context, id, enrollment string) (entity.ReviewQueueEntry, error) {
	args := m.Called(ctx, id, enrollment)
	return args.Get(0).(entity.ReviewQueueEntry), args.Error(1)
}

func (m *mockReviewerRepo) LastRevision(ctx context.Context, enrollment string) (*entity.RevisionRequest, error) {
	args := m.Called(ctx, enrollment)
	revision, _ := args.Get(0).(*entity.RevisionRequest)
	return revision, args.Error(1)
}

func (m *mockReviewerRepo) GetDraft(ctx context.Context, submission string) (entity.ReviewDraft, error) {
	args := m.Called(ctx, submission)
	return args.Get(0).(entity.ReviewDraft), args.Error(1)
}

func (m *mockReviewerRepo) SaveDraft(ctx context.Context, enrollment string, draft *entity.ReviewDraft) error {
	return m.Called(ctx, enrollment, draft).Error(0)
}

func (m *mockReviewerRepo) RequestRevision(ctx context.Context, decision entity.RevisionDecision) error {
	return m.Called(ctx, decision).Error(0)
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

type mockFileRepo struct {
	coreRepo.FileRepository
	mock.Mock
}

func (m *mockFileRepo) ListByIDs(ctx context.Context, owner string, ids []string) ([]entity.File, error) {
	args := m.Called(ctx, owner, ids)
	return args.Get(0).([]entity.File), args.Error(1)
}

type mockStorage struct {
	coreRepo.Storage
	mock.Mock
}

func (m *mockStorage) PresignDownload(ctx context.Context, key, name string, ttl time.Duration) (string, error) {
	args := m.Called(ctx, key, name, ttl)
	return args.String(0), args.Error(1)
}

type reviewEnv struct {
	uc       ReviewUseCase
	repo     *mockReviewerRepo
	cases    *mockCaseRepo
	files    *mockFileRepo
	storage  *mockStorage
	outcomes []entity.ReviewOutcome
	// afterReview dipanggil oleh OnReviewed palsu untuk menyiapkan entry hasil reload.
	afterReview func()
}

func newReviewEnv() *reviewEnv {
	env := &reviewEnv{repo: &mockReviewerRepo{}, cases: &mockCaseRepo{}, files: &mockFileRepo{}, storage: &mockStorage{}}
	env.uc = InitReviewUseCase(ReviewDeps{
		Reviewers: env.repo, Cases: env.cases, Files: env.files, Storage: env.storage,
		OnReviewed: func(_ context.Context, outcome entity.ReviewOutcome) error {
			env.outcomes = append(env.outcomes, outcome)
			if env.afterReview != nil {
				env.afterReview()
			}
			return nil
		},
		Now: func() time.Time { return testNow },
	})
	return env
}

func asReviewer() context.Context {
	return authctx.WithUser(context.Background(), authctx.User{ID: reviewerID, Role: "reviewer"})
}

func reviewCase() entity.Case {
	role := "Senior Backend Engineer"
	return entity.Case{
		ID: caseID, Tier: entity.TierB2B, PassingScore: 70, ReviewerRole: &role,
		Rubric: []entity.RubricCriterion{{Position: 1, Name: "Desain", Weight: 60}, {Position: 2, Name: "Kode", Weight: 40}},
	}
}

func pendingEntry(revisionCount int) entity.ReviewQueueEntry {
	submittedAt := testNow.Add(-time.Hour)
	due := testNow.Add(72 * time.Hour)
	return entity.ReviewQueueEntry{
		Enrollment: entity.Enrollment{
			ID: enrollmentID, UserID: "student-1", CaseID: caseID, Status: entity.EnrollmentInReview,
			CandidateNumber: 4242, RevisionCount: revisionCount, ReviewDueAt: &due,
		},
		Submission: &entity.Submission{
			ID: submissionID, Attempt: revisionCount + 1, Status: entity.SubmissionSubmitted, SubmittedAt: &submittedAt,
			SubmissionContent: entity.SubmissionContent{SlotValues: entity.SlotValues{
				"design_doc": {File: &entity.FileRef{FileID: "file-1", FileName: "design.pdf", SizeBytes: 2048}},
				"repo":       {Text: "https://github.com/x/y"},
			}},
		},
	}
}

func validGrade() GradeInput {
	return GradeInput{
		Criteria: []GradeCriterionInput{
			// Urutan sengaja dibalik: dicocokkan lewat nama.
			{Name: "Kode", Level: 4, Reason: "Kode rapi dan teruji dengan baik."},
			{Name: "Desain", Level: 4, Reason: "Desain menjelaskan trade-off dengan jelas."},
		},
		Feedback: entity.ReviewFeedback{
			Strengths: []string{"Desain jelas", " "}, Improvements: []string{"Tambah load test"}, NextSteps: []string{"Pelajari Redis"},
		},
		IsRecommended: true,
	}
}

func TestGetQueue_SplitsAndSorts(t *testing.T) {
	env := newReviewEnv()
	soon := testNow.Add(time.Hour)
	later := testNow.Add(48 * time.Hour)
	reviewedAt := testNow.Add(-time.Hour)
	revisedAt := testNow.Add(-2 * time.Hour)
	entries := []entity.ReviewQueueEntry{
		{Enrollment: entity.Enrollment{ID: "late", Status: entity.EnrollmentInReview, ReviewDueAt: &later}},
		{Enrollment: entity.Enrollment{ID: "revised", Status: entity.EnrollmentRevisionRequested},
			Submission: &entity.Submission{RevisionRequest: &entity.RevisionRequest{CreatedAt: revisedAt}}},
		{Enrollment: entity.Enrollment{ID: "soon", Status: entity.EnrollmentInReview, ReviewDueAt: &soon}},
		{Enrollment: entity.Enrollment{ID: "graded", Status: entity.EnrollmentPassed},
			Submission: &entity.Submission{Review: &entity.Review{ReviewedAt: reviewedAt}}},
	}
	env.repo.On("ListQueue", mock.Anything, reviewerID, entity.ReviewQueueLimit).Return(entries, nil)

	queue, err := env.uc.GetQueue(asReviewer())

	require.NoError(t, err)
	require.Len(t, queue.Pending, 2)
	assert.Equal(t, "soon", queue.Pending[0].Enrollment.ID)
	require.Len(t, queue.History, 2)
	assert.Equal(t, "graded", queue.History[0].Enrollment.ID, "newest decision first")
}

func TestGetSubmission_SignsDownloadsAndLoadsOwnDraft(t *testing.T) {
	env := newReviewEnv()
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(1), nil)
	env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(reviewCase(), nil)
	revision := &entity.RevisionRequest{Reason: "Tautan tidak bisa dibuka"}
	env.repo.On("LastRevision", mock.Anything, enrollmentID).Return(revision, nil)
	env.repo.On("GetDraft", mock.Anything, submissionID).Return(entity.ReviewDraft{ReviewerID: reviewerID, Decision: entity.ReviewDecisionGrade}, nil)
	env.files.On("ListByIDs", mock.Anything, "student-1", []string{"file-1"}).
		Return([]entity.File{{ID: "file-1", ObjectKey: "submissions/x/design.pdf", FileName: "design.pdf"}}, nil)
	env.storage.On("PresignDownload", mock.Anything, "submissions/x/design.pdf", "design.pdf", entity.ReviewDownloadTTL).
		Return("https://r2.example/signed", nil)

	detail, err := env.uc.GetSubmission(asReviewer(), enrollmentID)

	require.NoError(t, err)
	assert.Equal(t, "https://r2.example/signed", detail.DownloadURLs["file-1"])
	require.NotNil(t, detail.Draft)
	assert.Equal(t, revision, detail.LastRevision)
}

func TestGetSubmission_NotInQueue(t *testing.T) {
	env := newReviewEnv()
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(entity.ReviewQueueEntry{}, coreErrors.ErrEnrollmentNotFound)

	_, err := env.uc.GetSubmission(asReviewer(), enrollmentID)
	requireKind(t, err, apperror.KindNotFound)

	_, err = env.uc.GetSubmission(asReviewer(), "not-a-uuid")
	requireKind(t, err, apperror.KindNotFound)
}

func TestGrade_FinalizesThroughHook(t *testing.T) {
	env := newReviewEnv()
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil).Once()
	env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(reviewCase(), nil)
	graded := pendingEntry(0)
	graded.Enrollment.Status = entity.EnrollmentPassed
	id := reviewerID
	graded.Submission.Review = &entity.Review{ReviewerID: &id, IsRecommended: true}
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(graded, nil).Once()

	entry, err := env.uc.Grade(asReviewer(), enrollmentID, validGrade())

	require.NoError(t, err)
	assert.Equal(t, entity.EnrollmentPassed, entry.Enrollment.Status)
	require.Len(t, env.outcomes, 1)
	outcome := env.outcomes[0]
	assert.Equal(t, entity.ReviewerHuman, outcome.ReviewerType)
	require.NotNil(t, outcome.ReviewerID)
	assert.Equal(t, reviewerID, *outcome.ReviewerID)
	assert.Equal(t, "Senior Backend Engineer", outcome.ReviewerRole)
	require.Len(t, outcome.Scores, 2)
	assert.Equal(t, "Desain", outcome.Scores[0].Name, "scores follow rubric order")
	assert.Equal(t, 60, outcome.Scores[0].Weight)
	assert.Equal(t, []string{"Desain jelas"}, outcome.Feedback.Strengths, "blank points are dropped")
	assert.True(t, outcome.IsRecommended)
}

func TestGrade_Validation(t *testing.T) {
	env := newReviewEnv()
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil)
	env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(reviewCase(), nil)
	input := GradeInput{
		Criteria: []GradeCriterionInput{{Name: "Desain", Level: 6, Reason: "pendek"}},
		Feedback: entity.ReviewFeedback{Strengths: []string{"ok"}, Improvements: []string{strings.Repeat("a", 1001)}},
	}

	_, err := env.uc.Grade(asReviewer(), enrollmentID, input)

	appErr := requireKind(t, err, apperror.KindValidation)
	assert.ElementsMatch(t, []string{
		"criteria.0.level", "criteria.0.reason", "criteria.1.level", "criteria.1.reason",
		"feedback.improvements", "feedback.nextSteps",
	}, fieldNames(appErr))
	assert.Empty(t, env.outcomes)
}

func TestGrade_DecidedByAnotherRequest(t *testing.T) {
	env := newReviewEnv()
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil).Once()
	env.cases.On("GetWithBriefByID", mock.Anything, caseID).Return(reviewCase(), nil)
	// Hook mengabaikan konflik; setelah reload, submission sudah tidak terlihat (dipegang orang lain).
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(entity.ReviewQueueEntry{}, coreErrors.ErrEnrollmentNotFound).Once()

	_, err := env.uc.Grade(asReviewer(), enrollmentID, validGrade())

	requireKind(t, err, apperror.KindConflict)
}

func TestGrade_AlreadyDecided(t *testing.T) {
	env := newReviewEnv()
	entry := pendingEntry(0)
	entry.Enrollment.Status = entity.EnrollmentFailed
	env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(entry, nil)

	_, err := env.uc.Grade(asReviewer(), enrollmentID, validGrade())

	requireKind(t, err, apperror.KindConflict)
}

func TestRequestRevision(t *testing.T) {
	t.Run("returns with a 3 day deadline", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(1), nil).Once()
		env.repo.On("RequestRevision", mock.Anything, entity.RevisionDecision{
			EnrollmentID: enrollmentID, SubmissionID: submissionID, ReviewerID: reviewerID,
			Reason: "Tautan tidak bisa dibuka", Note: "Repo masih private, mohon dibuka aksesnya.",
			DeadlineAt: testNow.AddDate(0, 0, 3), At: testNow,
		}).Return(nil)
		revised := pendingEntry(2)
		revised.Enrollment.Status = entity.EnrollmentRevisionRequested
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(revised, nil).Once()

		entry, err := env.uc.RequestRevision(asReviewer(), enrollmentID, "Tautan tidak bisa dibuka", "  Repo masih private, mohon dibuka aksesnya.  ")

		require.NoError(t, err)
		assert.Equal(t, entity.EnrollmentRevisionRequested, entry.Enrollment.Status)
	})

	t.Run("limit reached", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(entity.MaxRevisions), nil)

		_, err := env.uc.RequestRevision(asReviewer(), enrollmentID, "Tautan tidak bisa dibuka", "Repo masih private, mohon dibuka.")

		requireKind(t, err, apperror.KindConflict)
		env.repo.AssertNotCalled(t, "RequestRevision", mock.Anything, mock.Anything)
	})

	t.Run("validation", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil)

		_, err := env.uc.RequestRevision(asReviewer(), enrollmentID, "Alasan lain", "singkat")

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []string{"reason", "note"}, fieldNames(appErr))
	})
}

func TestSaveDraft(t *testing.T) {
	t.Run("merges the patch into the existing draft", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil)
		existing := entity.ReviewDraft{
			SubmissionID: submissionID, ReviewerID: reviewerID, Decision: entity.ReviewDecisionGrade,
			Revision: entity.DraftRevisionValue{Revision: &entity.DraftRevision{Reason: "Tautan tidak bisa dibuka"}},
		}
		env.repo.On("GetDraft", mock.Anything, submissionID).Return(existing, nil)
		var saved *entity.ReviewDraft
		env.repo.On("SaveDraft", mock.Anything, enrollmentID, mock.Anything).Run(func(args mock.Arguments) {
			saved = args.Get(2).(*entity.ReviewDraft)
		}).Return(nil)
		grade := &entity.DraftGrade{Strengths: "Desain jelas"}

		_, err := env.uc.SaveDraft(asReviewer(), enrollmentID, entity.ReviewDraftPatch{Grade: grade, HasGrade: true})

		require.NoError(t, err)
		require.NotNil(t, saved)
		assert.Equal(t, grade, saved.Grade.Grade)
		require.NotNil(t, saved.Revision.Revision, "parts not sent stay as they were")
		assert.Equal(t, testNow, saved.SavedAt)
	})

	t.Run("another reviewer holds the submission", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil)
		env.repo.On("GetDraft", mock.Anything, submissionID).Return(entity.ReviewDraft{}, coreErrors.ErrReviewDraftNotFound)
		env.repo.On("SaveDraft", mock.Anything, enrollmentID, mock.Anything).Return(coreErrors.ErrStatusConflict)

		_, err := env.uc.SaveDraft(asReviewer(), enrollmentID, entity.ReviewDraftPatch{})

		requireKind(t, err, apperror.KindConflict)
	})

	t.Run("unknown decision", func(t *testing.T) {
		env := newReviewEnv()
		env.repo.On("GetEntry", mock.Anything, reviewerID, enrollmentID).Return(pendingEntry(0), nil)
		decision := entity.ReviewDecision("approve")

		_, err := env.uc.SaveDraft(asReviewer(), enrollmentID, entity.ReviewDraftPatch{Decision: &decision})

		requireKind(t, err, apperror.KindValidation)
	})
}

func requireKind(t *testing.T, err error, kind apperror.Kind) *apperror.Error {
	t.Helper()
	var appErr *apperror.Error
	require.ErrorAs(t, err, &appErr)
	require.Equal(t, kind, appErr.Kind)
	return appErr
}

func fieldNames(err *apperror.Error) []string {
	names := make([]string, 0, len(err.Fields))
	for _, field := range err.Fields {
		names = append(names, field.Field)
	}
	return names
}
