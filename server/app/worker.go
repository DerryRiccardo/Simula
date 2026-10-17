package app

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"

	"github.com/DerryRiccardo/Simula/server/config"
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

	mux := asynq.NewServeMux()
	if err := task.Register(mux, taskEntries()); err != nil {
		return fmt.Errorf("failed to register tasks: %w", err)
	}

	scheduler, err := initializers.NewAsynqScheduler(cfg)
	if err != nil {
		return err
	}
	return initializers.RunAsynq(ctx, initializers.NewAsynqServer(cfg), mux, scheduler)
}

// taskEntries adalah daftar semua task yang dijalankan worker. Tambahkan entri di sini setiap
// membuat task baru.
func taskEntries() []task.Entry {
	return []task.Entry{}
}
