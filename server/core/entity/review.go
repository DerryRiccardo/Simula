package entity

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

// ReviewerType membedakan penilaian AI dan reviewer manusia.
type ReviewerType string

const (
	ReviewerAI    ReviewerType = "ai"
	ReviewerHuman ReviewerType = "human"
)

// AIReviewerRole adalah nama penilai yang ditampilkan untuk AI case (sama dengan client).
const AIReviewerRole = "Penilai AI"

// FallbackReviewerRole dipakai bila case B2B tidak menyebut jabatan reviewer.
const FallbackReviewerRole = "Reviewer mitra"

// Batas isian penilaian (AI-CONTEXT.md §6.3).
const (
	CriterionLevelMin       = 1
	CriterionLevelMax       = 5
	CriterionReasonMaxRunes = 600
	FeedbackItemsMin        = 1
	FeedbackItemsMax        = 3
	FeedbackItemMaxRunes    = 300
)

// Review adalah baris tabel reviews: hasil final satu submission.
type Review struct {
	ID            string
	SubmissionID  string
	ReviewerType  ReviewerType
	ReviewerID    *string
	ReviewerRole  string
	TotalScore    int
	PassingScore  int
	IsPassed      bool
	Strengths     StringList
	Improvements  StringList
	NextSteps     StringList
	IsRecommended bool
	ReviewedAt    time.Time

	Scores []ReviewCriterionScore `gorm:"foreignKey:ReviewID"`
}

// ReviewCriterionScore adalah skor satu kriteria. Nama dan bobot disalin dari rubrik saat dinilai.
type ReviewCriterionScore struct {
	ID       string
	ReviewID string
	Position int
	Name     string
	Weight   int
	Level    int
	Reason   string
}

// ReviewFeedback adalah feedback keseluruhan tiga bagian.
type ReviewFeedback struct {
	Strengths    []string
	Improvements []string
	NextSteps    []string
}

// ReviewOutcome adalah hasil penilaian (AI atau reviewer) yang diteruskan ke hook OnReviewed.
type ReviewOutcome struct {
	EnrollmentID  string
	SubmissionID  string
	ReviewerType  ReviewerType
	ReviewerID    *string
	ReviewerRole  string
	Scores        []ReviewCriterionScore
	Feedback      ReviewFeedback
	IsRecommended bool
	// GradingRunID diisi untuk AI case, supaya run ikut ditandai selesai.
	GradingRunID *string
}

// ReviewFinalization adalah semua perubahan saat sebuah submission selesai dinilai.
type ReviewFinalization struct {
	Review       Review
	EnrollmentID string
	From         []EnrollmentStatus
	To           EnrollmentStatus
	// Certificate diisi bila lulus.
	Certificate  *Certificate
	GradingRunID *string
	At           time.Time
}

// CalculateScore menghitung skor total 0–100 (AI-CONTEXT.md §6.4): poin kriteria = level ÷ 5 ×
// bobot, lalu jumlah poin dibulatkan ke bilangan bulat. Poin selalu kelipatan 0,1, jadi dihitung
// dalam persepuluhan agar tidak ada galat pembulatan pecahan.
func CalculateScore(scores []ReviewCriterionScore) int {
	tenths := 0
	for _, score := range scores {
		tenths += score.Level * score.Weight * 2
	}
	return (tenths + 5) / 10
}

// IsPassed bernilai true bila skor mencapai ambang lulus case.
func IsPassed(score, passingScore int) bool {
	return score >= passingScore
}

// ValidateCriterionVerdict memeriksa output penilaian satu kriteria. Output tidak valid membuat
// task diulang, bukan dikarang.
func ValidateCriterionVerdict(level int, reason string) error {
	if level < CriterionLevelMin || level > CriterionLevelMax {
		return fmt.Errorf("criterion level %d out of range", level)
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return errors.New("criterion reason is empty")
	}
	if utf8.RuneCountInString(reason) > CriterionReasonMaxRunes {
		return errors.New("criterion reason is too long")
	}
	return nil
}

// ValidateFeedback memeriksa feedback tiga bagian: masing-masing 1–3 poin yang tidak kosong.
func ValidateFeedback(feedback ReviewFeedback) error {
	parts := map[string][]string{
		"strengths":    feedback.Strengths,
		"improvements": feedback.Improvements,
		"nextSteps":    feedback.NextSteps,
	}
	for name, items := range parts {
		if len(items) < FeedbackItemsMin || len(items) > FeedbackItemsMax {
			return fmt.Errorf("feedback %s must have %d-%d items", name, FeedbackItemsMin, FeedbackItemsMax)
		}
		for _, item := range items {
			if strings.TrimSpace(item) == "" || utf8.RuneCountInString(item) > FeedbackItemMaxRunes {
				return fmt.Errorf("feedback %s has an empty or too long item", name)
			}
		}
	}
	return nil
}

// certificateAlphabet adalah Crockford base32 tanpa huruf yang mudah tertukar (I, L, O, U).
const certificateAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

// CertificatePublicIDLength adalah jumlah karakter acak di ID verifikasi sertifikat.
const CertificatePublicIDLength = 8

// CertificatePublicID menyusun ID verifikasi publik dari byte acak, misalnya "SIM-7K2Q9X4M".
// 32 membagi 256 tanpa sisa, jadi setiap karakter punya peluang yang sama.
func CertificatePublicID(random []byte) string {
	var b strings.Builder
	b.WriteString("SIM-")
	for _, value := range random[:CertificatePublicIDLength] {
		b.WriteByte(certificateAlphabet[int(value)%len(certificateAlphabet)])
	}
	return b.String()
}

// ReviewerRoleFor mengembalikan nama penilai yang ditampilkan untuk case.
func ReviewerRoleFor(c *Case) string {
	if c.Tier == TierAI {
		return AIReviewerRole
	}
	if c.ReviewerRole != nil && strings.TrimSpace(*c.ReviewerRole) != "" {
		return *c.ReviewerRole
	}
	return FallbackReviewerRole
}
