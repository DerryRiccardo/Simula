package db

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// submissionContentColumns adalah kolom isian yang diperbarui saat draft disimpan atau dikirim.
var submissionContentColumns = []string{"slot_values", "note", "is_link_public", "is_own_work", "saved_at", "updated_at"}

// nextAttemptSQL memilih percobaan draft yang terbuka, atau percobaan terakhir + 1.
const nextAttemptSQL = `SELECT COALESCE(MAX(attempt) FILTER (WHERE status = 'draft'), MAX(attempt) + 1, 1)
FROM submissions WHERE enrollment_id = ?`

type submissionRepo struct {
	db *gorm.DB
}

// InitSubmissionRepo membuat repository submission.
func InitSubmissionRepo(db *gorm.DB) coreRepo.SubmissionRepository {
	return &submissionRepo{db: db}
}

func (r *submissionRepo) ListByEnrollment(ctx context.Context, enrollmentID string) ([]entity.Submission, error) {
	submissions := make([]entity.Submission, 0)
	err := r.db.WithContext(ctx).
		Preload("RevisionRequest").
		Where("enrollment_id = ?", enrollmentID).
		Order("attempt").
		Limit(entity.UnpaginatedListLimit).
		Find(&submissions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list submissions of %s: %w", enrollmentID, err)
	}
	return submissions, nil
}

func (r *submissionRepo) NextAttempt(ctx context.Context, enrollmentID string) (int, error) {
	attempt, err := nextAttempt(r.db.WithContext(ctx), enrollmentID)
	if err != nil {
		return 0, fmt.Errorf("failed to get next attempt of %s: %w", enrollmentID, err)
	}
	return attempt, nil
}

// SaveDraft memakai jalur tercepat untuk simpan otomatis: memperbarui draft yang sudah ada dalam
// satu query. Transaksi hanya dibuka saat draft baru dibuat atau ada berkas yang perlu ditandai.
func (r *submissionRepo) SaveDraft(ctx context.Context, draft *entity.Submission, attachFileIDs []string) error {
	db := r.db.WithContext(ctx)
	if len(attachFileIDs) == 0 {
		updated, err := updateOpenDraft(db, draft, submissionContentColumns)
		if err != nil {
			return fmt.Errorf("failed to save draft of %s: %w", draft.EnrollmentID, err)
		}
		if updated {
			return nil
		}
	}
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := lockEditableEnrollment(tx, draft.EnrollmentID); err != nil {
			return err
		}
		if err := upsertDraft(tx, draft); err != nil {
			return err
		}
		return attachFiles(tx, attachFileIDs)
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to save draft of %s: %w", draft.EnrollmentID, err)
	}
	return nil
}

// lockEditableEnrollment mengunci baris enrollment selama transaksi dan memastikan statusnya masih
// bisa dikerjakan. Simpan otomatis yang berjalan bersamaan dengan submit menunggu submit selesai,
// lalu ditolak, sehingga tidak ada draft baru setelah submission terkunci.
func lockEditableEnrollment(tx *gorm.DB, enrollmentID string) error {
	var enrollment entity.Enrollment
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id").
		Where("id = ? AND status IN ?", enrollmentID, entity.EditableStatuses).
		Take(&enrollment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return coreErrors.ErrStatusConflict
	}
	return err
}

// upsertDraft memperbarui draft yang ada, atau membuatnya. Dua simpan otomatis bersamaan bisa
// sama-sama mencoba membuat draft; yang kalah memperbarui draft milik yang menang.
func upsertDraft(tx *gorm.DB, draft *entity.Submission) error {
	updated, err := updateOpenDraft(tx, draft, submissionContentColumns)
	if err != nil || updated {
		return err
	}
	err = insertWithNextAttempt(tx, draft)
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		_, err = updateOpenDraft(tx, draft, submissionContentColumns)
	}
	return err
}

// updateOpenDraft memperbarui kolom tertentu pada draft enrollment, lalu mengisi submission
// dengan baris hasil update (RETURNING), termasuk ID dan nomor percobaan draft itu.
func updateOpenDraft(db *gorm.DB, submission *entity.Submission, columns []string) (bool, error) {
	newID := submission.ID
	// ID dikosongkan agar GORM tidak menambahkan kondisi primary key ke WHERE.
	submission.ID = ""
	result := db.Model(submission).
		Clauses(clause.Returning{}).
		Where("enrollment_id = ? AND status = ?", submission.EnrollmentID, entity.SubmissionDraft).
		Select(columns).
		Updates(submission)
	if result.Error != nil || result.RowsAffected == 0 {
		submission.ID = newID
	}
	return result.RowsAffected > 0, result.Error
}

// insertWithNextAttempt membuat baris baru dengan nomor percobaan berikutnya. Transaksi bersarang
// (savepoint) membuat error duplikat tidak membatalkan transaksi luar.
func insertWithNextAttempt(tx *gorm.DB, submission *entity.Submission) error {
	attempt, err := nextAttempt(tx, submission.EnrollmentID)
	if err != nil {
		return err
	}
	submission.Attempt = attempt
	return tx.Transaction(func(inner *gorm.DB) error {
		return inner.Omit(clause.Associations).Create(submission).Error
	})
}

func nextAttempt(db *gorm.DB, enrollmentID string) (int, error) {
	var attempt int
	err := db.Raw(nextAttemptSQL, enrollmentID).Scan(&attempt).Error
	return attempt, err
}

func (r *submissionRepo) Submit(ctx context.Context, submission *entity.Submission, attachFileIDs []string, change entity.EnrollmentStatusChange) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := saveSubmitted(tx, submission); err != nil {
			return err
		}
		if err := attachFiles(tx, attachFileIDs); err != nil {
			return err
		}
		return changeEnrollmentStatus(tx, change)
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return err
	}
	if err != nil {
		return fmt.Errorf("failed to submit %s: %w", submission.EnrollmentID, err)
	}
	return nil
}

// saveSubmitted mengubah draft enrollment menjadi terkirim, atau membuat baris baru bila draft
// belum pernah disimpan.
func saveSubmitted(tx *gorm.DB, submission *entity.Submission) error {
	columns := append([]string{"status", "submitted_at"}, submissionContentColumns...)
	updated, err := updateOpenDraft(tx, submission, columns)
	if err != nil || updated {
		return err
	}
	err = insertWithNextAttempt(tx, submission)
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		// Submission lain untuk enrollment ini baru saja terkirim.
		return coreErrors.ErrStatusConflict
	}
	return err
}

func changeEnrollmentStatus(tx *gorm.DB, change entity.EnrollmentStatusChange) error {
	result := tx.Model(&entity.Enrollment{}).
		Where("id = ? AND status IN ?", change.EnrollmentID, change.From).
		Updates(map[string]any{
			"status":        change.To,
			"review_due_at": change.ReviewDueAt,
			"updated_at":    change.ChangedAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrStatusConflict
	}
	return nil
}

func attachFiles(tx *gorm.DB, fileIDs []string) error {
	if len(fileIDs) == 0 {
		return nil
	}
	return tx.Model(&entity.File{}).
		Where("id IN ? AND status = ?", fileIDs, entity.FileStatusPending).
		Update("status", entity.FileStatusAttached).Error
}
