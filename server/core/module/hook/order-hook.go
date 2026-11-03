package hook

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// OrderHookDeps adalah dependency OrderHook.
type OrderHookDeps struct {
	Orders      coreRepo.OrderRepository
	Enrollments coreRepo.EnrollmentRepository
	// CandidateNumber membuat nomor kandidat anonim; default acak dalam rentang entity.CandidateNumber*.
	CandidateNumber func() int
	Now             func() time.Time
}

// OrderHook menjalankan efek order lunas.
type OrderHook struct {
	OrderHookDeps
}

// NewOrderHook membuat OrderHook.
func NewOrderHook(deps OrderHookDeps) *OrderHook {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	if deps.CandidateNumber == nil {
		deps.CandidateNumber = func() int {
			return entity.CandidateNumberMin + rand.IntN(entity.CandidateNumberMax-entity.CandidateNumberMin+1)
		}
	}
	return &OrderHook{OrderHookDeps: deps}
}

// OnOrderPaid memasukkan case ke Case Saya berstatus "Belum dimulai" dengan batas mulai 30 hari
// sejak lunas. VA sudah punya enrollment "Menunggu pembayaran"; QRIS/GoPay dibuatkan baru.
// Idempoten: enrollment yang sudah aktif dibiarkan.
func (h *OrderHook) OnOrderPaid(ctx context.Context, order entity.Order) error {
	if order.Status != entity.OrderPaid || order.PaidAt == nil {
		return nil
	}
	startBy := entity.StartDeadline(*order.PaidAt)
	enrollmentID, err := h.activate(ctx, order, startBy)
	if err != nil {
		return err
	}
	if order.EnrollmentID == nil || *order.EnrollmentID != enrollmentID {
		if err := h.Orders.LinkEnrollment(ctx, order.ID, enrollmentID); err != nil {
			return err
		}
	}
	// Email "Pembayaran berhasil" menyusul bersama integrasi Resend (task email:send).
	log.Info().Str("order_id", order.ID).Str("enrollment_id", enrollmentID).Msg("order paid")
	return nil
}

func (h *OrderHook) activate(ctx context.Context, order entity.Order, startBy time.Time) (string, error) {
	now := h.Now()
	for attempt := 0; attempt < entity.CandidateNumberAttempts; attempt++ {
		existing, err := h.Enrollments.FindByUserAndCase(ctx, order.UserID, order.CaseID)
		if err == nil {
			if existing.Status != entity.EnrollmentPendingPayment {
				return existing.ID, nil
			}
			err := h.Enrollments.ActivatePaid(ctx, existing.ID, startBy, now)
			if err != nil && !errors.Is(err, coreErrors.ErrStatusConflict) {
				return "", err
			}
			return existing.ID, nil
		}
		if !errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
			return "", err
		}

		enrollment := entity.Enrollment{
			ID:              uuid.NewString(),
			UserID:          order.UserID,
			CaseID:          order.CaseID,
			Status:          entity.EnrollmentNotStarted,
			CandidateNumber: h.CandidateNumber(),
			DeadlineAt:      &startBy,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err = h.Enrollments.Create(ctx, &enrollment)
		switch {
		case err == nil:
			return enrollment.ID, nil
		case errors.Is(err, coreErrors.ErrCandidateNumberTaken), errors.Is(err, coreErrors.ErrEnrollmentExists):
			// Nomor bentrok atau enrollment baru saja dibuat proses lain: ulangi dari pencarian.
			continue
		default:
			return "", err
		}
	}
	return "", fmt.Errorf("failed to activate order %s after %d tries", order.ID, entity.CandidateNumberAttempts)
}
