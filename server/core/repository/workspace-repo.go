package repository

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// SubmissionRepository menyimpan draft dan submission per percobaan.
type SubmissionRepository interface {
	// ListByEnrollment mengembalikan semua submission (termasuk draft) urut percobaan, dengan
	// RevisionRequest sudah dimuat.
	ListByEnrollment(ctx context.Context, enrollmentID string) ([]entity.Submission, error)
	// NextAttempt mengembalikan nomor percobaan draft yang sedang dikerjakan, atau percobaan baru
	// bila belum ada draft.
	NextAttempt(ctx context.Context, enrollmentID string) (int, error)
	// SaveDraft memperbarui isi draft enrollment bila sudah ada, atau membuat draft dengan ID dari
	// parameter dan nomor percobaan berikutnya. Berkas attachFileIDs ditandai attached supaya tidak
	// dihapus task pembersihan. draft diisi ulang dengan baris yang tersimpan. Mengembalikan
	// coreErrors.ErrStatusConflict bila enrollment sudah tidak bisa dikerjakan (mis. baru di-submit).
	SaveDraft(ctx context.Context, draft *entity.Submission, attachFileIDs []string) error
	// Submit mengubah draft enrollment menjadi terkirim (atau membuat submission baru dengan ID dari
	// parameter bila belum ada draft), menandai berkas attached, dan mengubah status enrollment
	// dalam satu transaksi. Mengembalikan coreErrors.ErrStatusConflict bila status enrollment sudah
	// tidak sesuai change.From.
	Submit(ctx context.Context, submission *entity.Submission, attachFileIDs []string, change entity.EnrollmentStatusChange) error
}

// FileRepository menyimpan metadata berkas di R2.
type FileRepository interface {
	Create(ctx context.Context, file *entity.File) error
	// ListByIDs mengembalikan berkas milik uploadedBy dengan ID tersebut; ID yang tidak ditemukan
	// dilewati.
	ListByIDs(ctx context.Context, uploadedBy string, ids []string) ([]entity.File, error)
	// ListPendingBefore mengembalikan berkas pending yang dibuat sebelum waktu tertentu.
	ListPendingBefore(ctx context.Context, before time.Time, limit int) ([]entity.File, error)
	// DeletePending menghapus berkas yang masih pending; berkas yang sempat dipakai tidak terhapus.
	DeletePending(ctx context.Context, ids []string) (int64, error)
}

// Storage adalah penyimpanan object (Cloudflare R2). Mengembalikan coreErrors.ErrStorageDisabled
// bila kredensial belum diisi.
type Storage interface {
	// PresignUpload membuat URL PUT yang menandatangani content type dan ukuran berkas.
	PresignUpload(ctx context.Context, key, contentType string, sizeBytes int64, ttl time.Duration) (entity.PresignedUpload, error)
	// HeadObject mengembalikan coreErrors.ErrObjectNotFound bila object belum diunggah.
	HeadObject(ctx context.Context, key string) (entity.StoredObject, error)
	// DeleteObject tidak mengembalikan error bila object sudah tidak ada.
	DeleteObject(ctx context.Context, key string) error
}
