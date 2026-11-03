package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type orderRepo struct {
	db *gorm.DB
}

// InitOrderRepo membuat repository order dan notifikasi pembayaran.
func InitOrderRepo(db *gorm.DB) coreRepo.OrderRepository {
	return &orderRepo{db: db}
}

func (r *orderRepo) NextInvoiceSeq(ctx context.Context) (int64, error) {
	var seq int64
	if err := r.db.WithContext(ctx).Raw("SELECT nextval('invoice_number_seq')").Scan(&seq).Error; err != nil {
		return 0, fmt.Errorf("failed to get invoice sequence: %w", err)
	}
	return seq, nil
}

func (r *orderRepo) Create(ctx context.Context, order *entity.Order, pending *entity.Enrollment) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if pending != nil {
			enrollmentID, err := upsertPendingEnrollment(tx, pending)
			if err != nil {
				return err
			}
			order.EnrollmentID = &enrollmentID
		}
		err := tx.Create(order).Error
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			// Invoice dari sequence selalu unik, jadi yang bentrok adalah satu order menunggu per case.
			return coreErrors.ErrOrderAwaitingExists
		}
		return err
	})
	if errors.Is(err, coreErrors.ErrOrderAwaitingExists) || errors.Is(err, coreErrors.ErrCandidateNumberTaken) ||
		errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to create order: %w", err)
	}
	return nil
}

// upsertPendingEnrollment memperbarui batas bayar enrollment "Menunggu pembayaran" yang sudah ada,
// atau membuatnya. Enrollment dengan status lain berarti case sudah dimiliki (ErrStatusConflict).
func upsertPendingEnrollment(tx *gorm.DB, pending *entity.Enrollment) (string, error) {
	var existing entity.Enrollment
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id", "status").
		Where("user_id = ? AND case_id = ?", pending.UserID, pending.CaseID).Take(&existing).Error
	switch {
	case err == nil:
		if existing.Status != entity.EnrollmentPendingPayment {
			return "", coreErrors.ErrStatusConflict
		}
		err := tx.Model(&entity.Enrollment{}).Where("id = ?", existing.ID).
			Updates(map[string]any{"deadline_at": pending.DeadlineAt, "updated_at": pending.UpdatedAt}).Error
		return existing.ID, err
	case !errors.Is(err, gorm.ErrRecordNotFound):
		return "", err
	}
	// Savepoint: bentrok nomor kandidat tidak boleh membatalkan seluruh transaksi.
	err = tx.Transaction(func(sp *gorm.DB) error {
		return sp.Omit(clause.Associations).Create(pending).Error
	})
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return "", coreErrors.ErrCandidateNumberTaken
	}
	return pending.ID, err
}

func (r *orderRepo) GetByID(ctx context.Context, orderID string) (entity.Order, error) {
	return r.take(r.db.WithContext(ctx).Where("id = ?", orderID))
}

func (r *orderRepo) GetForUser(ctx context.Context, userID, orderID string) (entity.Order, error) {
	return r.take(r.db.WithContext(ctx).Where("id = ? AND user_id = ?", orderID, userID))
}

func (r *orderRepo) LatestForCase(ctx context.Context, userID, caseID string) (entity.Order, error) {
	return r.take(r.db.WithContext(ctx).Where("user_id = ? AND case_id = ?", userID, caseID).Order("created_at DESC"))
}

func (r *orderRepo) take(query *gorm.DB) (entity.Order, error) {
	var order entity.Order
	err := query.Take(&order).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Order{}, coreErrors.ErrOrderNotFound
	}
	if err != nil {
		return entity.Order{}, fmt.Errorf("failed to get order: %w", err)
	}
	return order, nil
}

func (r *orderRepo) Settle(ctx context.Context, settlement entity.OrderSettlement) error {
	updates := map[string]any{"status": settlement.To, "updated_at": settlement.At}
	if settlement.To == entity.OrderPaid {
		updates["paid_at"] = settlement.At
	}
	if settlement.GatewayStatus != "" {
		updates["gateway_status"] = settlement.GatewayStatus
	}
	if settlement.TransactionID != "" {
		updates["gateway_transaction_id"] = settlement.TransactionID
	}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order entity.Order
		result := tx.Model(&order).Clauses(clause.Returning{Columns: []clause.Column{{Name: "user_id"}, {Name: "case_id"}}}).
			Where("id = ? AND status = ?", settlement.OrderID, entity.OrderAwaitingPayment).
			Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return coreErrors.ErrStatusConflict
		}
		if !settlement.ReleaseEnrollment {
			return nil
		}
		// Case belum dimiliki: enrollment "Menunggu pembayaran" dilepas dari Case Saya.
		return tx.Where("user_id = ? AND case_id = ? AND status = ?", order.UserID, order.CaseID, entity.EnrollmentPendingPayment).
			Delete(&entity.Enrollment{}).Error
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to settle order %s: %w", settlement.OrderID, err)
	}
	return nil
}

func (r *orderRepo) LinkEnrollment(ctx context.Context, orderID, enrollmentID string) error {
	err := r.db.WithContext(ctx).Model(&entity.Order{}).Where("id = ?", orderID).
		Update("enrollment_id", enrollmentID).Error
	if err != nil {
		return fmt.Errorf("failed to link order %s: %w", orderID, err)
	}
	return nil
}

func (r *orderRepo) RecordNotification(ctx context.Context, record *entity.PaymentNotificationRecord) error {
	if err := r.db.WithContext(ctx).Create(record).Error; err != nil {
		return fmt.Errorf("failed to record payment notification: %w", err)
	}
	return nil
}

func (r *orderRepo) MarkNotificationProcessed(ctx context.Context, id string, now time.Time) error {
	err := r.db.WithContext(ctx).Model(&entity.PaymentNotificationRecord{}).Where("id = ?", id).
		Update("processed_at", now).Error
	if err != nil {
		return fmt.Errorf("failed to mark payment notification %s: %w", id, err)
	}
	return nil
}
