// Package midtrans berisi implementasi coreRepo.PaymentGateway. Fake dipakai selama development
// (PAYMENT_PROVIDER=fake) dan ditolak di production; klien Midtrans Core API menyusul di package
// yang sama dengan format notifikasi dan signature yang sama.
package midtrans

import (
	"context"
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
)

// FakeServerKey menandatangani notifikasi gateway palsu. Bukan rahasia: hanya berlaku di development.
const FakeServerKey = "fake-server-key"

// Signature menghitung signature_key notifikasi Midtrans: SHA512(order_id + status_code +
// gross_amount + server key).
func Signature(orderID, statusCode, grossAmount, serverKey string) string {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	return hex.EncodeToString(sum[:])
}

// statusCodes adalah status_code Midtrans per transaction_status.
var statusCodes = map[string]string{
	entity.GatewaySettlement: "200",
	entity.GatewayCapture:    "200",
	entity.GatewayCancel:     "200",
	entity.GatewayPending:    "201",
	entity.GatewayDeny:       "202",
	entity.GatewayFailure:    "202",
	entity.GatewayExpire:     "407",
}

type fakeTransaction struct {
	transactionID string
	status        string
	grossAmount   string
}

// Fake meniru Midtrans Core API di memori proses. Status transaksi hilang saat server restart;
// order yang tidak dikenal dianggap masih pending.
type Fake struct {
	mu           sync.Mutex
	transactions map[string]fakeTransaction
}

// NewFake membuat gateway palsu.
func NewFake() *Fake {
	return &Fake{transactions: make(map[string]fakeTransaction)}
}

// Charge mengimplementasikan coreRepo.PaymentGateway.
func (f *Fake) Charge(_ context.Context, req entity.ChargeRequest) (entity.ChargeResult, error) {
	details, err := fakeDetails(req)
	if err != nil {
		return entity.ChargeResult{}, err
	}
	txn := fakeTransaction{transactionID: uuid.NewString(), status: entity.GatewayPending, grossAmount: entity.GrossAmount(req.Amount)}
	f.mu.Lock()
	f.transactions[req.OrderID] = txn
	f.mu.Unlock()
	return entity.ChargeResult{TransactionID: txn.transactionID, Status: txn.status, Details: details}, nil
}

// Cancel mengimplementasikan coreRepo.PaymentGateway.
func (f *Fake) Cancel(_ context.Context, orderID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if txn, ok := f.transactions[orderID]; ok && txn.status == entity.GatewayPending {
		txn.status = entity.GatewayCancel
		f.transactions[orderID] = txn
	}
	return nil
}

// GetStatus mengimplementasikan coreRepo.PaymentGateway.
func (f *Fake) GetStatus(_ context.Context, orderID string) (entity.GatewayTransaction, error) {
	f.mu.Lock()
	txn, ok := f.transactions[orderID]
	f.mu.Unlock()
	if !ok {
		return entity.GatewayTransaction{OrderID: orderID, TransactionStatus: entity.GatewayPending}, nil
	}
	return entity.GatewayTransaction{
		OrderID:           orderID,
		TransactionID:     txn.transactionID,
		TransactionStatus: txn.status,
		GrossAmount:       txn.grossAmount,
	}, nil
}

// VerifySignature mengimplementasikan coreRepo.PaymentGateway.
func (f *Fake) VerifySignature(n entity.PaymentNotification) bool {
	return secure.Equal(n.SignatureKey, Signature(n.OrderID, n.StatusCode, n.GrossAmount, FakeServerKey))
}

// Simulate mengimplementasikan coreRepo.PaymentSimulator: mengubah status transaksi lalu membuat
// notifikasi bertanda tangan valid, seperti simulator sandbox Midtrans.
func (f *Fake) Simulate(_ context.Context, order entity.Order, transactionStatus string) (entity.PaymentNotification, error) {
	statusCode, ok := statusCodes[transactionStatus]
	if !ok {
		return entity.PaymentNotification{}, fmt.Errorf("unsupported transaction status %q", transactionStatus)
	}
	gross := entity.GrossAmount(order.Total)
	f.mu.Lock()
	txn, known := f.transactions[order.ID]
	if !known {
		txn = fakeTransaction{transactionID: uuid.NewString(), grossAmount: gross}
		if order.GatewayTransactionID != nil {
			txn.transactionID = *order.GatewayTransactionID
		}
	}
	txn.status = transactionStatus
	f.transactions[order.ID] = txn
	f.mu.Unlock()

	return entity.PaymentNotification{
		OrderID:           order.ID,
		TransactionID:     txn.transactionID,
		TransactionStatus: transactionStatus,
		StatusCode:        statusCode,
		GrossAmount:       gross,
		PaymentType:       paymentType(order.Method),
		SignatureKey:      Signature(order.ID, statusCode, gross, FakeServerKey),
	}, nil
}

// fakeDetails membuat instruksi bayar dengan bentuk yang sama seperti respons Midtrans.
func fakeDetails(req entity.ChargeRequest) (entity.PaymentDetails, error) {
	switch req.Method {
	case entity.PaymentVABCA:
		number, err := randomDigits(11)
		return entity.PaymentDetails{VANumber: "8277" + number}, err
	case entity.PaymentVABNI:
		number, err := randomDigits(12)
		return entity.PaymentDetails{VANumber: "9880" + number}, err
	case entity.PaymentVAMandiri:
		key, err := randomDigits(12)
		return entity.PaymentDetails{BillerCode: "70012", BillKey: key}, err
	case entity.PaymentQRIS:
		return entity.PaymentDetails{QRURL: "https://fake-gateway.local/qris/" + req.OrderID}, nil
	case entity.PaymentGoPay:
		return entity.PaymentDetails{
			QRURL:       "https://fake-gateway.local/gopay/qr/" + req.OrderID,
			DeeplinkURL: "https://fake-gateway.local/gopay/deeplink/" + req.OrderID,
		}, nil
	}
	return entity.PaymentDetails{}, fmt.Errorf("unsupported payment method %q", req.Method)
}

func paymentType(method entity.PaymentMethod) string {
	switch method {
	case entity.PaymentQRIS:
		return "qris"
	case entity.PaymentGoPay:
		return "gopay"
	case entity.PaymentVAMandiri:
		return "echannel"
	}
	return "bank_transfer"
}

func randomDigits(n int) (string, error) {
	digits := make([]byte, n)
	for i := range digits {
		value, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", fmt.Errorf("failed to generate digits: %w", err)
		}
		digits[i] = byte('0' + value.Int64())
	}
	return string(digits), nil
}

// Disabled dipakai saat PAYMENT_PROVIDER kosong: checkout ditolak dengan
// coreErrors.ErrPaymentDisabled dan webhook tidak pernah dianggap valid.
type Disabled struct{}

// Charge mengimplementasikan coreRepo.PaymentGateway.
func (Disabled) Charge(context.Context, entity.ChargeRequest) (entity.ChargeResult, error) {
	return entity.ChargeResult{}, coreErrors.ErrPaymentDisabled
}

// Cancel mengimplementasikan coreRepo.PaymentGateway.
func (Disabled) Cancel(context.Context, string) error { return nil }

// GetStatus mengimplementasikan coreRepo.PaymentGateway.
func (Disabled) GetStatus(context.Context, string) (entity.GatewayTransaction, error) {
	return entity.GatewayTransaction{}, coreErrors.ErrPaymentDisabled
}

// VerifySignature mengimplementasikan coreRepo.PaymentGateway.
func (Disabled) VerifySignature(entity.PaymentNotification) bool { return false }
