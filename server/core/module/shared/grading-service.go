// Package shared berisi logika yang dipakai use case dan task. Package ini tidak boleh meng-import
// task atau hook; efek lanjutan diteruskan lewat fungsi yang diinjeksi.
package shared

import (
	"context"
	"errors"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// failureMessageMaxRunes membatasi pesan error yang disimpan di ai_grading_runs.
const failureMessageMaxRunes = 500

// GradingDeps adalah dependency GradingService.
type GradingDeps struct {
	Grading coreRepo.GradingRepository
	Cases   coreRepo.CaseRepository
	LLM     coreRepo.LLM
	Queue   coreRepo.GradingQueue
	// OnReviewed memfinalkan hasil (hook.OnReviewed): skor, status, dan sertifikat.
	OnReviewed func(ctx context.Context, outcome entity.ReviewOutcome) error
	Now        func() time.Time
}

// GradingService menjalankan penilaian AI satu langkah per task (AI-CONTEXT.md §6.1). Setiap
// langkah idempoten, sehingga task yang diulang atau dilanjutkan ulang tidak menilai dua kali.
type GradingService struct {
	GradingDeps
}

// NewGradingService membuat GradingService.
func NewGradingService(deps GradingDeps) *GradingService {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &GradingService{GradingDeps: deps}
}

// EvaluateCriterion menilai kriteria pada posisi rubrik tertentu, lalu mengantrekan langkah
// berikutnya. Panggilan per kriteria tidak melihat hasil kriteria lain.
func (s *GradingService) EvaluateCriterion(ctx context.Context, runID string, position int) error {
	job, ok, err := s.loadActiveJob(ctx, runID)
	if err != nil || !ok {
		return err
	}
	row, ok := criterionAt(job.Run, position)
	if !ok {
		log.Warn().Str("run_id", runID).Int("position", position).Msg("grading criterion not found")
		return nil
	}
	if row.Status == entity.AIGradingCriterionDone {
		return s.enqueueAfter(ctx, job.Run, position)
	}

	c, err := s.Cases.GetWithBriefByID(ctx, job.Enrollment.CaseID)
	if err != nil {
		return fmt.Errorf("failed to load case of run %s: %w", runID, err)
	}
	criterion, ok := rubricAt(c, position)
	if !ok {
		return fmt.Errorf("rubric criterion %d not found for run %s", position, runID)
	}
	verdict, err := s.LLM.EvaluateCriterion(ctx, entity.CriterionEvaluation{
		Case: c, Criterion: criterion, Content: job.Submission.SubmissionContent,
	})
	if err != nil {
		return fmt.Errorf("failed to evaluate criterion %d of run %s: %w", position, runID, err)
	}
	if err := entity.ValidateCriterionVerdict(verdict.Level, verdict.Reason); err != nil {
		return fmt.Errorf("invalid verdict for criterion %d of run %s: %w", position, runID, err)
	}
	if err := s.Grading.SaveCriterionResult(ctx, row.ID, verdict, s.Now()); err != nil {
		return err
	}
	return s.enqueueAfter(ctx, job.Run, position)
}

// ComposeFeedback menyusun feedback dari semua kriteria, lalu memfinalkan hasil lewat OnReviewed.
func (s *GradingService) ComposeFeedback(ctx context.Context, runID string) error {
	job, ok, err := s.loadActiveJob(ctx, runID)
	if err != nil || !ok {
		return err
	}
	if next := job.Run.NextPendingPosition(); next != 0 {
		// Belum semua kriteria dinilai (mis. dipanggil ulang terlalu cepat): lanjutkan kriterianya.
		return s.Queue.EnqueueCriterion(ctx, runID, next)
	}
	c, err := s.Cases.GetWithBriefByID(ctx, job.Enrollment.CaseID)
	if err != nil {
		return fmt.Errorf("failed to load case of run %s: %w", runID, err)
	}

	results, scores, err := collectResults(job.Run, c)
	if err != nil {
		return fmt.Errorf("failed to collect results of run %s: %w", runID, err)
	}
	feedback, err := s.LLM.ComposeFeedback(ctx, entity.FeedbackRequest{Case: c, Results: results})
	if err != nil {
		return fmt.Errorf("failed to compose feedback of run %s: %w", runID, err)
	}
	if err := entity.ValidateFeedback(feedback); err != nil {
		return fmt.Errorf("invalid feedback for run %s: %w", runID, err)
	}

	runRef := job.Run.ID
	return s.OnReviewed(ctx, entity.ReviewOutcome{
		EnrollmentID: job.Enrollment.ID,
		SubmissionID: job.Submission.ID,
		ReviewerType: entity.ReviewerAI,
		ReviewerRole: entity.AIReviewerRole,
		Scores:       scores,
		Feedback:     feedback,
		GradingRunID: &runRef,
	})
}

// FailRun menandai run gagal permanen setelah semua percobaan habis. Peserta bisa submit ulang dan
// percobaan ini tidak dihitung.
func (s *GradingService) FailRun(ctx context.Context, runID string, cause error) error {
	return s.Grading.Fail(ctx, runID, truncate(cause.Error(), failureMessageMaxRunes), s.Now())
}

// ResumeStalled mengantrekan ulang langkah berikutnya dari run yang macet, misalnya karena enqueue
// setelah submit gagal atau worker sempat mati. Submission yang dikirim saat penilai AI nonaktif
// (belum punya run) dibuatkan run lalu ikut diantrekan.
func (s *GradingService) ResumeStalled(ctx context.Context) (int, error) {
	started, err := s.startUngraded(ctx)
	if err != nil {
		return 0, err
	}
	runs, err := s.Grading.ListStalled(ctx, s.Now().Add(-entity.AIGradingStallAfter), entity.AIGradingStalledBatch)
	if err != nil {
		return started, err
	}
	resumed := started
	for i := range runs {
		run := &runs[i]
		next := run.NextPendingPosition()
		if next == 0 {
			err = s.Queue.EnqueueFeedback(ctx, run.ID)
		} else {
			err = s.Queue.EnqueueCriterion(ctx, run.ID, next)
		}
		if err != nil {
			log.Warn().Err(err).Str("run_id", run.ID).Msg("failed to resume grading run")
			continue
		}
		resumed++
	}
	return resumed, nil
}

// startUngraded membuat run untuk submission AI yang belum punya run, lalu mengantrekan kriteria
// pertama. Mengembalikan jumlah run yang berhasil diantrekan.
func (s *GradingService) startUngraded(ctx context.Context) (int, error) {
	ungraded, err := s.Grading.ListUngraded(ctx, entity.AIGradingStalledBatch)
	if err != nil {
		return 0, err
	}
	started := 0
	for _, item := range ungraded {
		count, err := s.Cases.CountRubricCriteria(ctx, item.CaseID)
		if err != nil {
			return started, fmt.Errorf("failed to count rubric of case %s: %w", item.CaseID, err)
		}
		if count == 0 {
			log.Warn().Str("submission_id", item.SubmissionID).Msg("case has no rubric criteria; skipping grading")
			continue
		}
		criterionIDs := make([]string, 0, count)
		for range count {
			criterionIDs = append(criterionIDs, uuid.NewString())
		}
		run := entity.NewAIGradingRun(uuid.NewString(), item.SubmissionID, s.LLM.Model(), criterionIDs, s.Now())
		created, err := s.Grading.CreateRun(ctx, &run)
		if err != nil {
			return started, err
		}
		if !created {
			continue
		}
		if err := s.Queue.EnqueueCriterion(ctx, run.ID, 1); err != nil {
			// Run sudah tersimpan; giliran berikutnya melanjutkannya sebagai run macet.
			log.Warn().Err(err).Str("run_id", run.ID).Msg("failed to enqueue grading")
			continue
		}
		started++
	}
	return started, nil
}

// loadActiveJob memuat run yang masih berjalan. ok bernilai false bila run sudah tidak ada atau
// sudah selesai, sehingga task cukup berhenti tanpa diulang.
func (s *GradingService) loadActiveJob(ctx context.Context, runID string) (entity.GradingJob, bool, error) {
	job, err := s.Grading.LoadJob(ctx, runID)
	if errors.Is(err, coreErrors.ErrGradingRunNotFound) {
		log.Warn().Str("run_id", runID).Msg("grading run not found")
		return entity.GradingJob{}, false, nil
	}
	if err != nil {
		return entity.GradingJob{}, false, err
	}
	return job, !job.Run.IsFinished(), nil
}

func (s *GradingService) enqueueAfter(ctx context.Context, run entity.AIGradingRun, position int) error {
	if position < len(run.Criteria) {
		return s.Queue.EnqueueCriterion(ctx, run.ID, position+1)
	}
	return s.Queue.EnqueueFeedback(ctx, run.ID)
}

func criterionAt(run entity.AIGradingRun, position int) (entity.AIGradingCriterion, bool) {
	for _, criterion := range run.Criteria {
		if criterion.CriterionPosition == position {
			return criterion, true
		}
	}
	return entity.AIGradingCriterion{}, false
}

func rubricAt(c entity.Case, position int) (entity.RubricCriterion, bool) {
	for _, criterion := range c.Rubric {
		if criterion.Position == position {
			return criterion, true
		}
	}
	return entity.RubricCriterion{}, false
}

// collectResults memasangkan hasil setiap kriteria dengan rubriknya. Nama dan bobot disalin ke skor
// supaya hasil tidak berubah bila rubrik diedit setelah dinilai.
func collectResults(run entity.AIGradingRun, c entity.Case) ([]entity.CriterionResult, []entity.ReviewCriterionScore, error) {
	results := make([]entity.CriterionResult, 0, len(run.Criteria))
	scores := make([]entity.ReviewCriterionScore, 0, len(run.Criteria))
	for _, row := range run.Criteria {
		criterion, ok := rubricAt(c, row.CriterionPosition)
		if !ok || row.Level == nil {
			return nil, nil, fmt.Errorf("criterion %d has no result", row.CriterionPosition)
		}
		results = append(results, entity.CriterionResult{Criterion: criterion, Level: *row.Level, Reason: row.Reason})
		scores = append(scores, entity.ReviewCriterionScore{
			Position: row.CriterionPosition,
			Name:     criterion.Name,
			Weight:   criterion.Weight,
			Level:    *row.Level,
			Reason:   row.Reason,
		})
	}
	return results, scores, nil
}

func truncate(s string, maxRunes int) string {
	if utf8.RuneCountInString(s) <= maxRunes {
		return s
	}
	return string([]rune(s)[:maxRunes])
}
