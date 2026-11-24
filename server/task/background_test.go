package task

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

type stubOrderWorker struct {
	mu      sync.Mutex
	expired []string
}

func (w *stubOrderWorker) Expire(_ context.Context, orderID string) (entity.Order, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.expired = append(w.expired, orderID)
	return entity.Order{ID: orderID}, nil
}

func (w *stubOrderWorker) calls() []string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return append([]string(nil), w.expired...)
}

func TestInProcessOrderQueue_ExpiresOnceAtDueTime(t *testing.T) {
	worker := &stubOrderWorker{}
	q := NewInProcessOrderQueue(worker)
	defer q.Shutdown()

	due := time.Now().Add(30 * time.Millisecond)
	assert.NoError(t, q.ScheduleExpiry(context.Background(), "order-1", due))
	assert.NoError(t, q.ScheduleExpiry(context.Background(), "order-1", due), "duplicate schedule is ignored")

	assert.Eventually(t, func() bool { return len(worker.calls()) == 1 }, time.Second, 5*time.Millisecond)
	time.Sleep(50 * time.Millisecond)
	assert.Equal(t, []string{"order-1"}, worker.calls())
}

func TestInProcessOrderQueue_ShutdownCancelsPendingTimers(t *testing.T) {
	worker := &stubOrderWorker{}
	q := NewInProcessOrderQueue(worker)

	assert.NoError(t, q.ScheduleExpiry(context.Background(), "order-1", time.Now().Add(50*time.Millisecond)))
	q.Shutdown()
	time.Sleep(100 * time.Millisecond)

	assert.Empty(t, worker.calls())
}

func TestBackgroundRunner_RunsJobPeriodicallyUntilShutdown(t *testing.T) {
	var runs atomic.Int32
	runner := NewBackgroundRunner()
	runner.Start(BackgroundJob{
		Name: "test", Interval: 10 * time.Millisecond,
		Run: func(context.Context) error { runs.Add(1); return nil },
	})

	assert.Eventually(t, func() bool { return runs.Load() >= 3 }, time.Second, 5*time.Millisecond)
	runner.Shutdown()
	after := runs.Load()
	time.Sleep(30 * time.Millisecond)
	assert.Equal(t, after, runs.Load(), "no runs after shutdown")
}
