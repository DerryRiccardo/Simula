package task

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// TypeCleanupPendingFiles menghapus berkas yang diunggah tetapi tidak pernah dipakai di draft atau
// submission. Dijalankan scheduler setiap jam.
const TypeCleanupPendingFiles = "files:cleanup_pending"

// CleanupPendingFilesSchedule adalah jadwal cron (zona Asia/Jakarta): setiap jam pada menit ke-30.
const CleanupPendingFilesSchedule = "30 * * * *"

// PendingFileCleaner diimplementasikan use case unggah.
type PendingFileCleaner interface {
	CleanupPendingFiles(ctx context.Context) (int64, error)
}

// NewCleanupPendingFilesTask membuat task tanpa payload.
func NewCleanupPendingFilesTask() *asynq.Task {
	return asynq.NewTask(TypeCleanupPendingFiles, nil)
}

// CleanupPendingFilesHandler menjalankan pembersihan. Idempoten: berkas yang sudah terhapus tidak
// muncul lagi di daftar berikutnya.
type CleanupPendingFilesHandler struct {
	cleaner PendingFileCleaner
}

// NewCleanupPendingFilesHandler membuat handler task.
func NewCleanupPendingFilesHandler(cleaner PendingFileCleaner) *CleanupPendingFilesHandler {
	return &CleanupPendingFilesHandler{cleaner: cleaner}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *CleanupPendingFilesHandler) ProcessTask(ctx context.Context, _ *asynq.Task) error {
	deleted, err := h.cleaner.CleanupPendingFiles(ctx)
	if err != nil {
		return fmt.Errorf("failed to clean up pending files: %w", err)
	}
	log.Info().Int64("deleted", deleted).Msg("pending files cleaned up")
	return nil
}
