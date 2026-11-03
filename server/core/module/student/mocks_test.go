package student

import (
	"context"
	"time"

	"github.com/stretchr/testify/mock"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

// Mock repository, dipakai bersama semua test di package ini.

type mockUserRepo struct {
	mock.Mock
}

func (m *mockUserRepo) Create(ctx context.Context, user *entity.User) error {
	return m.Called(ctx, user).Error(0)
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (entity.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.User), args.Error(1)
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (entity.User, error) {
	args := m.Called(ctx, email)
	return args.Get(0).(entity.User), args.Error(1)
}

func (m *mockUserRepo) GetByGoogleSub(ctx context.Context, sub string) (entity.User, error) {
	args := m.Called(ctx, sub)
	return args.Get(0).(entity.User), args.Error(1)
}

func (m *mockUserRepo) LinkGoogle(ctx context.Context, userID, sub string) error {
	return m.Called(ctx, userID, sub).Error(0)
}

func (m *mockUserRepo) CompleteOnboarding(ctx context.Context, userID string, fields []string, status entity.StudentStatus, major *string) error {
	return m.Called(ctx, userID, fields, status, major).Error(0)
}

type mockCaseRepo struct {
	mock.Mock
}

func (m *mockCaseRepo) ListPublished(ctx context.Context, filter coreRepo.CaseFilter, p *paginationPkg.Pagination) ([]entity.Case, int64, error) {
	args := m.Called(ctx, filter, p)
	return args.Get(0).([]entity.Case), args.Get(1).(int64), args.Error(2)
}

func (m *mockCaseRepo) GetPublishedBySlug(ctx context.Context, slug string) (entity.Case, error) {
	args := m.Called(ctx, slug)
	return args.Get(0).(entity.Case), args.Error(1)
}

func (m *mockCaseRepo) GetByID(ctx context.Context, id string) (entity.Case, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Case), args.Error(1)
}

func (m *mockCaseRepo) GetWithBriefBySlug(ctx context.Context, slug string) (entity.Case, error) {
	args := m.Called(ctx, slug)
	return args.Get(0).(entity.Case), args.Error(1)
}

func (m *mockCaseRepo) GetWithSlotsByID(ctx context.Context, id string) (entity.Case, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Case), args.Error(1)
}

type mockEnrollmentRepo struct {
	mock.Mock
}

func (m *mockEnrollmentRepo) ListByUser(ctx context.Context, userID string, filter coreRepo.EnrollmentFilter) ([]entity.Enrollment, error) {
	args := m.Called(ctx, userID, filter)
	return args.Get(0).([]entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) GetForUser(ctx context.Context, userID, enrollmentID string) (entity.Enrollment, error) {
	args := m.Called(ctx, userID, enrollmentID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) FindByUserAndCase(ctx context.Context, userID, caseID string) (entity.Enrollment, error) {
	args := m.Called(ctx, userID, caseID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) Create(ctx context.Context, enrollment *entity.Enrollment) error {
	return m.Called(ctx, enrollment).Error(0)
}

func (m *mockEnrollmentRepo) GetByIDForUser(ctx context.Context, userID, enrollmentID string) (entity.Enrollment, error) {
	args := m.Called(ctx, userID, enrollmentID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) FindWithCertificate(ctx context.Context, userID, caseID string) (entity.Enrollment, error) {
	args := m.Called(ctx, userID, caseID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) Start(ctx context.Context, enrollmentID string, startedAt time.Time, deadlineAt *time.Time) error {
	return m.Called(ctx, enrollmentID, startedAt, deadlineAt).Error(0)
}

type mockCertificateRepo struct {
	mock.Mock
}

func (m *mockCertificateRepo) ListByUser(ctx context.Context, userID string, tier entity.Tier) ([]entity.Certificate, error) {
	args := m.Called(ctx, userID, tier)
	return args.Get(0).([]entity.Certificate), args.Error(1)
}

type mockSubmissionRepo struct {
	mock.Mock
}

func (m *mockSubmissionRepo) ListByEnrollment(ctx context.Context, enrollmentID string) ([]entity.Submission, error) {
	args := m.Called(ctx, enrollmentID)
	return args.Get(0).([]entity.Submission), args.Error(1)
}

func (m *mockSubmissionRepo) NextAttempt(ctx context.Context, enrollmentID string) (int, error) {
	args := m.Called(ctx, enrollmentID)
	return args.Int(0), args.Error(1)
}

func (m *mockSubmissionRepo) SaveDraft(ctx context.Context, draft *entity.Submission, attachFileIDs []string) error {
	return m.Called(ctx, draft, attachFileIDs).Error(0)
}

func (m *mockSubmissionRepo) Submit(ctx context.Context, submission *entity.Submission, attachFileIDs []string, change entity.EnrollmentStatusChange, run *entity.AIGradingRun) error {
	return m.Called(ctx, submission, attachFileIDs, change, run).Error(0)
}

type mockFileRepo struct {
	mock.Mock
}

func (m *mockFileRepo) Create(ctx context.Context, file *entity.File) error {
	return m.Called(ctx, file).Error(0)
}

func (m *mockFileRepo) ListByIDs(ctx context.Context, uploadedBy string, ids []string) ([]entity.File, error) {
	args := m.Called(ctx, uploadedBy, ids)
	return args.Get(0).([]entity.File), args.Error(1)
}

func (m *mockFileRepo) ListPendingBefore(ctx context.Context, before time.Time, limit int) ([]entity.File, error) {
	args := m.Called(ctx, before, limit)
	return args.Get(0).([]entity.File), args.Error(1)
}

func (m *mockFileRepo) DeletePending(ctx context.Context, ids []string) (int64, error) {
	args := m.Called(ctx, ids)
	return args.Get(0).(int64), args.Error(1)
}

type mockStorage struct {
	mock.Mock
}

func (m *mockStorage) PresignUpload(ctx context.Context, key, contentType string, sizeBytes int64, ttl time.Duration) (entity.PresignedUpload, error) {
	args := m.Called(ctx, key, contentType, sizeBytes, ttl)
	return args.Get(0).(entity.PresignedUpload), args.Error(1)
}

func (m *mockStorage) HeadObject(ctx context.Context, key string) (entity.StoredObject, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(entity.StoredObject), args.Error(1)
}

func (m *mockStorage) DeleteObject(ctx context.Context, key string) error {
	return m.Called(ctx, key).Error(0)
}

func (m *mockCaseRepo) GetWithBriefByID(ctx context.Context, id string) (entity.Case, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Case), args.Error(1)
}

func (m *mockCaseRepo) CountRubricCriteria(ctx context.Context, caseID string) (int, error) {
	args := m.Called(ctx, caseID)
	return args.Int(0), args.Error(1)
}

func (m *mockEnrollmentRepo) GetByIDWithCase(ctx context.Context, enrollmentID string) (entity.Enrollment, error) {
	args := m.Called(ctx, enrollmentID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockEnrollmentRepo) Retry(ctx context.Context, enrollmentID string, deadlineAt *time.Time, now time.Time) error {
	return m.Called(ctx, enrollmentID, deadlineAt, now).Error(0)
}

func (m *mockCertificateRepo) GetByPublicID(ctx context.Context, publicID string) (entity.Certificate, error) {
	args := m.Called(ctx, publicID)
	return args.Get(0).(entity.Certificate), args.Error(1)
}

type mockGradingRepo struct {
	mock.Mock
}

func (m *mockGradingRepo) LoadJob(ctx context.Context, runID string) (entity.GradingJob, error) {
	args := m.Called(ctx, runID)
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

func (m *mockGradingRepo) Fail(ctx context.Context, runID, message string, now time.Time) error {
	return m.Called(ctx, runID, message, now).Error(0)
}

type mockGradingQueue struct {
	mock.Mock
}

func (m *mockGradingQueue) EnqueueCriterion(ctx context.Context, runID string, position int) error {
	return m.Called(ctx, runID, position).Error(0)
}

func (m *mockGradingQueue) EnqueueFeedback(ctx context.Context, runID string) error {
	return m.Called(ctx, runID).Error(0)
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

func (m *mockGradingRepo) ListUngraded(ctx context.Context, limit int) ([]entity.UngradedSubmission, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.UngradedSubmission), args.Error(1)
}

func (m *mockGradingRepo) CreateRun(ctx context.Context, run *entity.AIGradingRun) (bool, error) {
	args := m.Called(ctx, run)
	return args.Bool(0), args.Error(1)
}
