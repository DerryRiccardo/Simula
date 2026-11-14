package repository

import (
	"context"

	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// PlatformRepository membaca data master bidang studi aktif dan pengaturan platform untuk alur
// publik, peserta, dan reviewer.
type PlatformRepository interface {
	ListActiveFields(ctx context.Context) ([]entity.Field, error)
	GetSettings(ctx context.Context) (entity.PlatformSettings, error)
}

// LoadSettings membaca pengaturan platform dari r dan jatuh ke nilai bawaan bila r nil atau gagal.
func LoadSettings(ctx context.Context, r PlatformRepository) entity.PlatformSettings {
	if r == nil {
		return entity.DefaultPlatformSettings()
	}
	s, err := r.GetSettings(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("failed to load platform settings, using defaults")
		return entity.DefaultPlatformSettings()
	}
	return s
}
