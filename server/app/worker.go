package app

import (
	"context"
	"fmt"
	"time"

	"github.com/hibiken/asynq"

	"github.com/DerryRiccardo/Simula/server/config"
	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
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

	authUC := newAuthUseCase(cfg, db)
	store := newStorage(cfg)
	uploadUC := newUploadUseCase(cfg, db, store)

	entries := taskEntries(authUC, uploadUC)
	entries = append(entries, task.Entry{Type: task.TypeOrderExpire, Handler: task.NewOrderExpireHandler(newPayments(cfg, db).service)})
	periodic := periodicTasks()

	mux := asynq.NewServeMux()
	if err := task.Register(mux, entries); err != nil {
		return fmt.Errorf("failed to register tasks: %w", err)
	}

	scheduler, err := initializers.NewAsynqScheduler(cfg)
	if err != nil {
		return err
	}
	if err := registerPeriodicTasks(scheduler, cfg.QueueName, periodic); err != nil {
		return err
	}
	return initializers.RunAsynq(ctx, initializers.NewAsynqServer(cfg), mux, scheduler)
}

// taskEntries adalah daftar semua task yang dijalankan worker. Tambahkan entri di sini setiap
// membuat task baru.
func taskEntries(authUC authModule.AuthUseCase, uploadUC studentModule.UploadUseCase) []task.Entry {
	return []task.Entry{
		{Type: task.TypeCleanupExpiredSessions, Handler: task.NewCleanupExpiredSessionsHandler(authUC)},
		{Type: task.TypeCleanupPendingFiles, Handler: task.NewCleanupPendingFilesHandler(uploadUC)},
	}
}

type periodicTask struct {
	cron string
	task *asynq.Task
}

// periodicTasks adalah task terjadwal yang selalu aktif.
func periodicTasks() []periodicTask {
	return []periodicTask{
		{cron: task.CleanupExpiredSessionsSchedule, task: task.NewCleanupExpiredSessionsTask()},
		{cron: task.CleanupPendingFilesSchedule, task: task.NewCleanupPendingFilesTask()},
	}
}

// registerPeriodicTasks mendaftarkan task terjadwal. asynq.Unique mencegah beberapa replika worker
// mengantrekan run yang sama dua kali.
func registerPeriodicTasks(scheduler *asynq.Scheduler, queueName string, periodic []periodicTask) error {
	for _, item := range periodic {
		if _, err := scheduler.Register(item.cron, item.task, asynq.Queue(queueName), asynq.Unique(time.Hour)); err != nil {
			return fmt.Errorf("failed to schedule %s: %w", item.task.Type(), err)
		}
	}
	return nil
}
