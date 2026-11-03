package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// OrderStatus adalah status order B2B. Nilainya sama dengan TOrderStatus di client.
type OrderStatus string

const (
	OrderAwaitingPayment OrderStatus = "awaiting_payment"
	OrderPaid            OrderStatus = "paid"
	OrderFailed          OrderStatus = "failed"
	OrderExpired         OrderStatus = "expired"
	// OrderCancelled dipakai saat peserta mengganti metode bayar.
	OrderCancelled OrderStatus = "cancelled"
)

// PaymentMethod adalah metode bayar. Nilainya sama dengan TPaymentMethod di client.
type PaymentMethod string

const (
	PaymentVABCA     PaymentMethod = "va_bca"
	PaymentVAMandiri PaymentMethod = "va_mandiri"
	PaymentVABNI     PaymentMethod = "va_bni"
	PaymentQRIS      PaymentMethod = "qris"
	PaymentGoPay     PaymentMethod = "gopay"
)

// IsValid memeriksa apakah metode dikenal.
func (m PaymentMethod) IsValid() bool {
	switch m {
	case PaymentVABCA, PaymentVAMandiri, PaymentVABNI, PaymentQRIS, PaymentGoPay:
		return true
	}
	return false
}

// IsVirtualAccount bernilai true untuk transfer VA: order menunggu dulu sampai dana masuk, dan case
// masuk Case Saya sebagai "Menunggu pembayaran". QRIS dan GoPay dikonfirmasi langsung.
func (m PaymentMethod) IsVirtualAccount() bool {
	return m == PaymentVABCA || m == PaymentVAMandiri || m == PaymentVABNI
}

// AdminFee adalah biaya admin per metode (rupiah), sama dengan constants/payment.ts di client.
// Harga final selalu dihitung server.
func (m PaymentMethod) AdminFee() int {
	if m.IsVirtualAccount() {
		return 4000
	}
	return 0
}

// Aturan checkout (CONTEXT.md §4.6 dan §7).
const (
	// PaymentWindow adalah batas bayar sejak order dibuat.
	PaymentWindow = 24 * time.Hour
	// B2BStartWindowDays adalah batas mulai mengerjakan B2B case sejak lunas (hari kalender).
	B2BStartWindowDays = 30
)

// StartDeadline adalah batas klik "Mulai mengerjakan" untuk B2B case yang baru lunas.
func StartDeadline(paidAt time.Time) time.Time {
	return paidAt.AddDate(0, 0, B2BStartWindowDays)
}

// PaymentDetails adalah instruksi bayar dari payment gateway (kolom payment_details), bentuknya
// berbeda per metode.
type PaymentDetails struct {
	VANumber    string `json:"vaNumber,omitempty"`
	BillerCode  string `json:"billerCode,omitempty"`
	BillKey     string `json:"billKey,omitempty"`
	QRURL       string `json:"qrUrl,omitempty"`
	DeeplinkURL string `json:"deeplinkUrl,omitempty"`
}

// Value menyimpan PaymentDetails sebagai jsonb.
func (d PaymentDetails) Value() (driver.Value, error) {
	raw, err := json.Marshal(d)
	if err != nil {
		return nil, fmt.Errorf("failed to encode PaymentDetails: %w", err)
	}
	return string(raw), nil
}

// Scan membaca PaymentDetails dari jsonb.
func (d *PaymentDetails) Scan(value any) error {
	var raw []byte
	switch v := value.(type) {
	case nil:
		*d = PaymentDetails{}
		return nil
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported type %T for PaymentDetails", value)
	}
	return json.Unmarshal(raw, d)
}

// TransferNumber adalah nomor yang ditransfer peserta: nomor VA, atau bill key untuk Mandiri.
func (d PaymentDetails) TransferNumber() string {
	if d.VANumber != "" {
		return d.VANumber
	}
	return d.BillKey
}

// Order adalah baris tabel orders.
type Order struct {
	ID                   string
	InvoiceNumber        string
	UserID               string
	CaseID               string
	EnrollmentID         *string
	Method               PaymentMethod
	Status               OrderStatus
	Subtotal             int
	AdminFee             int
	Total                int
	ExpiresAt            time.Time
	PaidAt               *time.Time
	GatewayTransactionID *string
	GatewayStatus        string
	PaymentDetails       PaymentDetails
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// IsOverdue bernilai true bila order masih menunggu tetapi sudah lewat batas bayar.
func (o *Order) IsOverdue(now time.Time) bool {
	return o.Status == OrderAwaitingPayment && !now.Before(o.ExpiresAt)
}

// InvoiceNumber menyusun nomor invoice INV/YYYY/MM/NNNN dari nomor urut database (WIB).
func InvoiceNumber(now time.Time, seq int64) string {
	local := now.In(jakarta)
	return fmt.Sprintf("INV/%04d/%02d/%04d", local.Year(), int(local.Month()), seq)
}

// OrderSettlement adalah perubahan status order yang sudah final.
type OrderSettlement struct {
	OrderID string
	To      OrderStatus
	// GatewayStatus dan TransactionID disalin dari payment gateway bila ada.
	GatewayStatus string
	TransactionID string
	At            time.Time
	// ReleaseEnrollment melepas enrollment "Menunggu pembayaran" (order gagal, kedaluwarsa, atau
	// dibatalkan tanpa diganti order baru).
	ReleaseEnrollment bool
}

// ChargeRequest adalah permintaan membuat transaksi ke payment gateway.
type ChargeRequest struct {
	OrderID       string
	Method        PaymentMethod
	Amount        int
	ExpiresAt     time.Time
	CustomerName  string
	CustomerEmail string
}

// ChargeResult adalah jawaban payment gateway saat transaksi dibuat.
type ChargeResult struct {
	TransactionID string
	Status        string
	Details       PaymentDetails
}

// Status transaksi Midtrans (transaction_status).
const (
	GatewayPending    = "pending"
	GatewaySettlement = "settlement"
	GatewayCapture    = "capture"
	GatewayDeny       = "deny"
	GatewayCancel     = "cancel"
	GatewayExpire     = "expire"
	GatewayFailure    = "failure"
)

// GatewayTransaction adalah status transaksi menurut payment gateway (API status).
type GatewayTransaction struct {
	OrderID           string
	TransactionID     string
	TransactionStatus string
	FraudStatus       string
	GrossAmount       string
}

// OrderStatusFor memetakan status transaksi gateway ke status order. ok bernilai false bila status
// belum final (misalnya masih pending), sehingga order tidak diubah.
func OrderStatusFor(transactionStatus, fraudStatus string) (OrderStatus, bool) {
	switch transactionStatus {
	case GatewaySettlement:
		return OrderPaid, true
	case GatewayCapture:
		// Kartu kredit: capture baru dianggap lunas bila lolos fraud check.
		if fraudStatus == "" || strings.EqualFold(fraudStatus, "accept") {
			return OrderPaid, true
		}
		return "", false
	case GatewayDeny, GatewayFailure:
		return OrderFailed, true
	case GatewayCancel:
		return OrderCancelled, true
	case GatewayExpire:
		return OrderExpired, true
	}
	return "", false
}

// PaymentNotification adalah notifikasi webhook payment gateway (Midtrans HTTP notification).
type PaymentNotification struct {
	OrderID           string `json:"order_id"`
	TransactionID     string `json:"transaction_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	PaymentType       string `json:"payment_type"`
	SignatureKey      string `json:"signature_key"`
}

// PaymentNotificationRecord adalah baris tabel payment_notifications: semua notifikasi dicatat,
// termasuk yang signature-nya tidak valid, untuk audit.
type PaymentNotificationRecord struct {
	ID                string
	OrderID           *string
	GatewayOrderID    string
	TransactionStatus string
	StatusCode        string
	GrossAmount       string
	IsSignatureValid  bool
	Payload           json.RawMessage `gorm:"type:jsonb"`
	ReceivedAt        time.Time
	ProcessedAt       *time.Time
}

// TableName mengikuti nama tabel di migrasi.
func (PaymentNotificationRecord) TableName() string {
	return "payment_notifications"
}

// GrossAmount memformat nominal seperti Midtrans ("154000.00").
func GrossAmount(total int) string {
	return fmt.Sprintf("%d.00", total)
}
