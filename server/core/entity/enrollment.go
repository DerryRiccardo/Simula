package entity

import (
	"sort"
	"time"
)

// EnrollmentStatus adalah status case milik peserta (CONTEXT.md §4.9). Nilainya sama dengan
// TEnrollmentStatus di client.
type EnrollmentStatus string

const (
	EnrollmentPendingPayment    EnrollmentStatus = "pending_payment"
	EnrollmentNotStarted        EnrollmentStatus = "not_started"
	EnrollmentInProgress        EnrollmentStatus = "in_progress"
	EnrollmentAIGrading         EnrollmentStatus = "ai_grading"
	EnrollmentInReview          EnrollmentStatus = "in_review"
	EnrollmentRevisionRequested EnrollmentStatus = "revision_requested"
	EnrollmentPassed            EnrollmentStatus = "passed"
	EnrollmentFailed            EnrollmentStatus = "failed"
)

// IsValid memeriksa apakah status dikenal.
func (s EnrollmentStatus) IsValid() bool {
	switch s {
	case EnrollmentPendingPayment, EnrollmentNotStarted, EnrollmentInProgress, EnrollmentAIGrading,
		EnrollmentInReview, EnrollmentRevisionRequested, EnrollmentPassed, EnrollmentFailed:
		return true
	}
	return false
}

// ActionStatuses adalah status yang menunggu tindakan peserta, urut dari yang paling mendesak.
var ActionStatuses = []EnrollmentStatus{
	EnrollmentRevisionRequested,
	EnrollmentPendingPayment,
	EnrollmentInProgress,
	EnrollmentNotStarted,
}

// ActiveStatuses adalah status case yang masih berjalan.
var ActiveStatuses = append(append([]EnrollmentStatus{}, ActionStatuses...), EnrollmentAIGrading, EnrollmentInReview)

// EnrollmentSort adalah urutan Case Saya. Nilainya sama dengan TEnrollmentSort di client.
type EnrollmentSort string

const (
	EnrollmentSortRecent   EnrollmentSort = "recent"
	EnrollmentSortDeadline EnrollmentSort = "deadline"
	EnrollmentSortTitle    EnrollmentSort = "title"
)

// IsValid memeriksa apakah urutan dikenal.
func (s EnrollmentSort) IsValid() bool {
	return s == EnrollmentSortRecent || s == EnrollmentSortDeadline || s == EnrollmentSortTitle
}

// Rentang nomor kandidat anonim yang ditampilkan ke reviewer ("Kandidat #5868"), sama dengan
// CHECK di tabel enrollments.
const (
	CandidateNumberMin = 1000
	CandidateNumberMax = 999999
	// CandidateNumberAttempts adalah jumlah percobaan bila nomor kandidat acak bentrok.
	CandidateNumberAttempts = 5
)

// Enrollment adalah baris tabel enrollments. Case dan Certificate diisi repository saat dibutuhkan
// (Case Saya, dashboard).
type Enrollment struct {
	ID              string
	UserID          string
	CaseID          string
	Status          EnrollmentStatus
	CandidateNumber int
	DeadlineAt      *time.Time
	StartedAt       *time.Time
	ReviewDueAt     *time.Time
	LastRetriedAt   *time.Time
	Score           *int
	RevisionCount   int
	RetryCount      int
	ShareConsent    *string
	CreatedAt       time.Time
	UpdatedAt       time.Time

	Case        *Case        `gorm:"foreignKey:CaseID"`
	Certificate *Certificate `gorm:"foreignKey:EnrollmentID"`
}

// Tier mengembalikan tier case, atau string kosong bila Case belum dimuat.
func (e *Enrollment) Tier() Tier {
	if e.Case == nil {
		return ""
	}
	return e.Case.Tier
}

// CertificatePublicID mengembalikan ID verifikasi sertifikat, atau nil bila belum terbit.
func (e *Enrollment) CertificatePublicID() *string {
	if e.Certificate == nil {
		return nil
	}
	id := e.Certificate.PublicID
	return &id
}

// EditableStatuses adalah status enrollment yang draft dan submission-nya masih bisa diubah.
var EditableStatuses = []EnrollmentStatus{EnrollmentInProgress, EnrollmentRevisionRequested}

// ReviewSLABusinessDays adalah batas reviewer mitra menilai sejak submit terakhir (CONTEXT.md 4.10).
const ReviewSLABusinessDays = 5

// CanStart bernilai true bila case B2B yang sudah dibayar boleh mulai dikerjakan.
func (e *Enrollment) CanStart() bool {
	return e.Status == EnrollmentNotStarted
}

// CanViewBrief bernilai true bila brief lengkap boleh dibuka: AI sudah dimulai, B2B sudah dibayar.
func (e *Enrollment) CanViewBrief() bool {
	return e.Status != EnrollmentPendingPayment
}

// IsEditable bernilai true bila draft dan submission masih bisa diubah.
func (e *Enrollment) IsEditable() bool {
	return containsStatus(EditableStatuses, e.Status)
}

// IsPastDeadline bernilai true bila tenggat pengerjaan sudah lewat pada waktu now. AI case tidak
// punya tenggat.
func (e *Enrollment) IsPastDeadline(now time.Time) bool {
	return e.DeadlineAt != nil && !now.Before(*e.DeadlineAt)
}

// WorkDeadline menghitung tenggat pengerjaan dalam hari kalender sejak mulai mengerjakan. nil bila
// case tidak punya tenggat.
func WorkDeadline(startedAt time.Time, deadlineDays *int) *time.Time {
	if deadlineDays == nil || *deadlineDays <= 0 {
		return nil
	}
	deadline := startedAt.AddDate(0, 0, *deadlineDays)
	return &deadline
}

// StatusAfterSubmit menentukan status enrollment setelah submit: AI dinilai AI, B2B menunggu review.
func StatusAfterSubmit(tier Tier) EnrollmentStatus {
	if tier == TierAI {
		return EnrollmentAIGrading
	}
	return EnrollmentInReview
}

// EnrollmentStatusChange adalah perubahan status yang hanya berlaku bila status lama masih salah
// satu dari From, supaya dua request bersamaan tidak sama-sama lolos.
type EnrollmentStatusChange struct {
	EnrollmentID string
	From         []EnrollmentStatus
	To           EnrollmentStatus
	ReviewDueAt  *time.Time
	ChangedAt    time.Time
}

// jakarta adalah zona waktu hari kerja. WIB tidak mengenal DST, jadi offset tetap cukup dan tidak
// bergantung pada database zona waktu sistem.
var jakarta = time.FixedZone("WIB", 7*60*60)

// AddBusinessDays menambahkan hari kerja (Senin–Jumat, zona Asia/Jakarta) ke t. Libur nasional
// belum diperhitungkan. Hasilnya dalam UTC.
func AddBusinessDays(t time.Time, days int) time.Time {
	local := t.In(jakarta)
	for added := 0; added < days; {
		local = local.AddDate(0, 0, 1)
		if weekday := local.Weekday(); weekday != time.Saturday && weekday != time.Sunday {
			added++
		}
	}
	return local.UTC()
}

// DashboardStats adalah angka ringkasan dashboard dan sidebar.
type DashboardStats struct {
	TotalCount       int
	StatusCounts     map[EnrollmentStatus]int
	ActiveCount      int
	InReviewCount    int
	RevisionCount    int
	CertificateCount int
}

// BuildDashboardStats menghitung angka dashboard dari semua enrollment peserta.
func BuildDashboardStats(enrollments []Enrollment, certificateCount int) DashboardStats {
	stats := DashboardStats{
		TotalCount:       len(enrollments),
		StatusCounts:     make(map[EnrollmentStatus]int),
		CertificateCount: certificateCount,
	}
	for _, item := range enrollments {
		stats.StatusCounts[item.Status]++
		if containsStatus(ActiveStatuses, item.Status) {
			stats.ActiveCount++
		}
		if item.Status == EnrollmentInReview || item.Status == EnrollmentAIGrading {
			stats.InReviewCount++
		}
		if item.Status == EnrollmentRevisionRequested {
			stats.RevisionCount++
		}
	}
	return stats
}

// ActionItems mengambil enrollment yang menunggu tindakan, urut dari yang paling mendesak, lalu
// yang paling baru diperbarui.
func ActionItems(enrollments []Enrollment) []Enrollment {
	items := make([]Enrollment, 0, len(enrollments))
	for _, item := range enrollments {
		if containsStatus(ActionStatuses, item.Status) {
			items = append(items, item)
		}
	}
	sort.SliceStable(items, func(i, j int) bool {
		pi, pj := statusPriority(items[i].Status), statusPriority(items[j].Status)
		if pi != pj {
			return pi < pj
		}
		return items[i].UpdatedAt.After(items[j].UpdatedAt)
	})
	return items
}

// HasPassedTier bernilai true bila peserta sudah lulus minimal satu case di tier tersebut.
func HasPassedTier(enrollments []Enrollment, tier Tier) bool {
	for _, item := range enrollments {
		if item.Tier() == tier && item.Status == EnrollmentPassed {
			return true
		}
	}
	return false
}

func statusPriority(status EnrollmentStatus) int {
	for i, s := range ActionStatuses {
		if s == status {
			return i
		}
	}
	return len(ActionStatuses)
}

func containsStatus(statuses []EnrollmentStatus, status EnrollmentStatus) bool {
	for _, s := range statuses {
		if s == status {
			return true
		}
	}
	return false
}
