package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

// OnboardingInput adalah isian langkah onboarding mahasiswa baru.
type OnboardingInput struct {
	FieldKeys     []string
	StudentStatus string
	Major         *string
}

func (uc *authUseCase) CompleteOnboarding(ctx context.Context, in OnboardingInput) (entity.User, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.User{}, apperror.Unauthenticated("")
	}

	fieldKeys := uniqueTrimmed(in.FieldKeys)
	status := entity.StudentStatus(in.StudentStatus)
	major := trimmedOrNil(in.Major)

	var fields []apperror.FieldError
	if len(fieldKeys) == 0 || len(fieldKeys) > entity.MaxOnboardingFields {
		fields = append(fields, apperror.FieldError{Field: "fieldKeys", Message: "Pilih 1 sampai 3 bidang."})
	}
	if !status.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "studentStatus", Message: "Pilih status kamu saat ini"})
	}
	if major != nil && utf8.RuneCountInString(*major) > entity.MajorMaxLength {
		fields = append(fields, apperror.FieldError{Field: "major", Message: "Maksimal 100 karakter"})
	}
	if len(fields) > 0 {
		return entity.User{}, apperror.Validation(fields...)
	}

	existing, err := uc.Fields.ExistingKeys(ctx, fieldKeys)
	if err != nil {
		return entity.User{}, apperror.Internal(err)
	}
	if len(existing) != len(fieldKeys) {
		return entity.User{}, apperror.Validation(apperror.FieldError{Field: "fieldKeys", Message: "Ada bidang yang tidak dikenal."})
	}

	err = uc.Users.CompleteOnboarding(ctx, current.ID, fieldKeys, status, major)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.User{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to complete onboarding: %w", err))
	}
	return uc.Me(ctx)
}

// uniqueTrimmed membuang spasi, nilai kosong, dan duplikat dengan tetap menjaga urutan pilihan.
func uniqueTrimmed(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func trimmedOrNil(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
