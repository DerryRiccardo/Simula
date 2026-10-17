// Package public berisi handler untuk endpoint yang bisa diakses tanpa login.
package public

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/core/module/system"
	publicDto "github.com/DerryRiccardo/Simula/server/handler/dto/public"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

const msgNotReady = "Layanan belum siap."

// HealthHandler melayani health check untuk load balancer dan monitoring.
type HealthHandler struct {
	uc system.HealthUseCase
}

// Health membuat handler health check.
func Health(uc system.HealthUseCase) *HealthHandler {
	return &HealthHandler{uc: uc}
}

// Live menandakan proses berjalan, tanpa memeriksa dependency.
func (h *HealthHandler) Live(c *gin.Context) {
	response.OK(c, publicDto.LivenessResponse{Status: publicDto.StatusOK})
}

// Ready memeriksa database dan Redis. Dependency yang mati dibalas 503.
func (h *HealthHandler) Ready(c *gin.Context) {
	readiness := h.uc.Readiness(c.Request.Context())
	data := publicDto.MapReadinessToResponse(readiness)
	if !readiness.IsReady {
		response.Write(c, http.StatusServiceUnavailable, msgNotReady, data)
		return
	}
	response.OK(c, data)
}
