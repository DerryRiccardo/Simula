package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type adminOrderRepo struct {
	db *gorm.DB
}

// InitAdminOrderRepo membuat repository menu Order panel admin.
func InitAdminOrderRepo(db *gorm.DB) coreRepo.AdminOrderRepository {
	return &adminOrderRepo{db: db}
}

func (r *adminOrderRepo) ListOrders(ctx context.Context, limit int) ([]entity.AdminOrder, error) {
	return listAdminOrders(r.db.WithContext(ctx), nil, limit)
}

func listAdminOrders(db *gorm.DB, userID *string, limit int) ([]entity.AdminOrder, error) {
	var rows []struct {
		entity.Order
		MemberName  string
		MemberEmail string
		CaseTitle   string
		PartnerName *string
	}
	q := db.Table("orders AS o").
		Select("o.*, u.name AS member_name, u.email AS member_email, c.title AS case_title, p.name AS partner_name").
		Joins("JOIN users u ON u.id = o.user_id").
		Joins("JOIN cases c ON c.id = o.case_id").
		Joins("LEFT JOIN partners p ON p.id = c.partner_id")
	if userID != nil {
		q = q.Where("o.user_id = ?", *userID)
	}
	if err := q.Order("o.created_at DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to list admin orders: %w", err)
	}

	orders := make([]entity.AdminOrder, 0, len(rows))
	for _, row := range rows {
		orders = append(orders, entity.AdminOrder{
			Order:       row.Order,
			MemberName:  row.MemberName,
			MemberEmail: row.MemberEmail,
			CaseTitle:   row.CaseTitle,
			PartnerName: row.PartnerName,
		})
	}
	return orders, nil
}
