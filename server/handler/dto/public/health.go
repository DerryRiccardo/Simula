// Package public berisi DTO untuk endpoint publik.
package public

import "github.com/DerryRiccardo/Simula/server/core/module/system"

// Status layanan pada respons health check.
const (
	StatusOK       = "ok"
	StatusNotReady = "not_ready"
)

// LivenessResponse adalah isi data GET /api/health.
type LivenessResponse struct {
	Status string `json:"status"`
}

// ReadinessResponse adalah isi data GET /api/health/ready.
type ReadinessResponse struct {
	Status string          `json:"status"`
	Checks []CheckResponse `json:"checks"`
}

// CheckResponse adalah status satu dependency.
type CheckResponse struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

// MapReadinessToResponse memetakan hasil use case ke respons.
func MapReadinessToResponse(r system.Readiness) ReadinessResponse {
	status := StatusOK
	if !r.IsReady {
		status = StatusNotReady
	}
	checks := make([]CheckResponse, 0, len(r.Checks))
	for _, check := range r.Checks {
		checks = append(checks, CheckResponse{Name: check.Name, Status: check.Status})
	}
	return ReadinessResponse{Status: status, Checks: checks}
}
