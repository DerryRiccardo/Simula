package app

import (
	"context"
	"fmt"
	"time"

	"github.com/hibiken/asynq"

	"github.com/DerryRiccardo/Simula/server/config"
	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	"github.com/DerryRiccardo/Simula/server/initializers"
	"github.com/DerryRiccardo/Simula/server/task"
)

// RunWorker menjalankan consumer dan scheduler Asynq sampai ctx selesai.
func RunWorker(ctx context.Context, cfg *config.Config) error {
	db, err := initializers.NewDB(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseDB(db)

	rdb, err := initializers.NewRedisClient(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseRedis(rdb)

	authUC := newAuthUseCase(cfg, db, rdb)

	mux := asynq.NewServeMux()
	if err := task.Register(mux, taskEntries(authUC)); err != nil {
		return fmt.Errorf("failed to register tasks: %w", err)
	}

	scheduler, err := initializers.NewAsynqScheduler(cfg)
	if err != nil {
		return err
	}
	if err := registerPeriodicTasks(scheduler, cfg.QueueName); err != nil {
		return err
	}
	return initializers.RunAsynq(ctx, initializers.NewAsynqServer(cfg), mux, scheduler)
}

// taskEntries adalah daftar semua task yang dijalankan worker. Tambahkan entri di sini setiap
// membuat task baru.
func taskEntries(authUC authModule.AuthUseCase) []task.Entry {
	return []task.Entry{
		{Type: task.TypeCleanupExpiredSessions, Handler: task.NewCleanupExpiredSessionsHandler(authUC)},
	}
}

// registerPeriodicTasks mendaftarkan task terjadwal. asynq.Unique mencegah beberapa replika worker
// mengantrekan run yang sama dua kali.
func registerPeriodicTasks(scheduler *asynq.Scheduler, queueName string) error {
	_, err := scheduler.Register(
		task.CleanupExpiredSessionsSchedule,
		task.NewCleanupExpiredSessionsTask(),
		asynq.Queue(queueName),
		asynq.Unique(time.Hour),
	)
	if err != nil {
		return fmt.Errorf("failed to schedule %s: %w", task.TypeCleanupExpiredSessions, err)
	}
	return nil
}
