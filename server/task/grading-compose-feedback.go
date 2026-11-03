package task

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// ComposeFeedbackPayload menunjuk run yang semua kriterianya sudah dinilai.
type ComposeFeedbackPayload struct {
	RunID string `json:"runId"`
}

// NewComposeFeedbackTask membuat task penyusunan feedback.
func NewComposeFeedbackTask(payload ComposeFeedbackPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode compose feedback payload: %w", err)
	}
	return asynq.NewTask(TypeGradingComposeFeedback, data), nil
}

// ComposeFeedbackHandler menyusun feedback lalu memfinalkan penilaian lewat hook OnReviewed.
type ComposeFeedbackHandler struct {
	worker GradingWorker
}

// NewComposeFeedbackHandler membuat handler task.
func NewComposeFeedbackHandler(worker GradingWorker) *ComposeFeedbackHandler {
	return &ComposeFeedbackHandler{worker: worker}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *ComposeFeedbackHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload ComposeFeedbackPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		log.Warn().Err(err).Msg("invalid compose feedback payload")
		return nil
	}
	err := h.worker.ComposeFeedback(ctx, payload.RunID)
	return failOnLastAttempt(ctx, h.worker, payload.RunID, err)
}
