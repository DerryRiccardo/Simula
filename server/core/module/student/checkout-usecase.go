package student

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand/v2"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgOrderNotFound      = "Order tidak ditemukan."
	msgNoPaymentNeeded    = "Case ini tidak memerlukan pembayaran."
	msgAlreadyOwned       = "Kamu sudah memiliki case ini."
	msgOrderNotActive     = "Order ini sudah tidak aktif."
	msgOrderAwaiting      = "Masih ada pembayaran yang menunggu untuk case ini. Muat ulang halaman."
	msgInvalidMethod      = "Pilih metode pembayaran yang tersedia."
	msgInvalidOutcome     = "Hasil simulasi tidak dikenal."
	msgSimulatorDisabled  = "Simulasi pembayaran tidak tersedia."
	msgStartWindowExpired = "Batas mulai mengerjakan case ini sudah lewat."
)

// simulatedStatus memetakan hasil yang dipilih di panel demo ke status transaksi gateway.
var simulatedStatus = map[string]string{
	"paid":    entity.GatewaySettlement,
	"failed":  entity.GatewayDeny,
	"expired": entity.GatewayExpire,
}

// CheckoutSummary adalah isi halaman checkout (ICheckoutSummary di client).
type CheckoutSummary struct {
	Case       entity.Case
	Enrollment *entity.Enrollment
	// Order terakhir yang belum lunas dan tidak dibatalkan, atau nil.
	Order *entity.Order
}

// CheckoutUseCase melayani checkout B2B.
type CheckoutUseCase interface {
	GetCheckout(ctx context.Context, slug string) (CheckoutSummary, error)
	CreateOrder(ctx context.Context, caseID string, method entity.PaymentMethod) (entity.Order, error)
	CancelOrder(ctx context.Context, orderID string) (entity.Order, error)
	// SimulatePayment hanya aktif dengan gateway palsu: hasilnya dikirim sebagai notifikasi
	// webhook bertanda tangan dan diproses lewat jalur yang sama dengan Midtrans.
	SimulatePayment(ctx context.Context, orderID, outcome string) (entity.Order, error)
}

// PaymentProcessor adalah bagian shared.PaymentService yang dipakai checkout.
type PaymentProcessor interface {
	HandleNotification(ctx context.Context, raw []byte) error
	Expire(ctx context.Context, orderID string) (entity.Order, error)
}

// CheckoutDeps adalah dependency use case checkout.
type CheckoutDeps struct {
	Cases       coreRepo.CaseRepository
	Enrollments coreRepo.EnrollmentRepository
	Users       coreRepo.UserRepository
	Orders      coreRepo.OrderRepository
	Gateway     coreRepo.PaymentGateway
	// Simulator nil berarti simulasi pembayaran nonaktif (gateway asli).
	Simulator       coreRepo.PaymentSimulator
	Payments        PaymentProcessor
	Queue           coreRepo.OrderQueue
	CandidateNumber func() int
	Now             func() time.Time
}

type checkoutUseCase struct {
	CheckoutDeps
}

// InitCheckoutUseCase membuat use case checkout.
func InitCheckoutUseCase(deps CheckoutDeps) CheckoutUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	if deps.CandidateNumber == nil {
		deps.CandidateNumber = func() int {
			return entity.CandidateNumberMin + rand.IntN(entity.CandidateNumberMax-entity.CandidateNumberMin+1)
		}
	}
	return &checkoutUseCase{CheckoutDeps: deps}
}

func (uc *checkoutUseCase) GetCheckout(ctx context.Context, slug string) (CheckoutSummary, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return CheckoutSummary{}, apperror.Unauthenticated("")
	}
	c, enrollment, err := findCaseWithEnrollment(ctx, uc.Cases, uc.Enrollments, current.ID, slug)
	if err != nil {
		return CheckoutSummary{}, err
	}
	order, err := uc.Orders.LatestForCase(ctx, current.ID, c.ID)
	if errors.Is(err, coreErrors.ErrOrderNotFound) {
		return CheckoutSummary{Case: c, Enrollment: enrollment}, nil
	}
	if err != nil {
		return CheckoutSummary{}, apperror.Internal(err)
	}
	if order.IsOverdue(uc.Now()) {
		// Cadangan task order:expire: order yang lewat batas sudah kedaluwarsa saat dibaca.
		if order, err = uc.Payments.Expire(ctx, order.ID); err != nil {
			return CheckoutSummary{}, apperror.Internal(err)
		}
		if _, enrollment, err = findCaseWithEnrollment(ctx, uc.Cases, uc.Enrollments, current.ID, slug); err != nil {
			return CheckoutSummary{}, err
		}
	}
	summary := CheckoutSummary{Case: c, Enrollment: enrollment}
	// Order lunas cukup diwakili status enrollment; order yang dibatalkan peserta tidak ditampilkan.
	if order.Status != entity.OrderPaid && order.Status != entity.OrderCancelled {
		summary.Order = &order
	}
	return summary, nil
}

func (uc *checkoutUseCase) CreateOrder(ctx context.Context, caseID string, method entity.PaymentMethod) (entity.Order, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Order{}, apperror.Unauthenticated("")
	}
	if !method.IsValid() {
		return entity.Order{}, apperror.Validation(apperror.FieldError{Field: "method", Message: msgInvalidMethod})
	}
	c, err := uc.loadPurchasableCase(ctx, caseID)
	if err != nil {
		return entity.Order{}, err
	}
	if err := uc.ensureNotOwned(ctx, current.ID, c.ID); err != nil {
		return entity.Order{}, err
	}
	// Satu order aktif per case: order lama yang masih menunggu dibatalkan, misalnya saat ganti metode.
	if err := uc.cancelAwaiting(ctx, current.ID, c.ID); err != nil {
		return entity.Order{}, err
	}
	user, err := uc.Users.GetByID(ctx, current.ID)
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	seq, err := uc.Orders.NextInvoiceSeq(ctx)
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}

	now := uc.Now()
	order := entity.Order{
		ID:            uuid.NewString(),
		InvoiceNumber: entity.InvoiceNumber(now, seq),
		UserID:        current.ID,
		CaseID:        c.ID,
		Method:        method,
		Status:        entity.OrderAwaitingPayment,
		Subtotal:      *c.Price,
		AdminFee:      method.AdminFee(),
		ExpiresAt:     now.Add(entity.PaymentWindow),
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	order.Total = order.Subtotal + order.AdminFee

	charge, err := uc.Gateway.Charge(ctx, entity.ChargeRequest{
		OrderID: order.ID, Method: method, Amount: order.Total, ExpiresAt: order.ExpiresAt,
		CustomerName: user.Name, CustomerEmail: user.Email,
	})
	if err != nil {
		return entity.Order{}, apperror.Internal(fmt.Errorf("failed to charge order %s: %w", order.ID, err))
	}
	order.GatewayTransactionID = &charge.TransactionID
	order.GatewayStatus = charge.Status
	order.PaymentDetails = charge.Details

	if err := uc.saveOrder(ctx, &order); err != nil {
		if cancelErr := uc.Gateway.Cancel(ctx, order.ID); cancelErr != nil {
			log.Warn().Err(cancelErr).Str("order_id", order.ID).Msg("failed to cancel unsaved transaction")
		}
		return entity.Order{}, err
	}
	if err := uc.Queue.ScheduleExpiry(ctx, order.ID, order.ExpiresAt); err != nil {
		// Order tetap kedaluwarsa saat halaman checkout dibuka (GetCheckout).
		log.Warn().Err(err).Str("order_id", order.ID).Msg("failed to schedule order expiry")
	}
	return order, nil
}

// saveOrder menyimpan order. VA langsung masuk Case Saya sebagai "Menunggu pembayaran" dengan
// batas bayar; nomor kandidat dicoba ulang bila bentrok.
func (uc *checkoutUseCase) saveOrder(ctx context.Context, order *entity.Order) error {
	for attempt := 0; attempt < entity.CandidateNumberAttempts; attempt++ {
		var pending *entity.Enrollment
		if order.Method.IsVirtualAccount() {
			pending = &entity.Enrollment{
				ID:              uuid.NewString(),
				UserID:          order.UserID,
				CaseID:          order.CaseID,
				Status:          entity.EnrollmentPendingPayment,
				CandidateNumber: uc.CandidateNumber(),
				DeadlineAt:      &order.ExpiresAt,
				CreatedAt:       order.CreatedAt,
				UpdatedAt:       order.CreatedAt,
			}
		}
		err := uc.Orders.Create(ctx, order, pending)
		switch {
		case err == nil:
			return nil
		case errors.Is(err, coreErrors.ErrCandidateNumberTaken):
			order.EnrollmentID = nil
			continue
		case errors.Is(err, coreErrors.ErrStatusConflict):
			return apperror.Conflict(msgAlreadyOwned)
		case errors.Is(err, coreErrors.ErrOrderAwaitingExists):
			return apperror.Conflict(msgOrderAwaiting)
		default:
			return apperror.Internal(err)
		}
	}
	return apperror.Internal(fmt.Errorf("failed to allocate candidate number after %d tries", entity.CandidateNumberAttempts))
}

func (uc *checkoutUseCase) loadPurchasableCase(ctx context.Context, caseID string) (entity.Case, error) {
	caseID = strings.TrimSpace(caseID)
	if _, err := uuid.Parse(caseID); err != nil {
		return entity.Case{}, apperror.NotFound(msgCaseNotFound)
	}
	c, err := uc.Cases.GetWithBriefByID(ctx, caseID)
	if errors.Is(err, coreErrors.ErrCaseNotFound) || (err == nil && !c.IsPublished()) {
		return entity.Case{}, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return entity.Case{}, apperror.Internal(err)
	}
	if c.Tier != entity.TierB2B || c.Price == nil || *c.Price <= 0 {
		return entity.Case{}, apperror.Conflict(msgNoPaymentNeeded)
	}
	return c, nil
}

func (uc *checkoutUseCase) ensureNotOwned(ctx context.Context, userID, caseID string) error {
	enrollment, err := uc.Enrollments.FindByUserAndCase(ctx, userID, caseID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return nil
	}
	if err != nil {
		return apperror.Internal(err)
	}
	if enrollment.Status != entity.EnrollmentPendingPayment {
		return apperror.Conflict(msgAlreadyOwned)
	}
	return nil
}

func (uc *checkoutUseCase) cancelAwaiting(ctx context.Context, userID, caseID string) error {
	latest, err := uc.Orders.LatestForCase(ctx, userID, caseID)
	if errors.Is(err, coreErrors.ErrOrderNotFound) {
		return nil
	}
	if err != nil {
		return apperror.Internal(err)
	}
	if latest.Status != entity.OrderAwaitingPayment {
		return nil
	}
	if err := uc.Gateway.Cancel(ctx, latest.ID); err != nil {
		return apperror.Internal(err)
	}
	// Enrollment tetap dipakai order baru, jadi tidak dilepas.
	err = uc.Orders.Settle(ctx, entity.OrderSettlement{
		OrderID: latest.ID, To: entity.OrderCancelled, GatewayStatus: entity.GatewayCancel, At: uc.Now(),
	})
	if err != nil && !errors.Is(err, coreErrors.ErrStatusConflict) {
		return apperror.Internal(err)
	}
	return nil
}

func (uc *checkoutUseCase) CancelOrder(ctx context.Context, orderID string) (entity.Order, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Order{}, apperror.Unauthenticated("")
	}
	order, err := uc.getOwnedOrder(ctx, current.ID, orderID)
	if err != nil {
		return entity.Order{}, err
	}
	if order.Status != entity.OrderAwaitingPayment {
		return entity.Order{}, apperror.Conflict(msgOrderNotActive)
	}
	if err := uc.Gateway.Cancel(ctx, order.ID); err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	err = uc.Orders.Settle(ctx, entity.OrderSettlement{
		OrderID: order.ID, To: entity.OrderCancelled, GatewayStatus: entity.GatewayCancel, At: uc.Now(), ReleaseEnrollment: true,
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.Order{}, apperror.Conflict(msgOrderNotActive)
	}
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	return uc.getOwnedOrder(ctx, current.ID, order.ID)
}

func (uc *checkoutUseCase) SimulatePayment(ctx context.Context, orderID, outcome string) (entity.Order, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Order{}, apperror.Unauthenticated("")
	}
	if uc.Simulator == nil {
		return entity.Order{}, apperror.NotFound(msgSimulatorDisabled)
	}
	transactionStatus, ok := simulatedStatus[outcome]
	if !ok {
		return entity.Order{}, apperror.Validation(apperror.FieldError{Field: "outcome", Message: msgInvalidOutcome})
	}
	order, err := uc.getOwnedOrder(ctx, current.ID, orderID)
	if err != nil {
		return entity.Order{}, err
	}
	if order.Status != entity.OrderAwaitingPayment {
		return entity.Order{}, apperror.Conflict(msgOrderNotActive)
	}

	notification, err := uc.Simulator.Simulate(ctx, order, transactionStatus)
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	raw, err := json.Marshal(notification)
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	if err := uc.Payments.HandleNotification(ctx, raw); err != nil {
		return entity.Order{}, apperror.From(err)
	}
	return uc.getOwnedOrder(ctx, current.ID, order.ID)
}

func (uc *checkoutUseCase) getOwnedOrder(ctx context.Context, userID, orderID string) (entity.Order, error) {
	if _, err := uuid.Parse(orderID); err != nil {
		return entity.Order{}, apperror.NotFound(msgOrderNotFound)
	}
	order, err := uc.Orders.GetForUser(ctx, userID, orderID)
	if errors.Is(err, coreErrors.ErrOrderNotFound) {
		return entity.Order{}, apperror.NotFound(msgOrderNotFound)
	}
	if err != nil {
		return entity.Order{}, apperror.Internal(err)
	}
	return order, nil
}
