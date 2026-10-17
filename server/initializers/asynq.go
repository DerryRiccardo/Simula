package initializers

import (
	"context"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/config"
)

// ScheduleLocation dipakai jadwal periodik (misalnya pengingat tenggat) agar mengikuti jam WIB.
const ScheduleLocation = "Asia/Jakarta"

// NewAsynqServer membuat consumer Asynq yang hanya membaca queue dari cfg.QueueName.
func NewAsynqServer(cfg *config.Config) *asynq.Server {
	return asynq.NewServer(AsynqRedisOpt(cfg), asynq.Config{
		Concurrency:     cfg.WorkerConcurrency,
		Queues:          map[string]int{cfg.QueueName: 1},
		ShutdownTimeout: cfg.ShutdownTimeout,
		Logger:          asynqLogger{},
		LogLevel:        asynq.WarnLevel,
		ErrorHandler: asynq.ErrorHandlerFunc(func(_ context.Context, task *asynq.Task, err error) {
			log.Error().Err(err).Str("task_type", task.Type()).Msg("task failed")
		}),
	})
}

// NewAsynqScheduler membuat scheduler untuk task periodik.
func NewAsynqScheduler(cfg *config.Config) (*asynq.Scheduler, error) {
	loc, err := time.LoadLocation(ScheduleLocation)
	if err != nil {
		return nil, fmt.Errorf("failed to load location %s: %w", ScheduleLocation, err)
	}
	return asynq.NewScheduler(AsynqRedisOpt(cfg), &asynq.SchedulerOpts{
		Location: loc,
		Logger:   asynqLogger{},
		LogLevel: asynq.WarnLevel,
	}), nil
}

// RunAsynq menjalankan server dan scheduler Asynq sampai ctx selesai, lalu mematikan keduanya
// dengan menunggu task yang sedang berjalan (maksimal ShutdownTimeout).
func RunAsynq(ctx context.Context, srv *asynq.Server, mux *asynq.ServeMux, scheduler *asynq.Scheduler) error {
	if err := srv.Start(mux); err != nil {
		return fmt.Errorf("failed to start asynq server: %w", err)
	}
	if err := scheduler.Start(); err != nil {
		srv.Shutdown()
		return fmt.Errorf("failed to start asynq scheduler: %w", err)
	}
	log.Info().Msg("worker started")

	<-ctx.Done()

	log.Info().Msg("worker shutting down")
	scheduler.Shutdown()
	srv.Shutdown()
	return nil
}

// asynqLogger meneruskan log internal Asynq ke zerolog global.
type asynqLogger struct{}

func (asynqLogger) Debug(args ...any) { log.Debug().Str("source", "asynq").Msg(fmt.Sprint(args...)) }
func (asynqLogger) Info(args ...any)  { log.Info().Str("source", "asynq").Msg(fmt.Sprint(args...)) }
func (asynqLogger) Warn(args ...any)  { log.Warn().Str("source", "asynq").Msg(fmt.Sprint(args...)) }
func (asynqLogger) Error(args ...any) { log.Error().Str("source", "asynq").Msg(fmt.Sprint(args...)) }
func (asynqLogger) Fatal(args ...any) { log.Fatal().Str("source", "asynq").Msg(fmt.Sprint(args...)) }
