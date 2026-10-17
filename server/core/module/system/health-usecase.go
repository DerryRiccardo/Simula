// Package system berisi use case operasional service (health check), terpisah dari use case
// per peran pengguna.
package system

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// Status satu dependency pada pemeriksaan readiness.
const (
	CheckStatusUp   = "up"
	CheckStatusDown = "down"
)

// Check adalah hasil pemeriksaan satu dependency.
type Check struct {
	Name   string
	Status string
}

// Readiness adalah hasil pemeriksaan semua dependency.
type Readiness struct {
	IsReady bool
	Checks  []Check
}

// HealthUseCase memeriksa kesiapan service untuk menerima traffic.
type HealthUseCase interface {
	Readiness(ctx context.Context) Readiness
}

type healthUseCase struct {
	probes  []coreRepo.HealthProbe
	timeout time.Duration
}

// InitHealthUseCase membuat use case health check. timeout berlaku untuk setiap probe.
func InitHealthUseCase(timeout time.Duration, probes ...coreRepo.HealthProbe) HealthUseCase {
	return &healthUseCase{probes: probes, timeout: timeout}
}

func (uc *healthUseCase) Readiness(ctx context.Context) Readiness {
	result := Readiness{IsReady: true, Checks: make([]Check, 0, len(uc.probes))}
	for _, probe := range uc.probes {
		status := uc.ping(ctx, probe)
		if status == CheckStatusDown {
			result.IsReady = false
		}
		result.Checks = append(result.Checks, Check{Name: probe.Name(), Status: status})
	}
	return result
}

func (uc *healthUseCase) ping(ctx context.Context, probe coreRepo.HealthProbe) string {
	probeCtx, cancel := context.WithTimeout(ctx, uc.timeout)
	defer cancel()
	if err := probe.Ping(probeCtx); err != nil {
		log.Warn().Err(err).Str("dependency", probe.Name()).Msg("health check failed")
		return CheckStatusDown
	}
	return CheckStatusUp
}
