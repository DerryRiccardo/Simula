package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	msgFieldNotFound     = "Bidang tidak ditemukan."
	msgFieldLabelTaken   = "Bidang dengan nama ini sudah ada."
	msgMinOneActiveField = "Minimal satu bidang harus tetap aktif."
)

// FieldUseCase melayani menu Bidang studi panel admin.
type FieldUseCase interface {
	ListFields(ctx context.Context) ([]entity.AdminField, error)
	CreateField(ctx context.Context, in entity.AdminFieldInput) (entity.AdminField, error)
	UpdateField(ctx context.Context, key string, in entity.AdminFieldInput) ([]entity.AdminField, error)
	SetFieldActive(ctx context.Context, key string, isActive bool) ([]entity.AdminField, error)
	MoveField(ctx context.Context, key string, direction int) ([]entity.AdminField, error)
}

// FieldDeps adalah dependency use case Bidang studi admin.
type FieldDeps struct {
	Fields coreRepo.AdminFieldRepository
}

type fieldUseCase struct {
	FieldDeps
}

// InitFieldUseCase membuat use case Bidang studi admin.
func InitFieldUseCase(deps FieldDeps) FieldUseCase {
	return &fieldUseCase{FieldDeps: deps}
}

func (uc *fieldUseCase) ListFields(ctx context.Context) ([]entity.AdminField, error) {
	fields, err := uc.Fields.ListFields(ctx)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return fields, nil
}

func (uc *fieldUseCase) CreateField(
	ctx context.Context, in entity.AdminFieldInput,
) (entity.AdminField, error) {
	label := strings.TrimSpace(in.Label)
	desc := strings.TrimSpace(in.Description)

	if err := uc.validateFieldInput(ctx, label, desc, ""); err != nil {
		return entity.AdminField{}, err
	}

	key, err := uc.uniqueFieldKey(ctx, label)
	if err != nil {
		return entity.AdminField{}, err
	}

	created, err := uc.Fields.CreateField(ctx, key, label, desc)
	if err != nil {
		return entity.AdminField{}, apperror.Internal(err)
	}
	return created, nil
}

func (uc *fieldUseCase) UpdateField(
	ctx context.Context, key string, in entity.AdminFieldInput,
) ([]entity.AdminField, error) {
	key = strings.TrimSpace(key)
	label := strings.TrimSpace(in.Label)
	desc := strings.TrimSpace(in.Description)

	if err := uc.validateFieldInput(ctx, label, desc, key); err != nil {
		return nil, err
	}

	err := uc.Fields.UpdateField(ctx, key, label, desc)
	if errors.Is(err, coreErrors.ErrFieldNotFound) {
		return nil, apperror.NotFound(msgFieldNotFound)
	}
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return uc.ListFields(ctx)
}

func (uc *fieldUseCase) SetFieldActive(
	ctx context.Context, key string, isActive bool,
) ([]entity.AdminField, error) {
	err := uc.Fields.SetFieldActive(ctx, strings.TrimSpace(key), isActive)
	if errors.Is(err, coreErrors.ErrFieldNotFound) {
		return nil, apperror.NotFound(msgFieldNotFound)
	}
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return nil, apperror.Conflict(msgMinOneActiveField)
	}
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return uc.ListFields(ctx)
}

func (uc *fieldUseCase) MoveField(
	ctx context.Context, key string, direction int,
) ([]entity.AdminField, error) {
	if direction != -1 && direction != 1 {
		return nil, apperror.Validation(
			apperror.FieldError{Field: "direction", Message: "Arah pemindahan harus -1 atau 1."},
		)
	}
	err := uc.Fields.MoveField(ctx, strings.TrimSpace(key), direction)
	if errors.Is(err, coreErrors.ErrFieldNotFound) {
		return nil, apperror.NotFound(msgFieldNotFound)
	}
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return uc.ListFields(ctx)
}

func (uc *fieldUseCase) validateFieldInput(
	ctx context.Context, label, desc, exceptKey string,
) error {
	var fields []apperror.FieldError
	switch n := utf8.RuneCountInString(label); {
	case n < entity.FieldLabelMinRunes:
		fields = append(fields, apperror.FieldError{Field: "label", Message: "Tulis minimal 2 karakter."})
	case n > entity.FieldLabelMaxRunes:
		fields = append(fields, apperror.FieldError{Field: "label", Message: "Maksimal 80 karakter."})
	}
	switch n := utf8.RuneCountInString(desc); {
	case n < entity.FieldDescMinRunes:
		fields = append(fields, apperror.FieldError{Field: "description", Message: "Tulis minimal 5 karakter."})
	case n > entity.FieldDescMaxRunes:
		fields = append(fields, apperror.FieldError{Field: "description", Message: "Maksimal 200 karakter."})
	}

	if label != "" {
		taken, err := uc.Fields.LabelTaken(ctx, label, exceptKey)
		if err != nil {
			return apperror.Internal(err)
		}
		if taken {
			fields = append(fields, apperror.FieldError{Field: "label", Message: msgFieldLabelTaken})
		}
	}
	if len(fields) > 0 {
		return apperror.Validation(fields...)
	}
	return nil
}

func (uc *fieldUseCase) uniqueFieldKey(ctx context.Context, label string) (string, error) {
	base := entity.Slugify(label, entity.FieldKeyMaxLength)
	if base == "" {
		base = "bidang"
	}
	key := base
	for n := 2; ; n++ {
		taken, err := uc.Fields.KeyTaken(ctx, key)
		if err != nil {
			return "", apperror.Internal(err)
		}
		if !taken {
			return key, nil
		}
		key = fmt.Sprintf("%s-%d", base, n)
	}
}
