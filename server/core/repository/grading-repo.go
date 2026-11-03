package repository

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// GradingRepository menyimpan progres penilaian AI.
type GradingRepository interface {
	// LoadJob memuat run (dengan Criteria), submission, dan enrollment. Case tidak dimuat. Mengembalikan
	// coreErrors.ErrGradingRunNotFound bila tidak ada.
	LoadJob(ctx context.Context, runID string) (entity.GradingJob, error)
	// GetRunBySubmission mengembalikan run beserta Criteria, atau coreErrors.ErrGradingRunNotFound.
	GetRunBySubmission(ctx context.Context, submissionID string) (entity.AIGradingRun, error)
	// SaveCriterionResult menyimpan hasil kriteria yang masih pending dan menandai run sedang berjalan.
	// Hasil yang sudah tersimpan tidak ditimpa (task yang diulang tetap idempoten).
	SaveCriterionResult(ctx context.Context, criterionID string, verdict entity.CriterionVerdict, now time.Time) error
	// ListStalled mengembalikan run yang belum selesai dan tidak ada kemajuan sejak before.
	ListStalled(ctx context.Context, before time.Time, limit int) ([]entity.AIGradingRun, error)
	// ListUngraded mengembalikan submission AI berstatus submitted (enrollment ai_grading) yang belum
	// punya run, urut waktu submit.
	ListUngraded(ctx context.Context, limit int) ([]entity.UngradedSubmission, error)
	// CreateRun menyimpan run baru beserta Criteria. created bernilai false bila submission sudah
	// punya run (dibuat proses lain), sehingga pemanggil tidak mengantrekan dua kali.
	CreateRun(ctx context.Context, run *entity.AIGradingRun) (created bool, err error)
	// Fail menandai run gagal, mengembalikan submission menjadi draft, dan enrollment ai_grading menjadi
	// in_progress dalam satu transaksi, sehingga percobaan ini tidak dihitung (AI-CONTEXT.md §7).
	Fail(ctx context.Context, runID, message string, now time.Time) error
}

// ReviewRepository menyimpan hasil penilaian final.
type ReviewRepository interface {
	// Finalize menyimpan review dan skor per kriteria, menandai submission reviewed, mengubah status dan
	// skor enrollment, menerbitkan sertifikat (bila ada), dan menyelesaikan run AI (bila ada) dalam satu
	// transaksi. Mengembalikan coreErrors.ErrStatusConflict bila enrollment sudah tidak berstatus From
	// (misalnya sudah dinilai oleh task lain).
	Finalize(ctx context.Context, finalization entity.ReviewFinalization) error
	// GetBySubmission mengembalikan review beserta Scores, atau coreErrors.ErrReviewNotFound.
	GetBySubmission(ctx context.Context, submissionID string) (entity.Review, error)
}

// LLM menilai submission terhadap rubrik. Implementasinya penilai palsu (development) atau Gemini.
type LLM interface {
	// Model adalah nama model yang dicatat di ai_grading_runs.
	Model() string
	EvaluateCriterion(ctx context.Context, in entity.CriterionEvaluation) (entity.CriterionVerdict, error)
	ComposeFeedback(ctx context.Context, in entity.FeedbackRequest) (entity.ReviewFeedback, error)
}

// GradingQueue mengantrekan task penilaian AI. Enqueue ganda untuk langkah yang sama diabaikan.
type GradingQueue interface {
	EnqueueCriterion(ctx context.Context, runID string, position int) error
	EnqueueFeedback(ctx context.Context, runID string) error
}
