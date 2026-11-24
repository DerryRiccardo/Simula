package task

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Job latar belakang yang berjalan di dalam proses server (APP_MODE=server/all), tanpa worker
// Asynq. Semua job idempoten, jadi aman bila beberapa replika server menjalankannya bersamaan.
const (
	// OrderExpirySweepInterval adalah jeda pengecekan order yang lewat batas bayar. Menjadi cadangan
	// untuk timer per order yang hilang saat server restart.
	OrderExpirySweepInterval = time.Minute
	// OrderExpirySweepBatch adalah jumlah order maksimal yang dikedaluwarsakan per pengecekan.
	OrderExpirySweepBatch = 200
	// PendingFilesCleanupInterval sama dengan jadwal Asynq lama (setiap jam).
	PendingFilesCleanupInterval = time.Hour
	// ExpiredSessionsCleanupInterval sama dengan jadwal Asynq lama (setiap hari).
	ExpiredSessionsCleanupInterval = 24 * time.Hour

	backgroundJobTimeout = 2 * time.Minute
	orderExpiryTimeout   = 30 * time.Second
)

// BackgroundJob adalah pekerjaan berkala. Run pertama dijalankan setelah InitialDelay.
type BackgroundJob struct {
	Name         string
	Interval     time.Duration
	InitialDelay time.Duration
	Run          func(ctx context.Context) error
}

// BackgroundRunner menjalankan BackgroundJob dengan ticker di goroutine masing-masing.
type BackgroundRunner struct {
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	once   sync.Once
}

// NewBackgroundRunner membuat runner yang belum berjalan.
func NewBackgroundRunner() *BackgroundRunner {
	ctx, cancel := context.WithCancel(context.Background())
	return &BackgroundRunner{ctx: ctx, cancel: cancel}
}

// Start menjalankan setiap job sampai Shutdown dipanggil.
func (r *BackgroundRunner) Start(jobs ...BackgroundJob) {
	for _, job := range jobs {
		r.wg.Add(1)
		go r.loop(job)
	}
}

// Shutdown menghentikan semua job dan menunggu job yang sedang berjalan selesai.
func (r *BackgroundRunner) Shutdown() {
	r.once.Do(func() {
		r.cancel()
		r.wg.Wait()
	})
}

func (r *BackgroundRunner) loop(job BackgroundJob) {
	defer r.wg.Done()

	timer := time.NewTimer(job.InitialDelay)
	defer timer.Stop()
	for {
		select {
		case <-r.ctx.Done():
			return
		case <-timer.C:
		}
		r.runOnce(job)
		timer.Reset(job.Interval)
	}
}

func (r *BackgroundRunner) runOnce(job BackgroundJob) {
	ctx, cancel := context.WithTimeout(r.ctx, backgroundJobTimeout)
	defer cancel()
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Error().Interface("panic", recovered).Str("job", job.Name).Msg("background job panicked")
		}
	}()
	if err := job.Run(ctx); err != nil && r.ctx.Err() == nil {
		log.Warn().Err(err).Str("job", job.Name).Msg("background job failed")
	}
}

// InProcessOrderQueue mengimplementasikan coreRepo.OrderQueue dengan timer di memori: order
// dikedaluwarsakan tepat pada batas bayarnya. Timer hilang saat server restart, jadi pengecekan
// berkala (OrderExpirySweepInterval) tetap dibutuhkan sebagai cadangan.
type InProcessOrderQueue struct {
	worker OrderWorker

	mu     sync.Mutex
	timers map[string]*time.Timer
	closed bool
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewInProcessOrderQueue membuat antrean kedaluwarsa order untuk worker (shared.PaymentService).
func NewInProcessOrderQueue(worker OrderWorker) *InProcessOrderQueue {
	ctx, cancel := context.WithCancel(context.Background())
	return &InProcessOrderQueue{worker: worker, timers: make(map[string]*time.Timer), ctx: ctx, cancel: cancel}
}

// ScheduleExpiry mengimplementasikan coreRepo.OrderQueue. Jadwal ganda untuk order yang sama
// diabaikan.
func (q *InProcessOrderQueue) ScheduleExpiry(_ context.Context, orderID string, at time.Time) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.closed {
		return nil
	}
	if _, exists := q.timers[orderID]; exists {
		return nil
	}
	q.timers[orderID] = time.AfterFunc(time.Until(at), func() { q.expire(orderID) })
	return nil
}

func (q *InProcessOrderQueue) expire(orderID string) {
	q.mu.Lock()
	delete(q.timers, orderID)
	if q.closed {
		q.mu.Unlock()
		return
	}
	q.wg.Add(1)
	q.mu.Unlock()
	defer q.wg.Done()

	ctx, cancel := context.WithTimeout(q.ctx, orderExpiryTimeout)
	defer cancel()
	if _, err := q.worker.Expire(ctx, orderID); err != nil && q.ctx.Err() == nil {
		// Pengecekan berkala akan mencoba lagi.
		log.Warn().Err(err).Str("order_id", orderID).Msg("failed to expire order")
	}
}

// Shutdown membatalkan timer yang belum jatuh tempo dan menunggu proses kedaluwarsa yang sedang
// berjalan selesai.
func (q *InProcessOrderQueue) Shutdown() {
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return
	}
	q.closed = true
	for id, timer := range q.timers {
		timer.Stop()
		delete(q.timers, id)
	}
	q.mu.Unlock()
	q.cancel()
	q.wg.Wait()
}
