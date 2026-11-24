package task

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

type stubGradingWorker struct {
	mu           sync.Mutex
	evalCalls    int
	feedbackCall int
	failedRuns   []string
	resumedCalls atomic.Int32
	evalErr      error
	evalBlockCh  chan struct{}
}

func (w *stubGradingWorker) EvaluateCriterion(_ context.Context, _ string, _ int) error {
	if w.evalBlockCh != nil {
		<-w.evalBlockCh
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evalCalls++
	return w.evalErr
}

func (w *stubGradingWorker) ComposeFeedback(_ context.Context, _ string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.feedbackCall++
	return nil
}

func (w *stubGradingWorker) FailRun(_ context.Context, runID string, _ error) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.failedRuns = append(w.failedRuns, runID)
	return nil
}

func (w *stubGradingWorker) ResumeStalled(_ context.Context) (int, error) {
	w.resumedCalls.Add(1)
	return 0, nil
}

func TestInProcessGradingQueue_DeduplicatesInflight(t *testing.T) {
	gate := make(chan struct{})
	worker := &stubGradingWorker{evalBlockCh: gate}
	q := NewInProcessGradingQueue(1, time.Second)
	q.resumeInterval = time.Hour
	q.Start(worker)
	defer q.Shutdown()

	require.NoError(t, q.EnqueueCriterion(context.Background(), "run-1", 1))
	require.NoError(t, q.EnqueueCriterion(context.Background(), "run-1", 1))
	require.NoError(t, q.EnqueueFeedback(context.Background(), "run-1"))
	require.NoError(t, q.EnqueueFeedback(context.Background(), "run-1"))

	close(gate)

	assert.Eventually(t, func() bool {
		worker.mu.Lock()
		defer worker.mu.Unlock()
		return worker.evalCalls == 1 && worker.feedbackCall == 1
	}, 2*time.Second, 10*time.Millisecond)
	assert.GreaterOrEqual(t, worker.resumedCalls.Load(), int32(1))
}

func TestInProcessGradingQueue_RetriesAndFailsOnExhaustion(t *testing.T) {
	worker := &stubGradingWorker{evalErr: errors.New("llm down")}
	q := NewInProcessGradingQueue(1, time.Second)
	q.resumeInterval = time.Hour
	q.retryBaseDelay = time.Millisecond
	q.Start(worker)
	defer q.Shutdown()

	require.NoError(t, q.EnqueueCriterion(context.Background(), "run-fail", 1))

	assert.Eventually(t, func() bool {
		worker.mu.Lock()
		defer worker.mu.Unlock()
		return worker.evalCalls == entity.AIGradingMaxRetry+1 && len(worker.failedRuns) == 1
	}, 2*time.Second, 10*time.Millisecond)

	worker.mu.Lock()
	assert.Equal(t, []string{"run-fail"}, worker.failedRuns)
	worker.mu.Unlock()
}

func TestInProcessGradingQueue_ShutdownReturnsPromptlyWhenIdle(t *testing.T) {
	q := NewInProcessGradingQueue(3, 30*time.Second)
	q.resumeInterval = time.Hour
	q.Start(&stubGradingWorker{})

	start := time.Now()
	q.Shutdown()

	assert.Less(t, time.Since(start), time.Second, "idle workers must not wait for the shutdown timeout")
	assert.Error(t, q.EnqueueCriterion(context.Background(), "run-late", 1))
}

func TestInProcessGradingQueue_ShutdownWaitsForRunningJob(t *testing.T) {
	gate := make(chan struct{})
	worker := &stubGradingWorker{evalBlockCh: gate}
	q := NewInProcessGradingQueue(1, 5*time.Second)
	q.resumeInterval = time.Hour
	q.Start(worker)
	require.NoError(t, q.EnqueueCriterion(context.Background(), "run-1", 1))

	assert.Eventually(t, func() bool {
		q.mu.Lock()
		defer q.mu.Unlock()
		return len(q.queue) == 0
	}, time.Second, 5*time.Millisecond)
	go func() {
		time.Sleep(50 * time.Millisecond)
		close(gate)
	}()
	q.Shutdown()

	worker.mu.Lock()
	defer worker.mu.Unlock()
	assert.Equal(t, 1, worker.evalCalls, "the running job finishes before shutdown returns")
}
