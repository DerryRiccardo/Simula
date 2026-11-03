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

// Mock hanya mengimplementasikan method yang dipakai OrderHook.

type mockPaidEnrollmentRepo struct {
	coreRepo.EnrollmentRepository
	mock.Mock
}

func (m *mockPaidEnrollmentRepo) FindByUserAndCase(ctx context.Context, userID, caseID string) (entity.Enrollment, error) {
	args := m.Called(ctx, userID, caseID)
	return args.Get(0).(entity.Enrollment), args.Error(1)
}

func (m *mockPaidEnrollmentRepo) ActivatePaid(ctx context.Context, id string, startBy, now time.Time) error {
	return m.Called(ctx, id, startBy, now).Error(0)
}

func (m *mockPaidEnrollmentRepo) Create(ctx context.Context, enrollment *entity.Enrollment) error {
	return m.Called(ctx, enrollment).Error(0)
}

type mockLinkOrderRepo struct {
	coreRepo.OrderRepository
	mock.Mock
}

func (m *mockLinkOrderRepo) LinkEnrollment(ctx context.Context, orderID, enrollmentID string) error {
	return m.Called(ctx, orderID, enrollmentID).Error(0)
}

func newOrderHookEnv() (*OrderHook, *mockPaidEnrollmentRepo, *mockLinkOrderRepo) {
	enrollments := &mockPaidEnrollmentRepo{}
	orders := &mockLinkOrderRepo{}
	hook := NewOrderHook(OrderHookDeps{
		Orders: orders, Enrollments: enrollments,
		CandidateNumber: func() int { return 4321 },
		Now:             func() time.Time { return testNow },
	})
	return hook, enrollments, orders
}

func paidOrder(enrollmentID *string) entity.Order {
	paidAt := testNow
	return entity.Order{ID: "order-1", UserID: "user-1", CaseID: "case-1", Status: entity.OrderPaid, PaidAt: &paidAt, EnrollmentID: enrollmentID}
}

func TestOnOrderPaid_VirtualAccountActivatesPendingEnrollment(t *testing.T) {
	hook, enrollments, orders := newOrderHookEnv()
	enrollmentID := "enrollment-1"
	enrollments.On("FindByUserAndCase", mock.Anything, "user-1", "case-1").
		Return(entity.Enrollment{ID: enrollmentID, Status: entity.EnrollmentPendingPayment}, nil)
	enrollments.On("ActivatePaid", mock.Anything, enrollmentID, entity.StartDeadline(testNow), testNow).Return(nil)

	require.NoError(t, hook.OnOrderPaid(context.Background(), paidOrder(&enrollmentID)))

	enrollments.AssertExpectations(t)
	orders.AssertNotCalled(t, "LinkEnrollment", mock.Anything, mock.Anything, mock.Anything)
}

func TestOnOrderPaid_InstantPaymentCreatesEnrollment(t *testing.T) {
	hook, enrollments, orders := newOrderHookEnv()
	enrollments.On("FindByUserAndCase", mock.Anything, "user-1", "case-1").Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
	var created entity.Enrollment
	enrollments.On("Create", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		created = *args.Get(1).(*entity.Enrollment)
	}).Return(nil)
	orders.On("LinkEnrollment", mock.Anything, "order-1", mock.Anything).Return(nil)

	require.NoError(t, hook.OnOrderPaid(context.Background(), paidOrder(nil)))

	assert.Equal(t, entity.EnrollmentNotStarted, created.Status)
	assert.Equal(t, 4321, created.CandidateNumber)
	require.NotNil(t, created.DeadlineAt)
	assert.Equal(t, entity.StartDeadline(testNow), *created.DeadlineAt)
	orders.AssertCalled(t, "LinkEnrollment", mock.Anything, "order-1", created.ID)
}

func TestOnOrderPaid_IsIdempotent(t *testing.T) {
	hook, enrollments, orders := newOrderHookEnv()
	enrollmentID := "enrollment-1"
	enrollments.On("FindByUserAndCase", mock.Anything, "user-1", "case-1").
		Return(entity.Enrollment{ID: enrollmentID, Status: entity.EnrollmentInProgress}, nil)

	require.NoError(t, hook.OnOrderPaid(context.Background(), paidOrder(&enrollmentID)))

	enrollments.AssertNotCalled(t, "ActivatePaid", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	enrollments.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	orders.AssertNotCalled(t, "LinkEnrollment", mock.Anything, mock.Anything, mock.Anything)
}

func TestOnOrderPaid_RetriesCandidateNumberCollision(t *testing.T) {
	hook, enrollments, orders := newOrderHookEnv()
	enrollments.On("FindByUserAndCase", mock.Anything, "user-1", "case-1").Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
	enrollments.On("Create", mock.Anything, mock.Anything).Return(coreErrors.ErrCandidateNumberTaken).Once()
	enrollments.On("Create", mock.Anything, mock.Anything).Return(nil).Once()
	orders.On("LinkEnrollment", mock.Anything, "order-1", mock.Anything).Return(nil)

	require.NoError(t, hook.OnOrderPaid(context.Background(), paidOrder(nil)))
	enrollments.AssertNumberOfCalls(t, "Create", 2)
}

func TestOnOrderPaid_IgnoresUnpaidOrder(t *testing.T) {
	hook, enrollments, _ := newOrderHookEnv()
	order := paidOrder(nil)
	order.Status = entity.OrderExpired

	require.NoError(t, hook.OnOrderPaid(context.Background(), order))
	enrollments.AssertNotCalled(t, "FindByUserAndCase", mock.Anything, mock.Anything, mock.Anything)
}
