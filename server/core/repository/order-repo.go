package repository

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// OrderRepository menyimpan order B2B dan notifikasi payment gateway.
type OrderRepository interface {
	// NextInvoiceSeq mengambil nomor urut invoice berikutnya (invoice_number_seq).
	NextInvoiceSeq(ctx context.Context) (int64, error)
	// Create menyimpan order baru. Bila pending diisi (VA), enrollment "Menunggu pembayaran" dibuat
	// atau batas bayarnya diperbarui dalam transaksi yang sama, lalu dihubungkan ke order.
	// Mengembalikan coreErrors.ErrCandidateNumberTaken bila nomor kandidat bentrok (pemanggil
	// mencoba lagi dengan nomor lain) dan coreErrors.ErrOrderAwaitingExists bila peserta masih punya
	// order yang menunggu untuk case ini.
	Create(ctx context.Context, order *entity.Order, pending *entity.Enrollment) error
	// GetByID mengembalikan coreErrors.ErrOrderNotFound bila tidak ada.
	GetByID(ctx context.Context, orderID string) (entity.Order, error)
	// GetForUser sama dengan GetByID, tetapi hanya order milik userID.
	GetForUser(ctx context.Context, userID, orderID string) (entity.Order, error)
	// LatestForCase mengembalikan order terbaru peserta untuk case, atau coreErrors.ErrOrderNotFound.
	LatestForCase(ctx context.Context, userID, caseID string) (entity.Order, error)
	// Settle mengubah order yang masih menunggu ke status final, sekaligus melepas enrollment
	// "Menunggu pembayaran" bila diminta. Mengembalikan coreErrors.ErrStatusConflict bila order sudah
	// tidak menunggu.
	Settle(ctx context.Context, settlement entity.OrderSettlement) error
	// LinkEnrollment menghubungkan order lunas ke enrollment-nya.
	LinkEnrollment(ctx context.Context, orderID, enrollmentID string) error
	// RecordNotification mencatat notifikasi webhook (termasuk yang signature-nya tidak valid).
	RecordNotification(ctx context.Context, record *entity.PaymentNotificationRecord) error
	// MarkNotificationProcessed menandai notifikasi sudah diproses.
	MarkNotificationProcessed(ctx context.Context, id string, now time.Time) error
}

// PaymentGateway adalah payment gateway (Midtrans Core API, atau gateway palsu saat development).
type PaymentGateway interface {
	// Charge membuat transaksi dan mengembalikan instruksi bayar.
	Charge(ctx context.Context, req entity.ChargeRequest) (entity.ChargeResult, error)
	// Cancel membatalkan transaksi yang masih menunggu.
	Cancel(ctx context.Context, orderID string) error
	// GetStatus menanyakan status transaksi langsung ke gateway, dipakai untuk mengonfirmasi
	// notifikasi webhook sebelum data diubah.
	GetStatus(ctx context.Context, orderID string) (entity.GatewayTransaction, error)
	// VerifySignature memeriksa signature notifikasi dengan perbandingan waktu konstan.
	VerifySignature(notification entity.PaymentNotification) bool
}

// PaymentSimulator hanya diimplementasikan gateway palsu: membuat notifikasi bertanda tangan valid
// seperti simulator sandbox Midtrans, lalu notifikasi itu diproses lewat jalur webhook yang sama.
type PaymentSimulator interface {
	Simulate(ctx context.Context, order entity.Order, transactionStatus string) (entity.PaymentNotification, error)
}

// OrderQueue menjadwalkan task order. Penjadwalan ganda untuk order yang sama diabaikan.
type OrderQueue interface {
	ScheduleExpiry(ctx context.Context, orderID string, at time.Time) error
}
