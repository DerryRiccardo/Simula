package student

import (
	"context"

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

type mockCertificateRepo struct {
	mock.Mock
}

func (m *mockCertificateRepo) ListByUser(ctx context.Context, userID string, tier entity.Tier) ([]entity.Certificate, error) {
	args := m.Called(ctx, userID, tier)
	return args.Get(0).([]entity.Certificate), args.Error(1)
}
