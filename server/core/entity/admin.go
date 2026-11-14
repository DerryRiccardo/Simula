package entity

import "time"

// Aturan panel admin untuk menu Reviewer & Mitra dan Penilaian (CONTEXT.md 4.13). Nilainya sama
// dengan mocks/adminPartnerApi.ts dan mocks/adminReviewApi.ts di client.
const (
	// ReminderCooldown adalah jeda minimal antar-pengingat ke reviewer.
	ReminderCooldown = 24 * time.Hour
	// FlagNoteMinRunes adalah panjang minimal catatan "Tandai bermasalah".
	FlagNoteMinRunes = 10
	// FlagNoteMaxRunes membatasi catatan "Tandai bermasalah".
	FlagNoteMaxRunes = 2000
	// AdminReviewListLimit membatasi daftar Penilaian yang dimuat sekali jalan.
	AdminReviewListLimit = 500
	// TemporaryPasswordLength adalah panjang password sementara akun reviewer baru.
	TemporaryPasswordLength = 12
)

// AdminReviewStatuses adalah status yang tampil di menu Penilaian: sudah submit, sedang atau sudah
// dinilai (TAdminReviewStatus di client).
var AdminReviewStatuses = []EnrollmentStatus{
	EnrollmentAIGrading, EnrollmentInReview, EnrollmentRevisionRequested, EnrollmentPassed, EnrollmentFailed,
}

// ReviewerProfile adalah baris tabel reviewer_profiles: mitra asal dan jabatan reviewer.
type ReviewerProfile struct {
	UserID    string `gorm:"primaryKey"`
	PartnerID string
	JobTitle  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// ReviewFlag adalah baris tabel review_flags: tanda "bermasalah" dari admin.
type ReviewFlag struct {
	EnrollmentID string `gorm:"primaryKey"`
	Note         string
	FlaggedBy    string
	FlaggedAt    time.Time
}

// PartnerStat adalah mitra beserta ringkasannya di menu Reviewer & Mitra.
type PartnerStat struct {
	Partner             Partner
	CaseCount           int
	ActiveReviewerCount int
	PendingReviewCount  int
}

// DecisionSpan adalah satu keputusan reviewer: dari submit sampai diputuskan.
type DecisionSpan struct {
	SubmittedAt time.Time
	DecidedAt   time.Time
}

// ReviewerStat adalah reviewer beserta beban kerja dan riwayatnya.
type ReviewerStat struct {
	ID           string
	Name         string
	Email        string
	IsActive     bool
	PartnerID    string
	PartnerName  string
	JobTitle     string
	CaseIDs      []string
	PendingCount int
	Decisions    []DecisionSpan
}

// AverageReviewDays adalah rata-rata hari kerja dari submit sampai diputuskan, dibulatkan satu
// desimal, atau nil bila belum ada keputusan.
func (r *ReviewerStat) AverageReviewDays() *float64 {
	if len(r.Decisions) == 0 {
		return nil
	}
	total := 0
	for _, decision := range r.Decisions {
		total += BusinessDaysBetween(decision.SubmittedAt, decision.DecidedAt)
	}
	average := float64(int(float64(total)/float64(len(r.Decisions))*10+0.5)) / 10
	return &average
}

// PartnerCase adalah B2B case sebagai pilihan penugasan reviewer.
type PartnerCase struct {
	ID                  string
	Title               string
	FieldKey            string
	PartnerID           *string
	Status              CaseStatus
	Price               *int
	PendingReviewCount  int
	ActiveReviewerCount int
}

// PartnerDirectory adalah isi menu Reviewer & Mitra.
type PartnerDirectory struct {
	Partners  []PartnerStat
	Reviewers []ReviewerStat
	Cases     []PartnerCase
}

// ReviewerSummary adalah reviewer pemegang yang tampil di menu Penilaian.
type ReviewerSummary struct {
	ID       string
	Name     string
	JobTitle string
}

// AdminReviewRow adalah satu enrollment di menu Penilaian. Admin melihat identitas peserta;
// anonimitas hanya berlaku di portal reviewer.
type AdminReviewRow struct {
	// Enrollment beserta Case (ringkasan dan Partner) dan Certificate.
	Enrollment  Enrollment
	MemberName  string
	MemberEmail string
	// Holder diisi untuk B2B yang sudah punya pemegang.
	Holder *ReviewerSummary
	// Submission terkirim terakhir beserta Review dan RevisionRequest-nya, atau nil.
	Submission *Submission
	Flag       *ReviewFlag
}

// DecidedAt adalah waktu keputusan terakhir (dinilai AI atau reviewer, atau dikembalikan).
func (r *AdminReviewRow) DecidedAt() *time.Time {
	entry := ReviewQueueEntry{Enrollment: r.Enrollment, Submission: r.Submission}
	if r.Enrollment.Status == EnrollmentAIGrading {
		return nil
	}
	return entry.DecidedAt()
}

// CanRegrade: hanya AI case yang belum lulus. Yang lulus sudah punya sertifikat, dan sertifikat
// yang terbit tidak bisa dicabut (CONTEXT.md bagian 7).
func (r *AdminReviewRow) CanRegrade() bool {
	return r.Enrollment.Tier() == TierAI && r.Enrollment.Status == EnrollmentFailed && r.Submission != nil
}

// CanRemind: B2B yang menunggu review, punya pemegang, dan belum diingatkan dalam 24 jam.
func (r *AdminReviewRow) CanRemind(now time.Time) bool {
	if r.Enrollment.Tier() != TierB2B || r.Enrollment.Status != EnrollmentInReview || r.Holder == nil {
		return false
	}
	last := r.Enrollment.LastReminderAt
	return last == nil || !now.Before(last.Add(ReminderCooldown))
}

// BusinessDaysBetween menghitung hari kerja (Senin–Jumat, WIB) dari from sampai to. Nol bila to
// tidak setelah from.
func BusinessDaysBetween(from, to time.Time) int {
	if !to.After(from) {
		return 0
	}
	days := 0
	for day := from.In(jakarta); ; {
		day = day.AddDate(0, 0, 1)
		if day.After(to.In(jakarta)) {
			break
		}
		if weekday := day.Weekday(); weekday != time.Saturday && weekday != time.Sunday {
			days++
		}
	}
	return days
}
