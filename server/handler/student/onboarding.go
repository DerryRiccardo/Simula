// Package student berisi handler endpoint mahasiswa.
package student

import (
	"github.com/gin-gonic/gin"

	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
	authDto "github.com/DerryRiccardo/Simula/server/handler/dto/auth"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// OnboardingHandler melayani langkah onboarding mahasiswa baru.
type OnboardingHandler struct {
	uc authModule.AuthUseCase
}

// Onboarding membuat handler onboarding.
func Onboarding(uc authModule.AuthUseCase) *OnboardingHandler {
	return &OnboardingHandler{uc: uc}
}

// Complete: PATCH /api/users/me/onboarding.
func (h *OnboardingHandler) Complete(c *gin.Context) {
	var req authDto.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	user, err := h.uc.CompleteOnboarding(c.Request.Context(), authDto.MapOnboardingReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, authDto.MapUserToResponse(user))
}
