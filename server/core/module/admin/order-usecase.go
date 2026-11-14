package admin

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

// OrderUseCase melayani menu Order panel admin.
type OrderUseCase interface {
	ListOrders(ctx context.Context) ([]entity.AdminOrder, error)
}

// OrderDeps adalah dependency use case Order admin.
type OrderDeps struct {
	Orders coreRepo.AdminOrderRepository
	Now    func() time.Time
}

type orderUseCase struct {
	OrderDeps
}

// InitOrderUseCase membuat use case Order admin.
func InitOrderUseCase(deps OrderDeps) OrderUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &orderUseCase{OrderDeps: deps}
}

func (uc *orderUseCase) ListOrders(ctx context.Context) ([]entity.AdminOrder, error) {
	orders, err := uc.Orders.ListOrders(ctx, entity.AdminOrderListLimit)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	now := uc.Now()
	for i := range orders {
		orders[i].Order.Status = orders[i].EffectiveStatus(now)
	}
	return orders, nil
}
