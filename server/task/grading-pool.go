package task

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

const (
	defaultGradingConcurrency = 3
	defaultResumeInterval     = 5 * time.Minute
	defaultRetryBaseDelay     = 2 * time.Second
)

type gradingJobKind uint8

const (
	gradingJobCriterion gradingJobKind = iota + 1
	gradingJobFeedback
)

type gradingJob struct {
	taskID   string
	kind     gradingJobKind
	runID    string
	position int
}

// InProcessGradingQueue mengimplementasikan coreRepo.GradingQueue memakai goroutine worker pool
// di dalam proses server tanpa polling Redis.
type InProcessGradingQueue struct {
	concurrency     int
	shutdownTimeout time.Duration
	resumeInterval  time.Duration
	retryBaseDelay  time.Duration

	worker GradingWorker

	mu       sync.Mutex
	queue    []gradingJob
	inflight map[string]struct{}
	closed   bool
	notify   chan struct{}
	// stopped ditutup saat Shutdown agar semua worker dan loop resume langsung bangun.
	stopped chan struct{}

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewInProcessGradingQueue membuat worker pool goroutine untuk penilaian AI.
func NewInProcessGradingQueue(concurrency int, shutdownTimeout time.Duration) *InProcessGradingQueue {
	if concurrency <= 0 {
		concurrency = defaultGradingConcurrency
	}
	if shutdownTimeout <= 0 {
		shutdownTimeout = 30 * time.Second
	}
	return &InProcessGradingQueue{
		concurrency:     concurrency,
		shutdownTimeout: shutdownTimeout,
		resumeInterval:  defaultResumeInterval,
		retryBaseDelay:  defaultRetryBaseDelay,
		inflight:        make(map[string]struct{}),
		notify:          make(chan struct{}, 1),
		stopped:         make(chan struct{}),
	}
}

// Start menjalankan worker goroutine dan pemulihan run yang macet di latar belakang.
func (q *InProcessGradingQueue) Start(worker GradingWorker) {
	q.mu.Lock()
	if q.ctx != nil {
		q.mu.Unlock()
		return
	}
	q.worker = worker
	q.ctx, q.cancel = context.WithCancel(context.Background())
	q.mu.Unlock()

	for range q.concurrency {
		q.wg.Add(1)
		go q.runWorker()
	}

	q.wg.Add(1)
	go q.runResumeLoop()
}

// EnqueueCriterion mengimplementasikan coreRepo.GradingQueue.
func (q *InProcessGradingQueue) EnqueueCriterion(_ context.Context, runID string, position int) error {
	return q.enqueue(gradingJob{
		taskID:   fmt.Sprintf("grading:%s:%d", runID, position),
		kind:     gradingJobCriterion,
		runID:    runID,
		position: position,
	})
}

// EnqueueFeedback mengimplementasikan coreRepo.GradingQueue.
func (q *InProcessGradingQueue) EnqueueFeedback(_ context.Context, runID string) error {
	return q.enqueue(gradingJob{
		taskID: fmt.Sprintf("grading:%s:feedback", runID),
		kind:   gradingJobFeedback,
		runID:  runID,
	})
}

func (q *InProcessGradingQueue) enqueue(job gradingJob) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	if q.closed {
		return errors.New("grading queue is closed")
	}
	if _, exists := q.inflight[job.taskID]; exists {
		return nil
	}
	q.inflight[job.taskID] = struct{}{}
	q.queue = append(q.queue, job)

	select {
	case q.notify <- struct{}{}:
	default:
	}
	return nil
}

// Shutdown menghentikan penerimaan job baru, membiarkan job yang sedang berjalan selesai, lalu
// menunggu worker berhenti paling lama shutdownTimeout. Job yang masih mengantre tidak dijalankan;
// run-nya dilanjutkan ResumeStalled saat server menyala lagi.
func (q *InProcessGradingQueue) Shutdown() {
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return
	}
	q.closed = true
	cancel := q.cancel
	q.mu.Unlock()

	close(q.stopped)
	if cancel == nil {
		return
	}

	done := make(chan struct{})
	go func() {
		q.wg.Wait()
		close(done)
	}()

	timer := time.NewTimer(q.shutdownTimeout)
	defer timer.Stop()
	select {
	case <-done:
	case <-timer.C:
		log.Warn().Dur("timeout", q.shutdownTimeout).Msg("grading queue shutdown timed out; cancelling running jobs")
	}
	cancel()
	<-done
}

func (q *InProcessGradingQueue) runWorker() {
	defer q.wg.Done()

	for {
		job, ok := q.nextJob()
		if !ok {
			select {
			case <-q.notify:
				continue
			case <-q.stopped:
				return
			case <-q.ctx.Done():
				return
			}
		}
		q.executeWithRetry(job)
	}
}

func (q *InProcessGradingQueue) nextJob() (gradingJob, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if q.closed || len(q.queue) == 0 {
		return gradingJob{}, false
	}
	job := q.queue[0]
	q.queue[0] = gradingJob{}
	q.queue = q.queue[1:]
	return job, true
}

func (q *InProcessGradingQueue) finishJob(taskID string) {
	q.mu.Lock()
	delete(q.inflight, taskID)
	q.mu.Unlock()
}

func (q *InProcessGradingQueue) executeWithRetry(job gradingJob) {
	defer q.finishJob(job.taskID)

	var lastErr error
	for attempt := 0; attempt <= entity.AIGradingMaxRetry; attempt++ {
		if attempt > 0 {
			delay := q.retryBaseDelay * time.Duration(1<<uint(attempt-1))
			timer := time.NewTimer(delay)
			select {
			case <-timer.C:
			case <-q.stopped:
				timer.Stop()
				return
			case <-q.ctx.Done():
				timer.Stop()
				return
			}
		}

		if err := q.runOnce(q.ctx, job); err == nil {
			return
		} else {
			lastErr = err
			if q.ctx.Err() != nil {
				return
			}
			log.Warn().
				Err(err).
				Str("run_id", job.runID).
				Int("attempt", attempt+1).
				Msg("grading task attempt failed")
		}
	}

	if lastErr != nil {
		if failErr := q.worker.FailRun(q.ctx, job.runID, lastErr); failErr != nil {
			log.Error().Err(errors.Join(lastErr, failErr)).Str("run_id", job.runID).Msg("failed to mark grading run failed")
			return
		}
		log.Error().Err(lastErr).Str("run_id", job.runID).Msg("grading run failed permanently")
	}
}

func (q *InProcessGradingQueue) runOnce(ctx context.Context, job gradingJob) error {
	switch job.kind {
	case gradingJobCriterion:
		return q.worker.EvaluateCriterion(ctx, job.runID, job.position)
	case gradingJobFeedback:
		return q.worker.ComposeFeedback(ctx, job.runID)
	default:
		return fmt.Errorf("unknown grading job kind %d", job.kind)
	}
}

func (q *InProcessGradingQueue) runResumeLoop() {
	defer q.wg.Done()

	q.resumeOnce()

	ticker := time.NewTicker(q.resumeInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			q.resumeOnce()
		case <-q.stopped:
			return
		case <-q.ctx.Done():
			return
		}
	}
}

func (q *InProcessGradingQueue) resumeOnce() {
	q.mu.Lock()
	closed := q.closed
	q.mu.Unlock()
	if closed {
		return
	}

	resumed, err := q.worker.ResumeStalled(q.ctx)
	if err != nil && !errors.Is(err, context.Canceled) {
		log.Warn().Err(err).Msg("failed to resume stalled grading runs")
		return
	}
	if resumed > 0 {
		log.Info().Int("resumed", resumed).Msg("resumed stalled grading runs")
	}
}
