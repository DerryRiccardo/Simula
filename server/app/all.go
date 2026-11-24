package app

import (
	"context"

	"github.com/DerryRiccardo/Simula/server/config"
)

// RunAll menjalankan server HTTP (penilaian AI kini berjalan in-process via goroutine pool
// sehingga tidak memicu polling Asynq ke Redis).
func RunAll(ctx context.Context, cfg *config.Config) error {
	return RunServer(ctx, cfg)
}
