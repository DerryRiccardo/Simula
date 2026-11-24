package app

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	sharedModule "github.com/DerryRiccardo/Simula/server/core/module/shared"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	"github.com/DerryRiccardo/Simula/server/task"
)

// backgroundJobs adalah job berkala yang dijalankan server. Semuanya idempoten, jadi aman
// dijalankan beberapa replika sekaligus.
func backgroundJobs(payments *sharedModule.PaymentService, authUC authModule.AuthUseCase, uploadUC studentModule.UploadUseCase) []task.BackgroundJob {
	return []task.BackgroundJob{
		{
			Name:     "order:expire_overdue",
			Interval: task.OrderExpirySweepInterval,
			// Langsung dijalankan saat server menyala untuk order yang timer-nya hilang saat restart.
			InitialDelay: 5 * time.Second,
			Run: func(ctx context.Context) error {
				expired, err := payments.ExpireOverdue(ctx, task.OrderExpirySweepBatch)
				if expired > 0 {
					log.Info().Int("expired", expired).Msg("overdue orders expired")
				}
				return err
			},
		},
		{
			Name:         "files:cleanup_pending",
			Interval:     task.PendingFilesCleanupInterval,
			InitialDelay: 10 * time.Minute,
			Run: func(ctx context.Context) error {
				deleted, err := uploadUC.CleanupPendingFiles(ctx)
				if deleted > 0 {
					log.Info().Int64("deleted", deleted).Msg("pending files cleaned up")
				}
				return err
			},
		},
		{
			Name:         "auth:cleanup_expired_sessions",
			Interval:     task.ExpiredSessionsCleanupInterval,
			InitialDelay: 15 * time.Minute,
			Run: func(ctx context.Context) error {
				deleted, err := authUC.CleanupExpiredSessions(ctx)
				if deleted > 0 {
					log.Info().Int64("deleted", deleted).Msg("expired sessions cleaned up")
				}
				return err
			},
		},
	}
}
