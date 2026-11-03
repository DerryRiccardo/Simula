package task

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// TypeOrderExpire mengedaluwarsakan order yang belum dibayar sampai batas waktunya.
const TypeOrderExpire = "order:expire"

// orderExpireMaxRetry: kegagalan database diulang beberapa kali; halaman checkout tetap menjadi
// cadangan karena order yang lewat batas dikedaluwarsakan saat dibaca.
const orderExpireMaxRetry = 5

// OrderExpirePayload menunjuk order yang dijadwalkan kedaluwarsa.
type OrderExpirePayload struct {
	OrderID string `json:"orderId"`
}

// OrderWorker adalah bagian shared.PaymentService yang dipakai task order.
type OrderWorker interface {
	Expire(ctx context.Context, orderID string) (entity.Order, error)
}

// OrderExpireHandler menjalankan task order:expire. Order yang sudah lunas atau final diabaikan.
type OrderExpireHandler struct {
	worker OrderWorker
}

// NewOrderExpireHandler membuat handler task.
func NewOrderExpireHandler(worker OrderWorker) *OrderExpireHandler {
	return &OrderExpireHandler{worker: worker}
}

// ProcessTask mengimplementasikan asynq.Handler.
func (h *OrderExpireHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload OrderExpirePayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		log.Warn().Err(err).Msg("invalid order expire payload")
		return nil
	}
	_, err := h.worker.Expire(ctx, payload.OrderID)
	return err
}

// OrderQueue mengimplementasikan coreRepo.OrderQueue dengan client Asynq.
type OrderQueue struct {
	client    *asynq.Client
	queueName string
}

// NewOrderQueue membuat antrean task order pada queue cfg.QueueName.
func NewOrderQueue(client *asynq.Client, queueName string) *OrderQueue {
	return &OrderQueue{client: client, queueName: queueName}
}

// ScheduleExpiry mengimplementasikan coreRepo.OrderQueue. TaskID per order membuat jadwal ganda
// diabaikan.
func (q *OrderQueue) ScheduleExpiry(ctx context.Context, orderID string, at time.Time) error {
	data, err := json.Marshal(OrderExpirePayload{OrderID: orderID})
	if err != nil {
		return fmt.Errorf("failed to encode order expire payload: %w", err)
	}
	_, err = q.client.EnqueueContext(ctx, asynq.NewTask(TypeOrderExpire, data),
		asynq.Queue(q.queueName),
		asynq.TaskID("order:expire:"+orderID),
		asynq.ProcessAt(at),
		asynq.MaxRetry(orderExpireMaxRetry),
	)
	if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to schedule %s: %w", TypeOrderExpire, err)
	}
	return nil
}
