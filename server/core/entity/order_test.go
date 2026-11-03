package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestOrderStatusFor(t *testing.T) {
	tests := []struct {
		status, fraud string
		want          OrderStatus
		final         bool
	}{
		{status: GatewaySettlement, want: OrderPaid, final: true},
		{status: GatewayCapture, fraud: "accept", want: OrderPaid, final: true},
		{status: GatewayCapture, fraud: "challenge", final: false},
		{status: GatewayPending, final: false},
		{status: GatewayDeny, want: OrderFailed, final: true},
		{status: GatewayFailure, want: OrderFailed, final: true},
		{status: GatewayCancel, want: OrderCancelled, final: true},
		{status: GatewayExpire, want: OrderExpired, final: true},
		{status: "refund", final: false},
	}
	for _, tc := range tests {
		t.Run(tc.status+"/"+tc.fraud, func(t *testing.T) {
			got, final := OrderStatusFor(tc.status, tc.fraud)
			assert.Equal(t, tc.final, final)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestPaymentMethod(t *testing.T) {
	assert.True(t, PaymentVABCA.IsVirtualAccount())
	assert.True(t, PaymentVAMandiri.IsVirtualAccount())
	assert.False(t, PaymentQRIS.IsVirtualAccount())
	assert.Equal(t, 4000, PaymentVABNI.AdminFee())
	assert.Equal(t, 0, PaymentGoPay.AdminFee())
	assert.False(t, PaymentMethod("cash").IsValid())
}

func TestInvoiceNumber(t *testing.T) {
	// 31 Okt 2026 20:00 UTC sudah 1 November di WIB.
	at := time.Date(2026, 10, 31, 20, 0, 0, 0, time.UTC)
	assert.Equal(t, "INV/2026/11/0042", InvoiceNumber(at, 42))
	assert.Equal(t, "INV/2026/11/12345", InvoiceNumber(at, 12345))
}

func TestOrderIsOverdue(t *testing.T) {
	now := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	order := Order{Status: OrderAwaitingPayment, ExpiresAt: now}
	assert.True(t, order.IsOverdue(now))
	assert.False(t, order.IsOverdue(now.Add(-time.Second)))
	order.Status = OrderPaid
	assert.False(t, order.IsOverdue(now.Add(time.Hour)))
}

func TestPaymentDetails(t *testing.T) {
	assert.Equal(t, "8277123", PaymentDetails{VANumber: "8277123"}.TransferNumber())
	assert.Equal(t, "990011", PaymentDetails{BillerCode: "70012", BillKey: "990011"}.TransferNumber())

	var scanned PaymentDetails
	value, err := PaymentDetails{VANumber: "8277"}.Value()
	assert.NoError(t, err)
	assert.NoError(t, scanned.Scan(value))
	assert.Equal(t, "8277", scanned.VANumber)
}

func TestStartDeadline(t *testing.T) {
	paidAt := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	assert.Equal(t, time.Date(2026, 12, 3, 10, 0, 0, 0, time.UTC), StartDeadline(paidAt))
	assert.Equal(t, "154000.00", GrossAmount(154000))
}
