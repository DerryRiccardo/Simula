package task

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// TypeCleanupExpiredSessions menghapus refresh token yang sudah lama kedaluwarsa. Dijalankan
// scheduler setiap hari.
const TypeCleanupExpiredSessions = "auth:cleanup_expired_sessions"

// CleanupExpiredSessionsSchedule adalah jadwal cron (zona Asia/Jakarta): setiap hari pukul 03.00.
const CleanupExpiredSessionsSchedule = "0 3 * * *"

// SessionCleaner diimplementasikan use case auth.
type SessionCleaner interface {
	CleanupExpiredSessions(ctx context.Context) (int64, error)
}

// NewCleanupExpiredSessionsTask membuat task tanpa payload.
func NewCleanupExpiredSessionsTask() *asynq.Task {
	return asynq.NewTask(TypeCleanupExpiredSessions, nil)
}

// CleanupExpiredSessionsHandler menjalankan pembersihan. Idempoten: menghapus ulang baris yang
// sudah tidak ada tidak berdampak apa pun.
type CleanupExpiredSessionsHandler struct {
	cleaner SessionCleaner
}

// NewCleanupExpiredSessionsHandler membuat handler task.
func NewCleanupExpiredSessionsHandler(cleaner SessionCleaner) *CleanupExpiredSessionsHandler {
	return &CleanupExpiredSessionsHandler{cleaner: cleaner}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *CleanupExpiredSessionsHandler) ProcessTask(ctx context.Context, _ *asynq.Task) error {
	deleted, err := h.cleaner.CleanupExpiredSessions(ctx)
	if err != nil {
		return fmt.Errorf("failed to clean up expired sessions: %w", err)
	}
	log.Info().Int64("deleted", deleted).Msg("expired sessions cleaned up")
	return nil
}
