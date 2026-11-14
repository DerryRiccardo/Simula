package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const msgNoSettingsChanged = "Tidak ada nilai yang berubah."

// SettingsUseCase melayani menu Pengaturan panel admin.
type SettingsUseCase interface {
	GetSettings(ctx context.Context) (entity.AdminSettings, error)
	SaveSettings(ctx context.Context, values entity.PlatformSettings) (entity.AdminSettings, error)
}

// SettingsDeps adalah dependency use case Pengaturan admin.
type SettingsDeps struct {
	Settings coreRepo.AdminSettingsRepository
	Now      func() time.Time
}

type settingsUseCase struct {
	SettingsDeps
}

// InitSettingsUseCase membuat use case Pengaturan admin.
func InitSettingsUseCase(deps SettingsDeps) SettingsUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &settingsUseCase{SettingsDeps: deps}
}

func (uc *settingsUseCase) GetSettings(ctx context.Context) (entity.AdminSettings, error) {
	values, err := uc.Settings.GetSettings(ctx)
	if err != nil {
		return entity.AdminSettings{}, apperror.Internal(err)
	}
	logs, err := uc.Settings.ListLogs(ctx, entity.AdminSettingsLogLimit)
	if err != nil {
		return entity.AdminSettings{}, apperror.Internal(err)
	}
	return entity.AdminSettings{
		Values:   values,
		Defaults: entity.DefaultPlatformSettings(),
		Log:      logs,
	}, nil
}

func (uc *settingsUseCase) SaveSettings(
	ctx context.Context, next entity.PlatformSettings,
) (entity.AdminSettings, error) {
	currentUser, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.AdminSettings{}, apperror.Unauthenticated("")
	}

	next.WhatsappNumber = strings.TrimSpace(next.WhatsappNumber)
	if fields := validatePlatformSettings(next); len(fields) > 0 {
		return entity.AdminSettings{}, apperror.Validation(fields...)
	}

	current, err := uc.Settings.GetSettings(ctx)
	if err != nil {
		return entity.AdminSettings{}, apperror.Internal(err)
	}

	changes := entity.DiffPlatformSettings(current, next)
	if len(changes) == 0 {
		return entity.AdminSettings{}, apperror.Conflict(msgNoSettingsChanged)
	}

	now := uc.Now()
	next.ID = true
	next.UpdatedAt = now
	logEntry := &entity.PlatformSettingsLog{
		ID:        uuid.NewString(),
		ActorID:   currentUser.ID,
		Changes:   entity.SettingChangeList(changes),
		CreatedAt: now,
	}
	if err := uc.Settings.SaveSettings(ctx, next, logEntry); err != nil {
		return entity.AdminSettings{}, apperror.Internal(err)
	}
	return uc.GetSettings(ctx)
}

func validatePlatformSettings(s entity.PlatformSettings) []apperror.FieldError {
	type rangeRule struct {
		field string
		value int
		min   int
		max   int
	}
	rules := []rangeRule{
		{"reviewSlaDays", s.ReviewSlaDays, 1, 15},
		{"maxRevisions", s.MaxRevisions, 0, 5},
		{"revisionExtraDays", s.RevisionExtraDays, 1, 14},
		{"recommendationThreshold", s.RecommendationThreshold, 50, 100},
		{"passingScoreAi", s.PassingScoreAI, 1, 100},
		{"passingScoreB2b", s.PassingScoreB2B, 1, 100},
		{"b2bStartWindowDays", s.B2BStartWindowDays, 7, 180},
		{"paymentWindowHours", s.PaymentWindowHours, 1, 72},
	}

	var fields []apperror.FieldError
	for _, r := range rules {
		if r.value < r.min || r.value > r.max {
			fields = append(fields, apperror.FieldError{
				Field:   r.field,
				Message: fmt.Sprintf("Isi bilangan bulat %d sampai %d.", r.min, r.max),
			})
		}
	}
	if !entity.ValidateWhatsappNumber(s.WhatsappNumber) {
		fields = append(fields, apperror.FieldError{
			Field:   "whatsappNumber",
			Message: "Gunakan format 62xxxxxxxxxx tanpa spasi atau tanda +.",
		})
	}
	return fields
}
