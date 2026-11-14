package db

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type adminFieldRepo struct {
	db *gorm.DB
}

// InitAdminFieldRepo membuat repository menu Bidang studi panel admin.
func InitAdminFieldRepo(db *gorm.DB) coreRepo.AdminFieldRepository {
	return &adminFieldRepo{db: db}
}

type fieldCountRow struct {
	FieldKey string
	Count    int
}

func (r *adminFieldRepo) ListFields(ctx context.Context) ([]entity.AdminField, error) {
	db := r.db.WithContext(ctx)

	var fields []entity.Field
	if err := db.Order("sort_order ASC").Find(&fields).Error; err != nil {
		return nil, fmt.Errorf("failed to list admin fields: %w", err)
	}
	if len(fields) == 0 {
		return []entity.AdminField{}, nil
	}

	var caseRows []fieldCountRow
	err := db.Model(&entity.Case{}).
		Select("field_key, COUNT(*) AS count").
		Group("field_key").
		Scan(&caseRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count cases per field: %w", err)
	}

	var memberRows []fieldCountRow
	err = db.Table("user_fields AS uf").
		Select("uf.field_key, COUNT(*) AS count").
		Joins("JOIN users u ON u.id = uf.user_id").
		Where("u.role = ?", entity.RoleStudent).
		Group("uf.field_key").
		Scan(&memberRows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count members per field: %w", err)
	}

	casesByKey := make(map[string]int, len(caseRows))
	for _, row := range caseRows {
		casesByKey[row.FieldKey] = row.Count
	}
	membersByKey := make(map[string]int, len(memberRows))
	for _, row := range memberRows {
		membersByKey[row.FieldKey] = row.Count
	}

	result := make([]entity.AdminField, 0, len(fields))
	for _, field := range fields {
		result = append(result, entity.AdminField{
			Field:       field,
			CaseCount:   casesByKey[field.Key],
			MemberCount: membersByKey[field.Key],
		})
	}
	return result, nil
}

func (r *adminFieldRepo) GetField(ctx context.Context, key string) (entity.Field, error) {
	var field entity.Field
	err := r.db.WithContext(ctx).Where("key = ?", key).Take(&field).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Field{}, coreErrors.ErrFieldNotFound
	}
	if err != nil {
		return entity.Field{}, fmt.Errorf("failed to get field %s: %w", key, err)
	}
	return field, nil
}

func (r *adminFieldRepo) KeyTaken(ctx context.Context, key string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&entity.Field{}).Where("key = ?", key).Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check field key %s: %w", key, err)
	}
	return count > 0, nil
}

func (r *adminFieldRepo) LabelTaken(ctx context.Context, label, exceptKey string) (bool, error) {
	query := r.db.WithContext(ctx).Model(&entity.Field{}).Where("LOWER(label) = LOWER(?)", label)
	if exceptKey != "" {
		query = query.Where("key <> ?", exceptKey)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check field label %s: %w", label, err)
	}
	return count > 0, nil
}

func (r *adminFieldRepo) CreateField(
	ctx context.Context, key, label, description string,
) (entity.AdminField, error) {
	var created entity.Field
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var maxOrder int16
		err := tx.Model(&entity.Field{}).
			Select("COALESCE(MAX(sort_order), 0)").
			Scan(&maxOrder).Error
		if err != nil {
			return fmt.Errorf("failed to get max field sort order: %w", err)
		}
		created = entity.Field{
			Key:         key,
			Label:       label,
			Description: description,
			IsActive:    true,
			SortOrder:   maxOrder + 1,
		}
		if err := tx.Create(&created).Error; err != nil {
			return fmt.Errorf("failed to create field %s: %w", key, err)
		}
		return nil
	})
	if err != nil {
		return entity.AdminField{}, err
	}
	return entity.AdminField{Field: created}, nil
}

func (r *adminFieldRepo) UpdateField(
	ctx context.Context, key, label, description string,
) error {
	result := r.db.WithContext(ctx).
		Model(&entity.Field{}).
		Where("key = ?", key).
		Updates(map[string]any{
			"label":       label,
			"description": description,
		})
	if result.Error != nil {
		return fmt.Errorf("failed to update field %s: %w", key, result.Error)
	}
	if result.RowsAffected == 0 {
		return coreErrors.ErrFieldNotFound
	}
	return nil
}

func (r *adminFieldRepo) SetFieldActive(ctx context.Context, key string, isActive bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var field entity.Field
		err := tx.Where("key = ?", key).Take(&field).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return coreErrors.ErrFieldNotFound
		}
		if err != nil {
			return fmt.Errorf("failed to load field %s: %w", key, err)
		}
		if !isActive && field.IsActive {
			var activeCount int64
			err := tx.Model(&entity.Field{}).Where("is_active = ?", true).Count(&activeCount).Error
			if err != nil {
				return fmt.Errorf("failed to count active fields: %w", err)
			}
			if activeCount <= 1 {
				return coreErrors.ErrStatusConflict
			}
		}
		err = tx.Model(&entity.Field{}).
			Where("key = ?", key).
			UpdateColumn("is_active", isActive).Error
		if err != nil {
			return fmt.Errorf("failed to update field status %s: %w", key, err)
		}
		return nil
	})
}

func (r *adminFieldRepo) MoveField(ctx context.Context, key string, direction int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var fields []entity.Field
		if err := tx.Order("sort_order ASC").Find(&fields).Error; err != nil {
			return fmt.Errorf("failed to list fields for reorder: %w", err)
		}

		index := -1
		for i, item := range fields {
			if item.Key == key {
				index = i
				break
			}
		}
		if index == -1 {
			return coreErrors.ErrFieldNotFound
		}

		target := index + direction
		if target < 0 || target >= len(fields) {
			return nil
		}

		a := fields[index]
		b := fields[target]
		// sort_order memiliki constraint UNIQUE; nilai sementara -1 dipakai saat menukar dua baris.
		if err := tx.Model(&entity.Field{}).Where("key = ?", a.Key).UpdateColumn("sort_order", int16(-1)).Error; err != nil {
			return fmt.Errorf("failed to set temp sort_order on %s: %w", a.Key, err)
		}
		if err := tx.Model(&entity.Field{}).Where("key = ?", b.Key).UpdateColumn("sort_order", a.SortOrder).Error; err != nil {
			return fmt.Errorf("failed to swap sort_order on %s: %w", b.Key, err)
		}
		if err := tx.Model(&entity.Field{}).Where("key = ?", a.Key).UpdateColumn("sort_order", b.SortOrder).Error; err != nil {
			return fmt.Errorf("failed to finalize sort_order on %s: %w", a.Key, err)
		}
		return nil
	})
}
