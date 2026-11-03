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
)

const checkoutOrderID = "88888888-8888-8888-8888-888888888888"

type mockOrderRepo struct {
	mock.Mock
}

func (m *mockOrderRepo) NextInvoiceSeq(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *mockOrderRepo) Create(ctx context.Context, order *entity.Order, pending *entity.Enrollment) error {
	return m.Called(ctx, order, pending).Error(0)
}

func (m *mockOrderRepo) GetByID(ctx context.Context, id string) (entity.Order, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Order), args.Error(1)
}

func (m *mockOrderRepo) GetForUser(ctx context.Context, userID, id string) (entity.Order, error) {
	args := m.Called(ctx, userID, id)
	return args.Get(0).(entity.Order), args.Error(1)
}

func (m *mockOrderRepo) LatestForCase(ctx context.Context, userID, caseID string) (entity.Order, error) {
	args := m.Called(ctx, userID, caseID)
	return args.Get(0).(entity.Order), args.Error(1)
}

func (m *mockOrderRepo) Settle(ctx context.Context, settlement entity.OrderSettlement) error {
	return m.Called(ctx, settlement).Error(0)
}

func (m *mockOrderRepo) LinkEnrollment(ctx context.Context, id, enrollmentID string) error {
	return m.Called(ctx, id, enrollmentID).Error(0)
}

func (m *mockOrderRepo) RecordNotification(ctx context.Context, record *entity.PaymentNotificationRecord) error {
	return m.Called(ctx, record).Error(0)
}

func (m *mockOrderRepo) MarkNotificationProcessed(ctx context.Context, id string, now time.Time) error {
	return m.Called(ctx, id, now).Error(0)
}

type mockPaymentGateway struct {
	mock.Mock
}

func (m *mockPaymentGateway) Charge(ctx context.Context, req entity.ChargeRequest) (entity.ChargeResult, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(entity.ChargeResult), args.Error(1)
}

func (m *mockPaymentGateway) Cancel(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}

func (m *mockPaymentGateway) GetStatus(ctx context.Context, id string) (entity.GatewayTransaction, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.GatewayTransaction), args.Error(1)
}

func (m *mockPaymentGateway) VerifySignature(n entity.PaymentNotification) bool {
	return m.Called(n).Bool(0)
}

type mockPaymentSimulator struct {
	mock.Mock
}

func (m *mockPaymentSimulator) Simulate(ctx context.Context, order entity.Order, status string) (entity.PaymentNotification, error) {
	args := m.Called(ctx, order, status)
	return args.Get(0).(entity.PaymentNotification), args.Error(1)
}

type mockPaymentProcessor struct {
	mock.Mock
}

func (m *mockPaymentProcessor) HandleNotification(ctx context.Context, raw []byte) error {
	return m.Called(ctx, raw).Error(0)
}

func (m *mockPaymentProcessor) Expire(ctx context.Context, id string) (entity.Order, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Order), args.Error(1)
}

type mockOrderQueue struct {
	mock.Mock
}

func (m *mockOrderQueue) ScheduleExpiry(ctx context.Context, id string, at time.Time) error {
	return m.Called(ctx, id, at).Error(0)
}

type checkoutEnv struct {
	uc          CheckoutUseCase
	cases       *mockCaseRepo
	enrollments *mockEnrollmentRepo
	users       *mockUserRepo
	orders      *mockOrderRepo
	gateway     *mockPaymentGateway
	simulator   *mockPaymentSimulator
	payments    *mockPaymentProcessor
	queue       *mockOrderQueue
}

func newCheckoutEnv(withSimulator bool) *checkoutEnv {
	env := &checkoutEnv{
		cases: &mockCaseRepo{}, enrollments: &mockEnrollmentRepo{}, users: &mockUserRepo{}, orders: &mockOrderRepo{},
		gateway: &mockPaymentGateway{}, simulator: &mockPaymentSimulator{}, payments: &mockPaymentProcessor{}, queue: &mockOrderQueue{},
	}
	deps := CheckoutDeps{
		Cases: env.cases, Enrollments: env.enrollments, Users: env.users, Orders: env.orders,
		Gateway: env.gateway, Payments: env.payments, Queue: env.queue,
		CandidateNumber: func() int { return 2024 },
		Now:             func() time.Time { return testNow },
	}
	if withSimulator {
		deps.Simulator = env.simulator
	}
	env.uc = InitCheckoutUseCase(deps)
	return env
}

func (env *checkoutEnv) assertExpectations(t *testing.T) {
	t.Helper()
	env.cases.AssertExpectations(t)
	env.enrollments.AssertExpectations(t)
	env.orders.AssertExpectations(t)
	env.gateway.AssertExpectations(t)
	env.queue.AssertExpectations(t)
}

func pricedB2B() entity.Case {
	c := b2bBrief()
	price := 150000
	c.Price = &price
	return c
}

// expectPurchasable menyiapkan case B2B berbayar yang belum dimiliki dan belum punya order.
func (env *checkoutEnv) expectPurchasable() {
	env.cases.On("GetWithBriefByID", mock.Anything, b2bCaseID).Return(pricedB2B(), nil)
	env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, b2bCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
	env.users.On("GetByID", mock.Anything, studentID).Return(entity.User{ID: studentID, Name: "Rani", Email: "rani@simula.test"}, nil)
	env.orders.On("NextInvoiceSeq", mock.Anything).Return(int64(412), nil)
}

func TestCreateOrder_VirtualAccount(t *testing.T) {
	env := newCheckoutEnv(false)
	env.expectPurchasable()
	env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(entity.Order{}, coreErrors.ErrOrderNotFound)
	env.gateway.On("Charge", mock.Anything, mock.MatchedBy(func(req entity.ChargeRequest) bool {
		return req.Amount == 154000 && req.Method == entity.PaymentVABCA && req.CustomerEmail == "rani@simula.test"
	})).Return(entity.ChargeResult{TransactionID: "tx-1", Status: entity.GatewayPending, Details: entity.PaymentDetails{VANumber: "827712345678901"}}, nil)
	env.orders.On("Create", mock.Anything,
		mock.MatchedBy(func(o *entity.Order) bool {
			return o.InvoiceNumber == "INV/2026/10/0412" && o.Subtotal == 150000 && o.AdminFee == 4000 && o.Total == 154000 &&
				o.Status == entity.OrderAwaitingPayment && o.ExpiresAt.Equal(testNow.Add(entity.PaymentWindow))
		}),
		mock.MatchedBy(func(e *entity.Enrollment) bool {
			return e != nil && e.Status == entity.EnrollmentPendingPayment && e.CandidateNumber == 2024 &&
				e.DeadlineAt != nil && e.DeadlineAt.Equal(testNow.Add(entity.PaymentWindow))
		}),
	).Return(nil)
	env.queue.On("ScheduleExpiry", mock.Anything, mock.Anything, testNow.Add(entity.PaymentWindow)).Return(nil)

	order, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentVABCA)

	require.NoError(t, err)
	assert.Equal(t, "827712345678901", order.PaymentDetails.VANumber)
	env.assertExpectations(t)
}

func TestCreateOrder_InstantHasNoPendingEnrollment(t *testing.T) {
	env := newCheckoutEnv(false)
	env.expectPurchasable()
	env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(entity.Order{}, coreErrors.ErrOrderNotFound)
	env.gateway.On("Charge", mock.Anything, mock.MatchedBy(func(req entity.ChargeRequest) bool { return req.Amount == 150000 })).
		Return(entity.ChargeResult{TransactionID: "tx-1"}, nil)
	env.orders.On("Create", mock.Anything, mock.Anything, (*entity.Enrollment)(nil)).Return(nil)
	env.queue.On("ScheduleExpiry", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentQRIS)

	require.NoError(t, err)
	env.assertExpectations(t)
}

func TestCreateOrder_ReplacesAwaitingOrder(t *testing.T) {
	env := newCheckoutEnv(false)
	env.expectPurchasable()
	previous := entity.Order{ID: "old-order", Status: entity.OrderAwaitingPayment}
	env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(previous, nil)
	env.gateway.On("Cancel", mock.Anything, "old-order").Return(nil)
	env.orders.On("Settle", mock.Anything, mock.MatchedBy(func(s entity.OrderSettlement) bool {
		// Enrollment "Menunggu pembayaran" dipakai lagi oleh order baru.
		return s.OrderID == "old-order" && s.To == entity.OrderCancelled && !s.ReleaseEnrollment
	})).Return(nil)
	env.gateway.On("Charge", mock.Anything, mock.Anything).Return(entity.ChargeResult{TransactionID: "tx-2"}, nil)
	env.orders.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	env.queue.On("ScheduleExpiry", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentVABNI)

	require.NoError(t, err)
	env.assertExpectations(t)
}

func TestCreateOrder_Rejections(t *testing.T) {
	t.Run("invalid method", func(t *testing.T) {
		env := newCheckoutEnv(false)
		_, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentMethod("cash"))
		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"method"}, fieldNames(appErr))
	})

	t.Run("AI case needs no payment", func(t *testing.T) {
		env := newCheckoutEnv(false)
		env.cases.On("GetWithBriefByID", mock.Anything, aiCaseID).Return(aiBrief(), nil)
		_, err := env.uc.CreateOrder(asStudent(), aiCaseID, entity.PaymentQRIS)
		requireKind(t, err, apperror.KindConflict)
	})

	t.Run("already owned", func(t *testing.T) {
		env := newCheckoutEnv(false)
		env.cases.On("GetWithBriefByID", mock.Anything, b2bCaseID).Return(pricedB2B(), nil)
		env.enrollments.On("FindByUserAndCase", mock.Anything, studentID, b2bCaseID).
			Return(entity.Enrollment{ID: enrollmentID, Status: entity.EnrollmentNotStarted}, nil)
		_, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentQRIS)
		requireKind(t, err, apperror.KindConflict)
		env.gateway.AssertNotCalled(t, "Charge", mock.Anything, mock.Anything)
	})

	t.Run("unknown case", func(t *testing.T) {
		env := newCheckoutEnv(false)
		_, err := env.uc.CreateOrder(asStudent(), "not-a-uuid", entity.PaymentQRIS)
		requireKind(t, err, apperror.KindNotFound)
	})
}

func TestCreateOrder_CancelsTransactionWhenSaveFails(t *testing.T) {
	env := newCheckoutEnv(false)
	env.expectPurchasable()
	env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(entity.Order{}, coreErrors.ErrOrderNotFound)
	env.gateway.On("Charge", mock.Anything, mock.Anything).Return(entity.ChargeResult{TransactionID: "tx-1"}, nil)
	env.orders.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(coreErrors.ErrOrderAwaitingExists)
	env.gateway.On("Cancel", mock.Anything, mock.Anything).Return(nil)

	_, err := env.uc.CreateOrder(asStudent(), b2bCaseID, entity.PaymentVABCA)

	requireKind(t, err, apperror.KindConflict)
	env.gateway.AssertNumberOfCalls(t, "Cancel", 1)
	env.queue.AssertNotCalled(t, "ScheduleExpiry", mock.Anything, mock.Anything, mock.Anything)
}

func TestGetCheckout(t *testing.T) {
	t.Run("overdue order is expired when read", func(t *testing.T) {
		env := newCheckoutEnv(false)
		c := pricedB2B()
		env.cases.On("GetWithBriefBySlug", mock.Anything, "overselling").Return(c, nil)
		env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).
			Return(enrollmentWith(c, entity.EnrollmentPendingPayment), nil).Once()
		env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).
			Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound).Once()
		overdue := entity.Order{ID: checkoutOrderID, Status: entity.OrderAwaitingPayment, ExpiresAt: testNow.Add(-time.Minute)}
		env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(overdue, nil)
		expired := overdue
		expired.Status = entity.OrderExpired
		env.payments.On("Expire", mock.Anything, checkoutOrderID).Return(expired, nil)

		summary, err := env.uc.GetCheckout(asStudent(), "overselling")

		require.NoError(t, err)
		require.NotNil(t, summary.Order)
		assert.Equal(t, entity.OrderExpired, summary.Order.Status)
		assert.Nil(t, summary.Enrollment, "the pending enrollment is released together with the order")
	})

	t.Run("paid and cancelled orders are hidden", func(t *testing.T) {
		for _, status := range []entity.OrderStatus{entity.OrderPaid, entity.OrderCancelled} {
			env := newCheckoutEnv(false)
			c := pricedB2B()
			env.cases.On("GetWithBriefBySlug", mock.Anything, "overselling").Return(c, nil)
			env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
			env.orders.On("LatestForCase", mock.Anything, studentID, b2bCaseID).Return(entity.Order{ID: checkoutOrderID, Status: status}, nil)

			summary, err := env.uc.GetCheckout(asStudent(), "overselling")

			require.NoError(t, err)
			assert.Nil(t, summary.Order, status)
		}
	})
}

func TestCancelOrder(t *testing.T) {
	t.Run("cancels and releases the pending enrollment", func(t *testing.T) {
		env := newCheckoutEnv(false)
		awaiting := entity.Order{ID: checkoutOrderID, Status: entity.OrderAwaitingPayment}
		cancelled := awaiting
		cancelled.Status = entity.OrderCancelled
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(awaiting, nil).Once()
		env.gateway.On("Cancel", mock.Anything, checkoutOrderID).Return(nil)
		env.orders.On("Settle", mock.Anything, mock.MatchedBy(func(s entity.OrderSettlement) bool {
			return s.To == entity.OrderCancelled && s.ReleaseEnrollment
		})).Return(nil)
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(cancelled, nil).Once()

		order, err := env.uc.CancelOrder(asStudent(), checkoutOrderID)

		require.NoError(t, err)
		assert.Equal(t, entity.OrderCancelled, order.Status)
	})

	t.Run("not active", func(t *testing.T) {
		env := newCheckoutEnv(false)
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(entity.Order{ID: checkoutOrderID, Status: entity.OrderPaid}, nil)
		_, err := env.uc.CancelOrder(asStudent(), checkoutOrderID)
		requireKind(t, err, apperror.KindConflict)
	})

	t.Run("someone else's order", func(t *testing.T) {
		env := newCheckoutEnv(false)
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(entity.Order{}, coreErrors.ErrOrderNotFound)
		_, err := env.uc.CancelOrder(asStudent(), checkoutOrderID)
		requireKind(t, err, apperror.KindNotFound)
	})
}

func TestSimulatePayment(t *testing.T) {
	t.Run("disabled without the fake gateway", func(t *testing.T) {
		env := newCheckoutEnv(false)
		_, err := env.uc.SimulatePayment(asStudent(), checkoutOrderID, "paid")
		requireKind(t, err, apperror.KindNotFound)
	})

	t.Run("goes through the webhook pipeline", func(t *testing.T) {
		env := newCheckoutEnv(true)
		awaiting := entity.Order{ID: checkoutOrderID, Status: entity.OrderAwaitingPayment}
		paid := awaiting
		paid.Status = entity.OrderPaid
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(awaiting, nil).Once()
		env.simulator.On("Simulate", mock.Anything, awaiting, entity.GatewaySettlement).
			Return(entity.PaymentNotification{OrderID: checkoutOrderID, TransactionStatus: entity.GatewaySettlement}, nil)
		env.payments.On("HandleNotification", mock.Anything, mock.MatchedBy(func(raw []byte) bool {
			return len(raw) > 0
		})).Return(nil)
		env.orders.On("GetForUser", mock.Anything, studentID, checkoutOrderID).Return(paid, nil).Once()

		order, err := env.uc.SimulatePayment(asStudent(), checkoutOrderID, "paid")

		require.NoError(t, err)
		assert.Equal(t, entity.OrderPaid, order.Status)
		env.payments.AssertExpectations(t)
	})

	t.Run("unknown outcome", func(t *testing.T) {
		env := newCheckoutEnv(true)
		_, err := env.uc.SimulatePayment(asStudent(), checkoutOrderID, "refund")
		requireKind(t, err, apperror.KindValidation)
	})
}

func TestStartWork_StartWindowExpired(t *testing.T) {
	env := newWorkspaceEnv()
	enrollment := enrollmentWith(b2bBrief(), entity.EnrollmentNotStarted)
	startBy := testNow.Add(-time.Hour)
	enrollment.DeadlineAt = &startBy
	env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollment, nil)

	_, err := env.uc.StartWork(asStudent(), enrollmentID)

	requireKind(t, err, apperror.KindConflict)
	env.enrollments.AssertNotCalled(t, "Start", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}
