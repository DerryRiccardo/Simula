// Package llm berisi implementasi coreRepo.LLM. Fake dipakai selama development (LLM_PROVIDER=fake)
// dan ditolak di production; integrasi Gemini menyusul di package yang sama.
package llm

import (
	"context"
	"crypto/sha256"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// FakeModel dicatat di ai_grading_runs.model untuk penilaian palsu.
const FakeModel = "fake-v1"

// levelByBucket memetakan 20 kelompok hash ke level 2–5 (rata-rata ±3,8, jadi kebanyakan lulus
// dan sesekali tidak). Level 1 tidak dipakai karena submission sudah lolos validasi isi.
var levelByBucket = [20]int{2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5}

// Fake adalah penilai palsu yang deterministik: submission yang sama selalu mendapat level yang sama.
type Fake struct {
	delay time.Duration
}

// NewFake membuat penilai palsu. delay meniru lama satu panggilan LLM agar progres terlihat.
func NewFake(delay time.Duration) *Fake {
	return &Fake{delay: delay}
}

// Model mengimplementasikan coreRepo.LLM.
func (f *Fake) Model() string {
	return FakeModel
}

// EvaluateCriterion mengimplementasikan coreRepo.LLM.
func (f *Fake) EvaluateCriterion(ctx context.Context, in entity.CriterionEvaluation) (entity.CriterionVerdict, error) {
	if err := f.wait(ctx); err != nil {
		return entity.CriterionVerdict{}, err
	}
	sum := sha256.Sum256([]byte(fingerprint(in.Content) + "|" + in.Criterion.Name))
	level := levelByBucket[int(sum[0])%len(levelByBucket)]
	return entity.CriterionVerdict{Level: level, Reason: reasonFor(in.Criterion, level)}, nil
}

// ComposeFeedback mengimplementasikan coreRepo.LLM.
func (f *Fake) ComposeFeedback(ctx context.Context, in entity.FeedbackRequest) (entity.ReviewFeedback, error) {
	if err := f.wait(ctx); err != nil {
		return entity.ReviewFeedback{}, err
	}
	results := make([]entity.CriterionResult, len(in.Results))
	copy(results, in.Results)
	sort.SliceStable(results, func(i, j int) bool { return results[i].Level > results[j].Level })

	var feedback entity.ReviewFeedback
	for _, result := range results {
		if result.Level >= 4 && len(feedback.Strengths) < 2 {
			feedback.Strengths = append(feedback.Strengths, fmt.Sprintf("%s sudah kuat: %s", result.Criterion.Name, result.Reason))
		}
	}
	for i := len(results) - 1; i >= 0 && len(feedback.Improvements) < 2; i-- {
		result := results[i]
		if result.Level <= 3 {
			feedback.Improvements = append(feedback.Improvements, improvementFor(result))
		}
	}
	if len(feedback.Strengths) == 0 {
		feedback.Strengths = []string{"Semua deliverable terkumpul dan mengikuti format yang diminta brief."}
	}
	if len(feedback.Improvements) == 0 {
		feedback.Improvements = []string{"Tambahkan bukti atau angka pendukung di setiap keputusan agar penilaian lebih meyakinkan."}
	}
	feedback.NextSteps = []string{"Tulis ringkasan asumsi dan keputusanmu sebelum mengerjakan case berikutnya."}
	if len(results) > 0 {
		weakest := results[len(results)-1].Criterion.Name
		feedback.NextSteps = append([]string{
			fmt.Sprintf("Baca ulang deskripsi level di rubrik %s dan bandingkan dengan jawabanmu.", weakest),
		}, feedback.NextSteps...)
	}
	return feedback, nil
}

func (f *Fake) wait(ctx context.Context) error {
	if f.delay <= 0 {
		return nil
	}
	timer := time.NewTimer(f.delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

// fingerprint menyusun isi submission secara stabil (urut slot) sebagai dasar hash.
func fingerprint(content entity.SubmissionContent) string {
	keys := make([]string, 0, len(content.SlotValues))
	for key := range content.SlotValues {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var b strings.Builder
	for _, key := range keys {
		value := content.SlotValues[key]
		b.WriteString(key)
		b.WriteString("=")
		if value.File != nil {
			b.WriteString(value.File.FileID)
		} else {
			b.WriteString(value.Text)
		}
		b.WriteString(";")
	}
	b.WriteString(content.Note)
	return b.String()
}

// reasonFor memakai deskripsi level dari rubrik bila tersedia, seperti alasan yang ditulis penilai.
func reasonFor(criterion entity.RubricCriterion, level int) string {
	if len(criterion.LevelDescriptions) == entity.CriterionLevelMax {
		return criterion.LevelDescriptions[level-1]
	}
	return fmt.Sprintf("Bagian %s dinilai level %d dari %d berdasarkan rubrik.", strings.ToLower(criterion.Name), level, entity.CriterionLevelMax)
}

func improvementFor(result entity.CriterionResult) string {
	descriptions := result.Criterion.LevelDescriptions
	if len(descriptions) == entity.CriterionLevelMax && result.Level < entity.CriterionLevelMax {
		return fmt.Sprintf("Untuk %s, targetkan level berikutnya: %s", strings.ToLower(result.Criterion.Name), descriptions[result.Level])
	}
	return fmt.Sprintf("Perdalam bagian %s dengan contoh dan alasan yang lebih spesifik.", strings.ToLower(result.Criterion.Name))
}
