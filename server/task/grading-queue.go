package task

import (
	"context"
	"errors"
	"fmt"

	"github.com/hibiken/asynq"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// GradingQueue mengimplementasikan coreRepo.GradingQueue dengan client Asynq.
type GradingQueue struct {
	client    *asynq.Client
	queueName string
}

// NewGradingQueue membuat antrean task penilaian pada queue cfg.QueueName.
func NewGradingQueue(client *asynq.Client, queueName string) *GradingQueue {
	return &GradingQueue{client: client, queueName: queueName}
}

// EnqueueCriterion mengimplementasikan coreRepo.GradingQueue.
func (q *GradingQueue) EnqueueCriterion(ctx context.Context, runID string, position int) error {
	t, err := NewEvaluateCriterionTask(EvaluateCriterionPayload{RunID: runID, Position: position})
	if err != nil {
		return err
	}
	return q.enqueue(ctx, t, fmt.Sprintf("grading:%s:%d", runID, position))
}

// EnqueueFeedback mengimplementasikan coreRepo.GradingQueue.
func (q *GradingQueue) EnqueueFeedback(ctx context.Context, runID string) error {
	t, err := NewComposeFeedbackTask(ComposeFeedbackPayload{RunID: runID})
	if err != nil {
		return err
	}
	return q.enqueue(ctx, t, fmt.Sprintf("grading:%s:feedback", runID))
}

// enqueue memakai TaskID per langkah, jadi enqueue ganda (mis. dari task periodik) diabaikan.
func (q *GradingQueue) enqueue(ctx context.Context, t *asynq.Task, taskID string) error {
	_, err := q.client.EnqueueContext(ctx, t,
		asynq.Queue(q.queueName),
		asynq.TaskID(taskID),
		asynq.MaxRetry(entity.AIGradingMaxRetry),
	)
	if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to enqueue %s: %w", t.Type(), err)
	}
	return nil
}
