package app

import (
	"context"

	"golang.org/x/sync/errgroup"

	"github.com/DerryRiccardo/Simula/server/config"
)

// RunAll menjalankan server dan worker dalam satu proses (untuk lokal). Bila salah satu gagal,
// yang lain ikut dihentikan.
func RunAll(ctx context.Context, cfg *config.Config) error {
	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error { return RunServer(gctx, cfg) })
	g.Go(func() error { return RunWorker(gctx, cfg) })
	return g.Wait()
}
