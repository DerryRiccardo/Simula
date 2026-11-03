package task

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// Task penilaian AI (AI-CONTEXT.md §6.1): satu task per kriteria secara berurutan, lalu satu task
// untuk menyusun feedback.
const (
	TypeGradingEvaluateCriterion = "grading:evaluate_criterion"
	TypeGradingComposeFeedback   = "grading:compose_feedback"
	TypeGradingResumeStalled     = "grading:resume_stalled"
)

// EvaluateCriterionPayload menunjuk satu kriteria di satu run.
type EvaluateCriterionPayload struct {
	RunID    string `json:"runId"`
	Position int    `json:"position"`
}

// NewEvaluateCriterionTask membuat task penilaian satu kriteria.
func NewEvaluateCriterionTask(payload EvaluateCriterionPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode evaluate criterion payload: %w", err)
	}
	return asynq.NewTask(TypeGradingEvaluateCriterion, data), nil
}

// GradingWorker diimplementasikan shared.GradingService.
type GradingWorker interface {
	EvaluateCriterion(ctx context.Context, runID string, position int) error
	ComposeFeedback(ctx context.Context, runID string) error
	FailRun(ctx context.Context, runID string, cause error) error
	ResumeStalled(ctx context.Context) (int, error)
}

// EvaluateCriterionHandler menilai satu kriteria. Idempoten: kriteria yang sudah dinilai hanya
// melanjutkan ke langkah berikutnya.
type EvaluateCriterionHandler struct {
	worker GradingWorker
}

// NewEvaluateCriterionHandler membuat handler task.
func NewEvaluateCriterionHandler(worker GradingWorker) *EvaluateCriterionHandler {
	return &EvaluateCriterionHandler{worker: worker}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *EvaluateCriterionHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload EvaluateCriterionPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		log.Warn().Err(err).Msg("invalid evaluate criterion payload")
		return nil
	}
	err := h.worker.EvaluateCriterion(ctx, payload.RunID, payload.Position)
	return failOnLastAttempt(ctx, h.worker, payload.RunID, err)
}

// failOnLastAttempt membiarkan Asynq mengulang task yang gagal; pada percobaan terakhir run
// ditandai gagal agar peserta bisa submit ulang, alih-alih skor dikarang (AI-CONTEXT.md §7).
func failOnLastAttempt(ctx context.Context, worker GradingWorker, runID string, err error) error {
	if err == nil {
		return nil
	}
	retried, _ := asynq.GetRetryCount(ctx)
	maxRetry, _ := asynq.GetMaxRetry(ctx)
	if retried < maxRetry {
		return err
	}
	if failErr := worker.FailRun(ctx, runID, err); failErr != nil {
		return errors.Join(err, failErr)
	}
	log.Error().Err(err).Str("run_id", runID).Msg("grading run failed permanently")
	return nil
}
