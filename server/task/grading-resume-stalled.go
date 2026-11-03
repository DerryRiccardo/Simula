package task

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// GradingResumeStalledSchedule adalah jadwal cron (zona Asia/Jakarta): setiap 5 menit.
const GradingResumeStalledSchedule = "*/5 * * * *"

// NewGradingResumeStalledTask membuat task periodik tanpa payload.
func NewGradingResumeStalledTask() *asynq.Task {
	return asynq.NewTask(TypeGradingResumeStalled, nil)
}

// ResumeStalledHandler melanjutkan run yang macet. Aman dijalankan ulang karena setiap langkah
// penilaian idempoten.
type ResumeStalledHandler struct {
	worker GradingWorker
}

// NewResumeStalledHandler membuat handler task.
func NewResumeStalledHandler(worker GradingWorker) *ResumeStalledHandler {
	return &ResumeStalledHandler{worker: worker}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *ResumeStalledHandler) ProcessTask(ctx context.Context, _ *asynq.Task) error {
	resumed, err := h.worker.ResumeStalled(ctx)
	if err != nil {
		return fmt.Errorf("failed to resume stalled grading: %w", err)
	}
	if resumed > 0 {
		log.Info().Int("resumed", resumed).Msg("stalled grading runs resumed")
	}
	return nil
}
