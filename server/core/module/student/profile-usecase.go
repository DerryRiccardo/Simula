package student

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

// ProfileDetailsInput adalah isian form data diri + bidang di halaman Profil mahasiswa.
type ProfileDetailsInput struct {
	Name          string
	Institution   *string
	Major         *string
	StudentStatus string
	LinkedinURL   *string
	FieldKeys     []string
}

// ProfileUseCase melayani halaman Profil mahasiswa.
type ProfileUseCase interface {
	GetProfile(ctx context.Context) (entity.StudentProfile, error)
	UpdateDetails(ctx context.Context, in ProfileDetailsInput) (entity.StudentProfile, error)
	UpdateShareDefault(ctx context.Context, shareDefault string) (entity.StudentProfile, error)
}

// ProfileDeps adalah dependency use case Profil mahasiswa.
type ProfileDeps struct {
	Profiles coreRepo.ProfileRepository
	Fields   coreRepo.FieldRepository
	Now      func() time.Time
}

type profileUseCase struct {
	ProfileDeps
}

// InitProfileUseCase membuat use case halaman Profil mahasiswa.
func InitProfileUseCase(deps ProfileDeps) ProfileUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &profileUseCase{ProfileDeps: deps}
}

func (uc *profileUseCase) GetProfile(ctx context.Context) (entity.StudentProfile, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}
	return uc.loadProfile(ctx, current.ID)
}

func (uc *profileUseCase) UpdateDetails(
	ctx context.Context, in ProfileDetailsInput,
) (entity.StudentProfile, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}

	name := strings.TrimSpace(in.Name)
	institution := trimmedOrNil(in.Institution)
	major := trimmedOrNil(in.Major)
	status := entity.StudentStatus(strings.TrimSpace(in.StudentStatus))
	linkedinURL := trimmedOrNil(in.LinkedinURL)
	fieldKeys := uniqueTrimmed(in.FieldKeys)

	var fields []apperror.FieldError
	if msg := entity.ValidateName(name); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "name", Message: msg})
	}
	if institution != nil && utf8.RuneCountInString(*institution) > entity.InstitutionMaxLength {
		fields = append(fields, apperror.FieldError{Field: "institution", Message: "Maksimal 100 karakter"})
	}
	if major != nil && utf8.RuneCountInString(*major) > entity.MajorMaxLength {
		fields = append(fields, apperror.FieldError{Field: "major", Message: "Maksimal 100 karakter"})
	}
	if !status.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "studentStatus", Message: "Pilih status kamu saat ini"})
	}
	if linkedinURL != nil {
		if msg := entity.ValidateLinkedinURL(*linkedinURL); msg != "" {
			fields = append(fields, apperror.FieldError{Field: "linkedinUrl", Message: msg})
		}
	}
	if len(fieldKeys) == 0 || len(fieldKeys) > entity.MaxOnboardingFields {
		fields = append(fields, apperror.FieldError{Field: "fieldKeys", Message: "Pilih 1 sampai 3 bidang."})
	}
	if len(fields) > 0 {
		return entity.StudentProfile{}, apperror.Validation(fields...)
	}

	existing, err := uc.Fields.ExistingKeys(ctx, fieldKeys)
	if err != nil {
		return entity.StudentProfile{}, apperror.Internal(err)
	}
	if len(existing) != len(fieldKeys) {
		return entity.StudentProfile{}, apperror.Validation(
			apperror.FieldError{Field: "fieldKeys", Message: "Ada bidang yang tidak dikenal."},
		)
	}

	err = uc.Profiles.UpdateDetails(ctx, current.ID, entity.ProfileDetailsUpdate{
		Name:          name,
		Institution:   institution,
		Major:         major,
		StudentStatus: status,
		LinkedinURL:   linkedinURL,
		FieldKeys:     fieldKeys,
	}, uc.Now())
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.StudentProfile{}, apperror.Internal(fmt.Errorf("failed to update profile details: %w", err))
	}
	return uc.loadProfile(ctx, current.ID)
}

func (uc *profileUseCase) UpdateShareDefault(
	ctx context.Context, raw string,
) (entity.StudentProfile, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}

	shareDefault := entity.ShareDefault(strings.TrimSpace(raw))
	if !shareDefault.IsValid() {
		return entity.StudentProfile{}, apperror.Validation(
			apperror.FieldError{Field: "shareDefault", Message: "Pilihan berbagi data tidak valid."},
		)
	}

	err := uc.Profiles.UpdateShareDefault(ctx, current.ID, shareDefault, uc.Now())
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.StudentProfile{}, apperror.Internal(fmt.Errorf("failed to update share default: %w", err))
	}
	return uc.loadProfile(ctx, current.ID)
}

func (uc *profileUseCase) loadProfile(ctx context.Context, userID string) (entity.StudentProfile, error) {
	profile, err := uc.Profiles.GetProfile(ctx, userID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.StudentProfile{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.StudentProfile{}, apperror.Internal(err)
	}
	if !profile.User.ShareDefault.IsValid() {
		profile.User.ShareDefault = entity.ShareDefaultAsk
	}
	return profile, nil
}

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
