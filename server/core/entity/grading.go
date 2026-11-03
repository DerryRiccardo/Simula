package entity

import "time"

// AIGradingStatus adalah status satu run penilaian AI.
type AIGradingStatus string

const (
	AIGradingQueued  AIGradingStatus = "queued"
	AIGradingRunning AIGradingStatus = "running"
	AIGradingDone    AIGradingStatus = "done"
	AIGradingFailed  AIGradingStatus = "failed"
)

// AIGradingCriterionStatus adalah status penilaian satu kriteria.
type AIGradingCriterionStatus string

const (
	AIGradingCriterionPending AIGradingCriterionStatus = "pending"
	AIGradingCriterionDone    AIGradingCriterionStatus = "done"
)

// Pengaturan pipeline penilaian AI.
const (
	// AIGradingMaxRetry adalah jumlah pengulangan task bila panggilan LLM gagal atau outputnya tidak
	// valid (AI-CONTEXT.md §7), sebelum run ditandai gagal.
	AIGradingMaxRetry = 3
	// AIGradingStallAfter adalah lama run tanpa kemajuan sebelum dilanjutkan ulang oleh task periodik.
	AIGradingStallAfter = 10 * time.Minute
	// AIGradingStalledBatch membatasi jumlah run yang dilanjutkan dalam satu kali task.
	AIGradingStalledBatch = 50
)

// AIGradingRun adalah baris tabel ai_grading_runs: satu penilaian AI untuk satu submission.
type AIGradingRun struct {
	ID              string
	SubmissionID    string
	Status          AIGradingStatus
	Model           string
	StartedAt       time.Time
	EstimatedDoneAt time.Time
	CompletedAt     *time.Time
	ErrorMessage    string

	Criteria []AIGradingCriterion `gorm:"foreignKey:RunID"`
}

// TableName mengikuti nama tabel di migrasi.
func (AIGradingRun) TableName() string {
	return "ai_grading_runs"
}

// AIGradingCriterion adalah baris tabel ai_grading_criteria: hasil satu kriteria rubrik.
type AIGradingCriterion struct {
	ID                string
	RunID             string
	CriterionPosition int
	Status            AIGradingCriterionStatus
	Level             *int
	Reason            string
	Attempts          int
	InputTokens       int
	OutputTokens      int
	CompletedAt       *time.Time
}

// TableName mengikuti nama tabel di migrasi; pluralisasi GORM menghasilkan "ai_grading_criterions".
func (AIGradingCriterion) TableName() string {
	return "ai_grading_criteria"
}

// NewAIGradingRun menyiapkan run baru beserta satu baris per kriteria rubrik, urut posisi.
// criterionIDs berisi ID untuk tiap baris kriteria (dibuat pemanggil).
func NewAIGradingRun(id, submissionID, model string, criterionIDs []string, now time.Time) AIGradingRun {
	run := AIGradingRun{
		ID:              id,
		SubmissionID:    submissionID,
		Status:          AIGradingQueued,
		Model:           model,
		StartedAt:       now,
		EstimatedDoneAt: now.Add(time.Duration(len(criterionIDs)+1) * AIGradingEstimatePerCriterion),
		Criteria:        make([]AIGradingCriterion, 0, len(criterionIDs)),
	}
	for i, criterionID := range criterionIDs {
		run.Criteria = append(run.Criteria, AIGradingCriterion{
			ID:                criterionID,
			RunID:             id,
			CriterionPosition: i + 1,
			Status:            AIGradingCriterionPending,
		})
	}
	return run
}

// CheckedCriteria menghitung kriteria yang sudah selesai dinilai.
func (r *AIGradingRun) CheckedCriteria() int {
	checked := 0
	for _, criterion := range r.Criteria {
		if criterion.Status == AIGradingCriterionDone {
			checked++
		}
	}
	return checked
}

// NextPendingPosition mengembalikan posisi kriteria pertama yang belum dinilai, atau 0 bila semua
// sudah selesai (tinggal menyusun feedback).
func (r *AIGradingRun) NextPendingPosition() int {
	next := 0
	for _, criterion := range r.Criteria {
		if criterion.Status == AIGradingCriterionPending && (next == 0 || criterion.CriterionPosition < next) {
			next = criterion.CriterionPosition
		}
	}
	return next
}

// IsFinished bernilai true bila run sudah selesai atau gagal, sehingga task lanjutan diabaikan.
func (r *AIGradingRun) IsFinished() bool {
	return r.Status == AIGradingDone || r.Status == AIGradingFailed
}

// Progress mengubah run menjadi progres yang ditampilkan di halaman status.
func (r *AIGradingRun) Progress() AIGradingProgress {
	return AIGradingProgress{
		StartedAt:       r.StartedAt,
		EstimatedDoneAt: r.EstimatedDoneAt,
		CheckedCriteria: r.CheckedCriteria(),
	}
}

// UngradedSubmission adalah submission AI yang menunggu dinilai tetapi belum punya run, misalnya
// karena dikirim saat penilai AI nonaktif.
type UngradedSubmission struct {
	SubmissionID string
	CaseID       string
}

// GradingJob adalah semua data yang dibutuhkan task penilaian: run, submission, dan case lengkap.
type GradingJob struct {
	Run        AIGradingRun
	Submission Submission
	Enrollment Enrollment
	Case       Case
}

// CriterionEvaluation adalah input LLM untuk menilai satu kriteria. Isi submission adalah data,
// bukan instruksi.
type CriterionEvaluation struct {
	Case      Case
	Criterion RubricCriterion
	Content   SubmissionContent
}

// CriterionVerdict adalah output LLM untuk satu kriteria.
type CriterionVerdict struct {
	Level  int
	Reason string
}

// CriterionResult adalah hasil satu kriteria yang diteruskan ke penyusunan feedback.
type CriterionResult struct {
	Criterion RubricCriterion
	Level     int
	Reason    string
}

// FeedbackRequest adalah input LLM untuk menyusun feedback dari semua hasil kriteria.
type FeedbackRequest struct {
	Case    Case
	Results []CriterionResult
}
