package repository

import (
	"context"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// ReviewerRepository melayani portal reviewer. Reviewer hanya melihat submission yang dipegangnya
// (assigned_reviewer_id), ditambah submission yang menunggu tanpa pemegang dari case yang
// ditugaskan kepadanya.
type ReviewerRepository interface {
	// ListQueue mengembalikan antrean dan riwayat reviewer, maksimal limit baris.
	ListQueue(ctx context.Context, reviewerID string, limit int) ([]entity.ReviewQueueEntry, error)
	// GetEntry memuat satu submission beserta skor review. Mengembalikan
	// coreErrors.ErrEnrollmentNotFound bila tidak terlihat oleh reviewer ini.
	GetEntry(ctx context.Context, reviewerID, enrollmentID string) (entity.ReviewQueueEntry, error)
	// LastRevision mengembalikan permintaan revisi terakhir enrollment, atau nil.
	LastRevision(ctx context.Context, enrollmentID string) (*entity.RevisionRequest, error)
	// GetDraft mengembalikan coreErrors.ErrReviewDraftNotFound bila belum ada.
	GetDraft(ctx context.Context, submissionID string) (entity.ReviewDraft, error)
	// SaveDraft menyimpan draft sekaligus mengambil submission bila belum ada pemegangnya.
	// Mengembalikan coreErrors.ErrStatusConflict bila submission sudah tidak menunggu atau dipegang
	// reviewer lain.
	SaveDraft(ctx context.Context, enrollmentID string, draft *entity.ReviewDraft) error
	// RequestRevision mengembalikan submission untuk revisi dalam satu transaksi. Mengembalikan
	// coreErrors.ErrStatusConflict bila sudah diputuskan, dipegang reviewer lain, atau batas revisi
	// habis.
	RequestRevision(ctx context.Context, decision entity.RevisionDecision) error
}
