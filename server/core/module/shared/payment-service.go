package shared

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

// PaymentDeps adalah dependency PaymentService.
type PaymentDeps struct {
	Orders  coreRepo.OrderRepository
	Gateway coreRepo.PaymentGateway
	// OnOrderPaid menjalankan efek order lunas (hook.OnOrderPaid). Dipanggil ulang dengan aman.
	OnOrderPaid func(ctx context.Context, order entity.Order) error
	Now         func() time.Time
}

// PaymentService menerapkan status pembayaran dari payment gateway ke order. Webhook, simulator
// gateway palsu, dan task kedaluwarsa memakai jalur yang sama, jadi aturannya hanya ada di sini.
type PaymentService struct {
	PaymentDeps
}

// NewPaymentService membuat PaymentService.
func NewPaymentService(deps PaymentDeps) *PaymentService {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &PaymentService{PaymentDeps: deps}
}

// HandleNotification memproses notifikasi webhook (RULES.md §12): mencatat notifikasi, memeriksa
// signature, mengonfirmasi status ke API gateway, lalu menerapkannya. Notifikasi dengan signature
// tidak valid hanya dicatat. Error berarti gateway sebaiknya mengirim ulang.
func (s *PaymentService) HandleNotification(ctx context.Context, raw []byte) error {
	var notification entity.PaymentNotification
	if err := json.Unmarshal(raw, &notification); err != nil || notification.OrderID == "" {
		return apperror.BadRequest("Notifikasi pembayaran tidak valid.")
	}
	now := s.Now()
	record := entity.PaymentNotificationRecord{
		ID:                uuid.NewString(),
		GatewayOrderID:    notification.OrderID,
		TransactionStatus: notification.TransactionStatus,
		StatusCode:        notification.StatusCode,
		GrossAmount:       notification.GrossAmount,
		IsSignatureValid:  s.Gateway.VerifySignature(notification),
		Payload:           json.RawMessage(raw),
		ReceivedAt:        now,
	}
	order, err := s.findOrder(ctx, notification.OrderID)
	if err != nil {
		return err
	}
	if order != nil {
		record.OrderID = &order.ID
	}
	if err := s.Orders.RecordNotification(ctx, &record); err != nil {
		return err
	}
	if !record.IsSignatureValid {
		log.Warn().Str("gateway_order_id", notification.OrderID).Msg("payment notification has invalid signature")
		return nil
	}
	if order == nil {
		log.Warn().Str("gateway_order_id", notification.OrderID).Msg("payment notification for unknown order")
		return nil
	}
	if _, err := s.Sync(ctx, *order); err != nil {
		return err
	}
	return s.Orders.MarkNotificationProcessed(ctx, record.ID, s.Now())
}

// Sync menanyakan status transaksi ke gateway lalu menerapkannya bila sudah final. Mengembalikan
// order terbaru.
func (s *PaymentService) Sync(ctx context.Context, order entity.Order) (entity.Order, error) {
	txn, err := s.Gateway.GetStatus(ctx, order.ID)
	if err != nil {
		return order, fmt.Errorf("failed to get gateway status of order %s: %w", order.ID, err)
	}
	status, final := entity.OrderStatusFor(txn.TransactionStatus, txn.FraudStatus)
	if !final {
		return order, nil
	}
	if status == entity.OrderPaid && txn.GrossAmount != "" && txn.GrossAmount != entity.GrossAmount(order.Total) {
		// Nominal tidak cocok: jangan diaktifkan otomatis, perlu dicek manual.
		log.Error().Str("order_id", order.ID).Msg("gateway amount does not match order total")
		return order, nil
	}
	return s.settle(ctx, order, entity.OrderSettlement{
		OrderID:           order.ID,
		To:                status,
		GatewayStatus:     txn.TransactionStatus,
		TransactionID:     txn.TransactionID,
		At:                s.Now(),
		ReleaseEnrollment: status != entity.OrderPaid,
	})
}

// Expire mengedaluwarsakan order yang lewat batas bayar (task order:expire dan saat dibaca). Order
// yang sudah final atau belum jatuh tempo diabaikan.
func (s *PaymentService) Expire(ctx context.Context, orderID string) (entity.Order, error) {
	order, err := s.Orders.GetByID(ctx, orderID)
	if errors.Is(err, coreErrors.ErrOrderNotFound) {
		return entity.Order{}, nil
	}
	if err != nil {
		return entity.Order{}, err
	}
	if !order.IsOverdue(s.Now()) {
		return order, nil
	}
	if err := s.Gateway.Cancel(ctx, order.ID); err != nil {
		log.Warn().Err(err).Str("order_id", order.ID).Msg("failed to cancel expired transaction at gateway")
	}
	return s.settle(ctx, order, entity.OrderSettlement{
		OrderID: order.ID, To: entity.OrderExpired, GatewayStatus: entity.GatewayExpire, At: s.Now(), ReleaseEnrollment: true,
	})
}

// settle menerapkan status final. Bila order sudah berubah lebih dulu (webhook ganda), status yang
// ada dipakai. Order lunas selalu menjalankan OnOrderPaid, supaya percobaan ulang menyelesaikan
// efek yang sempat gagal.
func (s *PaymentService) settle(ctx context.Context, order entity.Order, settlement entity.OrderSettlement) (entity.Order, error) {
	err := s.Orders.Settle(ctx, settlement)
	if err != nil && !errors.Is(err, coreErrors.ErrStatusConflict) {
		return order, err
	}
	updated, err := s.Orders.GetByID(ctx, order.ID)
	if err != nil {
		return order, err
	}
	if updated.Status == entity.OrderPaid {
		if err := s.OnOrderPaid(ctx, updated); err != nil {
			return updated, fmt.Errorf("failed to activate paid order %s: %w", updated.ID, err)
		}
	}
	return updated, nil
}

func (s *PaymentService) findOrder(ctx context.Context, gatewayOrderID string) (*entity.Order, error) {
	if _, err := uuid.Parse(gatewayOrderID); err != nil {
		return nil, nil
	}
	order, err := s.Orders.GetByID(ctx, gatewayOrderID)
	if errors.Is(err, coreErrors.ErrOrderNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &order, nil
}
