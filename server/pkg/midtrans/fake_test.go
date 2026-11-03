package midtrans

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

func TestSignature(t *testing.T) {
	// Rumus dokumentasi Midtrans: SHA512(order_id + status_code + gross_amount + server key).
	got := Signature("order-1", "200", "154000.00", "key")
	assert.Len(t, got, 128)
	assert.Equal(t, got, Signature("order-1", "200", "154000.00", "key"))
	assert.NotEqual(t, got, Signature("order-1", "200", "154000.01", "key"))
}

func TestFake_ChargeDetails(t *testing.T) {
	fake := NewFake()
	tests := map[entity.PaymentMethod]func(entity.PaymentDetails) bool{
		entity.PaymentVABCA:     func(d entity.PaymentDetails) bool { return len(d.VANumber) == 15 },
		entity.PaymentVABNI:     func(d entity.PaymentDetails) bool { return len(d.VANumber) == 16 },
		entity.PaymentVAMandiri: func(d entity.PaymentDetails) bool { return d.BillerCode != "" && len(d.BillKey) == 12 },
		entity.PaymentQRIS:      func(d entity.PaymentDetails) bool { return d.QRURL != "" },
		entity.PaymentGoPay:     func(d entity.PaymentDetails) bool { return d.DeeplinkURL != "" },
	}
	for method, valid := range tests {
		t.Run(string(method), func(t *testing.T) {
			result, err := fake.Charge(context.Background(), entity.ChargeRequest{OrderID: "o-" + string(method), Method: method, Amount: 1000})
			require.NoError(t, err)
			assert.Equal(t, entity.GatewayPending, result.Status)
			assert.True(t, valid(result.Details), "%+v", result.Details)
		})
	}
}

func TestFake_SimulateProducesVerifiableNotification(t *testing.T) {
	fake := NewFake()
	ctx := context.Background()
	_, err := fake.Charge(ctx, entity.ChargeRequest{OrderID: "order-1", Method: entity.PaymentQRIS, Amount: 150000})
	require.NoError(t, err)
	order := entity.Order{ID: "order-1", Method: entity.PaymentQRIS, Total: 150000}

	notification, err := fake.Simulate(ctx, order, entity.GatewaySettlement)

	require.NoError(t, err)
	assert.True(t, fake.VerifySignature(notification))
	assert.Equal(t, "150000.00", notification.GrossAmount)
	assert.Equal(t, "200", notification.StatusCode)
	status, err := fake.GetStatus(ctx, "order-1")
	require.NoError(t, err)
	assert.Equal(t, entity.GatewaySettlement, status.TransactionStatus)

	tampered := notification
	tampered.GrossAmount = "1.00"
	assert.False(t, fake.VerifySignature(tampered))
}

func TestFake_CancelAndUnknownOrder(t *testing.T) {
	fake := NewFake()
	ctx := context.Background()
	_, err := fake.Charge(ctx, entity.ChargeRequest{OrderID: "order-1", Method: entity.PaymentVABCA, Amount: 1000})
	require.NoError(t, err)

	require.NoError(t, fake.Cancel(ctx, "order-1"))
	status, _ := fake.GetStatus(ctx, "order-1")
	assert.Equal(t, entity.GatewayCancel, status.TransactionStatus)

	unknown, err := fake.GetStatus(ctx, "missing")
	require.NoError(t, err)
	assert.Equal(t, entity.GatewayPending, unknown.TransactionStatus)

	_, err = fake.Simulate(ctx, entity.Order{ID: "order-1"}, "refund")
	assert.Error(t, err)
}

func TestDisabled(t *testing.T) {
	_, err := Disabled{}.Charge(context.Background(), entity.ChargeRequest{})
	assert.Error(t, err)
	assert.False(t, Disabled{}.VerifySignature(entity.PaymentNotification{}))
}
