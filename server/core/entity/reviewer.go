package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"slices"
	"time"
)

// Aturan portal reviewer (CONTEXT.md 4.10 dan bagian 7). Nilainya sama dengan constants/review.ts
// dan mocks/grading.ts di client.
const (
	// MaxRevisions adalah batas pengembalian; setelah itu reviewer wajib menilai apa adanya.
	MaxRevisions = 2
	// RevisionExtraDays adalah tenggat baru peserta sejak dikembalikan (hari kalender).
	RevisionExtraDays = 3
	// ReviewReasonMinRunes adalah panjang minimal alasan per kriteria dan catatan revisi.
	ReviewReasonMinRunes = 20
	// ReviewReasonMaxRunes membatasi alasan per kriteria dan catatan revisi.
	ReviewReasonMaxRunes = 2000
	// ReviewerFeedbackMaxItems dan ReviewerFeedbackItemMaxRunes membatasi feedback reviewer.
	ReviewerFeedbackMaxItems     = 10
	ReviewerFeedbackItemMaxRunes = 1000
	// RecommendationThreshold adalah saran sistem; keputusan rekomendasi tetap di reviewer.
	RecommendationThreshold = 80
	// ReviewDownloadTTL adalah masa berlaku link unduh berkas untuk reviewer.
	ReviewDownloadTTL = 10 * time.Minute
	// ReviewQueueLimit membatasi antrean dan riwayat yang dimuat sekali jalan.
	ReviewQueueLimit = 200
)

// RevisionReasons adalah alasan pengembalian yang bisa dipilih reviewer.
var RevisionReasons = []string{
	"Deliverable belum lengkap",
	"Tautan tidak bisa dibuka",
	"Berkas tidak bisa dibuka",
	"Deliverable belum sesuai brief",
}

// IsRevisionReason memeriksa apakah alasan ada di daftar.
func IsRevisionReason(reason string) bool {
	return slices.Contains(RevisionReasons, reason)
}

// ReviewerStatuses adalah status enrollment yang tampil di portal reviewer: menunggu dinilai dan
// riwayat keputusan.
var ReviewerStatuses = []EnrollmentStatus{
	EnrollmentInReview, EnrollmentRevisionRequested, EnrollmentPassed, EnrollmentFailed,
}

// ReviewQueueEntry adalah satu submission B2B di antrean atau riwayat reviewer.
type ReviewQueueEntry struct {
	// Enrollment beserta Case (ringkasan dan Partner).
	Enrollment Enrollment
	// Submission terkirim terakhir beserta Review dan RevisionRequest-nya, atau nil.
	Submission *Submission
}

// DecidedAt adalah waktu keputusan terakhir reviewer, atau nil bila masih menunggu.
func (e *ReviewQueueEntry) DecidedAt() *time.Time {
	if e.Enrollment.Status == EnrollmentInReview || e.Submission == nil {
		return nil
	}
	if e.Submission.Review != nil {
		return &e.Submission.Review.ReviewedAt
	}
	if e.Submission.RevisionRequest != nil {
		return &e.Submission.RevisionRequest.CreatedAt
	}
	return nil
}

// CanRequestRevision bernilai true bila submission masih menunggu dan batas revisi belum habis.
func (e *ReviewQueueEntry) CanRequestRevision() bool {
	return e.Enrollment.Status == EnrollmentInReview && e.Enrollment.RevisionCount < MaxRevisions
}

// ReviewDecision adalah jenis keputusan di draft reviewer.
type ReviewDecision string

const (
	ReviewDecisionGrade    ReviewDecision = "grade"
	ReviewDecisionRevision ReviewDecision = "revision"
)

// IsValid memeriksa apakah keputusan dikenal.
func (d ReviewDecision) IsValid() bool {
	return d == ReviewDecisionGrade || d == ReviewDecisionRevision
}

// DraftCriterion adalah isian satu kriteria di draft (level 0 = belum dipilih).
type DraftCriterion struct {
	Name   string `json:"name"`
	Level  int    `json:"level"`
	Reason string `json:"reason"`
}

// DraftGrade adalah isian form "Nilai" apa adanya (feedback masih teks mentah).
type DraftGrade struct {
	Criteria      []DraftCriterion `json:"criteria"`
	Strengths     string           `json:"strengths"`
	Improvements  string           `json:"improvements"`
	NextSteps     string           `json:"nextSteps"`
	IsRecommended bool             `json:"isRecommended"`
}

// DraftRevision adalah isian form "Kembalikan untuk revisi".
type DraftRevision struct {
	Reason string `json:"reason"`
	Note   string `json:"note"`
}

// DraftGradeValue menyimpan *DraftGrade sebagai jsonb; nil disimpan sebagai {}.
type DraftGradeValue struct{ Grade *DraftGrade }

// Value mengimplementasikan driver.Valuer.
func (v DraftGradeValue) Value() (driver.Value, error) { return jsonObjectValue(v.Grade) }

// Scan mengimplementasikan sql.Scanner.
func (v *DraftGradeValue) Scan(value any) error {
	v.Grade = nil
	return scanJSONObject(value, &v.Grade)
}

// DraftRevisionValue menyimpan *DraftRevision sebagai jsonb; nil disimpan sebagai {}.
type DraftRevisionValue struct{ Revision *DraftRevision }

// Value mengimplementasikan driver.Valuer.
func (v DraftRevisionValue) Value() (driver.Value, error) { return jsonObjectValue(v.Revision) }

// Scan mengimplementasikan sql.Scanner.
func (v *DraftRevisionValue) Scan(value any) error {
	v.Revision = nil
	return scanJSONObject(value, &v.Revision)
}

// ReviewDraft adalah baris tabel review_drafts: isian form reviewer yang tersimpan otomatis.
// Tidak pernah terlihat peserta, dan dihapus saat keputusan dikirim.
type ReviewDraft struct {
	SubmissionID string `gorm:"primaryKey"`
	ReviewerID   string
	Decision     ReviewDecision
	Grade        DraftGradeValue
	Revision     DraftRevisionValue
	SavedAt      time.Time
}

// ReviewDraftPatch adalah simpan sebagian: bagian yang diisi menimpa bagian yang sama di draft.
type ReviewDraftPatch struct {
	Decision    *ReviewDecision
	Grade       *DraftGrade
	HasGrade    bool
	Revision    *DraftRevision
	HasRevision bool
}

// Apply menerapkan patch ke draft.
func (p ReviewDraftPatch) Apply(draft *ReviewDraft) {
	if p.Decision != nil {
		draft.Decision = *p.Decision
	}
	if p.HasGrade {
		draft.Grade.Grade = p.Grade
	}
	if p.HasRevision {
		draft.Revision.Revision = p.Revision
	}
}

// RevisionDecision adalah semua perubahan saat reviewer mengembalikan submission untuk revisi.
type RevisionDecision struct {
	EnrollmentID string
	SubmissionID string
	ReviewerID   string
	Reason       string
	Note         string
	// DeadlineAt adalah tenggat baru peserta.
	DeadlineAt time.Time
	At         time.Time
}

// InitialShareConsent menentukan persetujuan berbagi profil saat peserta direkomendasikan,
// mengikuti pengaturan bawaan di profil.
func InitialShareConsent(shareDefault ShareDefault) string {
	switch shareDefault {
	case ShareDefaultAlways:
		return ShareConsentGranted
	case ShareDefaultNever:
		return ShareConsentDeclined
	}
	return ShareConsentPending
}

// Nilai share_consent di enrollment. Sama dengan TShareConsent di client.
const (
	ShareConsentPending  = "pending"
	ShareConsentGranted  = "granted"
	ShareConsentDeclined = "declined"
)

func jsonObjectValue(v any) (driver.Value, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("failed to encode jsonb: %w", err)
	}
	if string(raw) == "null" {
		return "{}", nil
	}
	return string(raw), nil
}

// scanJSONObject membaca jsonb ke *target; objek kosong {} berarti nil.
func scanJSONObject[T any](value any, target **T) error {
	var raw []byte
	switch v := value.(type) {
	case nil:
		return nil
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported type %T for jsonb", value)
	}
	if string(raw) == "{}" || len(raw) == 0 {
		return nil
	}
	var decoded T
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return err
	}
	*target = &decoded
	return nil
}
