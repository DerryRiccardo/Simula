package shared

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
)

const orderID = "6b0f8a52-3d5f-4a8e-9a77-2f0c5c1d9e01"

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

type mockGateway struct {
	mock.Mock
}

func (m *mockGateway) Charge(ctx context.Context, req entity.ChargeRequest) (entity.ChargeResult, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(entity.ChargeResult), args.Error(1)
}

func (m *mockGateway) Cancel(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}

func (m *mockGateway) GetStatus(ctx context.Context, id string) (entity.GatewayTransaction, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.GatewayTransaction), args.Error(1)
}

func (m *mockGateway) VerifySignature(n entity.PaymentNotification) bool {
	return m.Called(n).Bool(0)
}

type paymentEnv struct {
	svc     *PaymentService
	orders  *mockOrderRepo
	gateway *mockGateway
	paid    []entity.Order
}

func newPaymentEnv() *paymentEnv {
	env := &paymentEnv{orders: &mockOrderRepo{}, gateway: &mockGateway{}}
	env.svc = NewPaymentService(PaymentDeps{
		Orders: env.orders, Gateway: env.gateway,
		OnOrderPaid: func(_ context.Context, order entity.Order) error {
			env.paid = append(env.paid, order)
			return nil
		},
		Now: func() time.Time { return testNow },
	})
	return env
}

func awaitingOrder() entity.Order {
	return entity.Order{ID: orderID, Status: entity.OrderAwaitingPayment, Total: 154000, ExpiresAt: testNow.Add(time.Hour)}
}

func notificationJSON(t *testing.T, status string) []byte {
	t.Helper()
	raw, err := json.Marshal(entity.PaymentNotification{
		OrderID: orderID, TransactionStatus: status, StatusCode: "200", GrossAmount: "154000.00", SignatureKey: "sig",
	})
	require.NoError(t, err)
	return raw
}

func TestHandleNotification_PaidActivatesOrder(t *testing.T) {
	env := newPaymentEnv()
	paid := awaitingOrder()
	paid.Status = entity.OrderPaid
	env.gateway.On("VerifySignature", mock.Anything).Return(true)
	env.orders.On("GetByID", mock.Anything, orderID).Return(awaitingOrder(), nil).Once()
	env.orders.On("RecordNotification", mock.Anything, mock.MatchedBy(func(r *entity.PaymentNotificationRecord) bool {
		return r.IsSignatureValid && r.OrderID != nil && *r.OrderID == orderID && len(r.Payload) > 0
	})).Return(nil)
	env.gateway.On("GetStatus", mock.Anything, orderID).
		Return(entity.GatewayTransaction{TransactionStatus: entity.GatewaySettlement, TransactionID: "tx-1", GrossAmount: "154000.00"}, nil)
	env.orders.On("Settle", mock.Anything, entity.OrderSettlement{
		OrderID: orderID, To: entity.OrderPaid, GatewayStatus: entity.GatewaySettlement, TransactionID: "tx-1", At: testNow,
	}).Return(nil)
	env.orders.On("GetByID", mock.Anything, orderID).Return(paid, nil).Once()
	env.orders.On("MarkNotificationProcessed", mock.Anything, mock.Anything, testNow).Return(nil)

	require.NoError(t, env.svc.HandleNotification(context.Background(), notificationJSON(t, entity.GatewaySettlement)))

	require.Len(t, env.paid, 1)
	env.orders.AssertExpectations(t)
	env.gateway.AssertExpectations(t)
}

func TestHandleNotification_DuplicatePaidStillRunsHook(t *testing.T) {
	env := newPaymentEnv()
	paid := awaitingOrder()
	paid.Status = entity.OrderPaid
	env.gateway.On("VerifySignature", mock.Anything).Return(true)
	env.orders.On("GetByID", mock.Anything, orderID).Return(paid, nil)
	env.orders.On("RecordNotification", mock.Anything, mock.Anything).Return(nil)
	env.gateway.On("GetStatus", mock.Anything, orderID).
		Return(entity.GatewayTransaction{TransactionStatus: entity.GatewaySettlement, GrossAmount: "154000.00"}, nil)
	env.orders.On("Settle", mock.Anything, mock.Anything).Return(coreErrors.ErrStatusConflict)
	env.orders.On("MarkNotificationProcessed", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	require.NoError(t, env.svc.HandleNotification(context.Background(), notificationJSON(t, entity.GatewaySettlement)))

	assert.Len(t, env.paid, 1, "hook is idempotent, so a retried webhook finishes any failed activation")
}

func TestHandleNotification_InvalidSignatureIsOnlyRecorded(t *testing.T) {
	env := newPaymentEnv()
	env.gateway.On("VerifySignature", mock.Anything).Return(false)
	env.orders.On("GetByID", mock.Anything, orderID).Return(awaitingOrder(), nil)
	env.orders.On("RecordNotification", mock.Anything, mock.MatchedBy(func(r *entity.PaymentNotificationRecord) bool {
		return !r.IsSignatureValid
	})).Return(nil)

	require.NoError(t, env.svc.HandleNotification(context.Background(), notificationJSON(t, entity.GatewaySettlement)))

	env.gateway.AssertNotCalled(t, "GetStatus", mock.Anything, mock.Anything)
	env.orders.AssertNotCalled(t, "Settle", mock.Anything, mock.Anything)
	assert.Empty(t, env.paid)
}

func TestHandleNotification_Malformed(t *testing.T) {
	env := newPaymentEnv()
	assert.Error(t, env.svc.HandleNotification(context.Background(), []byte("not json")))
	assert.Error(t, env.svc.HandleNotification(context.Background(), []byte(`{"transaction_status":"settlement"}`)))
}

func TestSync(t *testing.T) {
	t.Run("pending leaves the order untouched", func(t *testing.T) {
		env := newPaymentEnv()
		env.gateway.On("GetStatus", mock.Anything, orderID).Return(entity.GatewayTransaction{TransactionStatus: entity.GatewayPending}, nil)

		order, err := env.svc.Sync(context.Background(), awaitingOrder())

		require.NoError(t, err)
		assert.Equal(t, entity.OrderAwaitingPayment, order.Status)
		env.orders.AssertNotCalled(t, "Settle", mock.Anything, mock.Anything)
	})

	t.Run("amount mismatch is not activated", func(t *testing.T) {
		env := newPaymentEnv()
		env.gateway.On("GetStatus", mock.Anything, orderID).
			Return(entity.GatewayTransaction{TransactionStatus: entity.GatewaySettlement, GrossAmount: "1000.00"}, nil)

		_, err := env.svc.Sync(context.Background(), awaitingOrder())

		require.NoError(t, err)
		env.orders.AssertNotCalled(t, "Settle", mock.Anything, mock.Anything)
		assert.Empty(t, env.paid)
	})

	t.Run("deny fails the order and releases the enrollment", func(t *testing.T) {
		env := newPaymentEnv()
		failed := awaitingOrder()
		failed.Status = entity.OrderFailed
		env.gateway.On("GetStatus", mock.Anything, orderID).Return(entity.GatewayTransaction{TransactionStatus: entity.GatewayDeny}, nil)
		env.orders.On("Settle", mock.Anything, mock.MatchedBy(func(s entity.OrderSettlement) bool {
			return s.To == entity.OrderFailed && s.ReleaseEnrollment
		})).Return(nil)
		env.orders.On("GetByID", mock.Anything, orderID).Return(failed, nil)

		order, err := env.svc.Sync(context.Background(), awaitingOrder())

		require.NoError(t, err)
		assert.Equal(t, entity.OrderFailed, order.Status)
		assert.Empty(t, env.paid)
	})
}

func TestExpire(t *testing.T) {
	t.Run("not due yet", func(t *testing.T) {
		env := newPaymentEnv()
		env.orders.On("GetByID", mock.Anything, orderID).Return(awaitingOrder(), nil)

		order, err := env.svc.Expire(context.Background(), orderID)

		require.NoError(t, err)
		assert.Equal(t, entity.OrderAwaitingPayment, order.Status)
		env.orders.AssertNotCalled(t, "Settle", mock.Anything, mock.Anything)
	})

	t.Run("overdue is expired at the gateway and locally", func(t *testing.T) {
		env := newPaymentEnv()
		overdue := awaitingOrder()
		overdue.ExpiresAt = testNow.Add(-time.Minute)
		expired := overdue
		expired.Status = entity.OrderExpired
		env.orders.On("GetByID", mock.Anything, orderID).Return(overdue, nil).Once()
		env.gateway.On("Cancel", mock.Anything, orderID).Return(nil)
		env.orders.On("Settle", mock.Anything, mock.MatchedBy(func(s entity.OrderSettlement) bool {
			return s.To == entity.OrderExpired && s.ReleaseEnrollment
		})).Return(nil)
		env.orders.On("GetByID", mock.Anything, orderID).Return(expired, nil).Once()

		order, err := env.svc.Expire(context.Background(), orderID)

		require.NoError(t, err)
		assert.Equal(t, entity.OrderExpired, order.Status)
		env.orders.AssertExpectations(t)
	})

	t.Run("already paid is ignored", func(t *testing.T) {
		env := newPaymentEnv()
		paid := awaitingOrder()
		paid.Status = entity.OrderPaid
		paid.ExpiresAt = testNow.Add(-time.Hour)
		env.orders.On("GetByID", mock.Anything, orderID).Return(paid, nil)

		_, err := env.svc.Expire(context.Background(), orderID)

		require.NoError(t, err)
		env.orders.AssertNotCalled(t, "Settle", mock.Anything, mock.Anything)
	})
}
