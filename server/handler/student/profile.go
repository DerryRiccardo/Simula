package student

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// ProfileHandler melayani halaman Profil mahasiswa.
type ProfileHandler struct {
	uc studentModule.ProfileUseCase
}

// Profile membuat handler Profil mahasiswa.
func Profile(uc studentModule.ProfileUseCase) *ProfileHandler {
	return &ProfileHandler{uc: uc}
}

// GetProfile: GET /api/users/me/profile.
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	profile, err := h.uc.GetProfile(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapProfileToResponse(profile))
}

// UpdateDetails: PATCH /api/users/me/profile.
func (h *ProfileHandler) UpdateDetails(c *gin.Context) {
	var req studentDto.ProfileDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	profile, err := h.uc.UpdateDetails(c.Request.Context(), studentDto.MapProfileDetailsReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapProfileToResponse(profile))
}

// UpdateShareDefault: PUT /api/users/me/data-sharing.
func (h *ProfileHandler) UpdateShareDefault(c *gin.Context) {
	var req studentDto.DataSharingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	profile, err := h.uc.UpdateShareDefault(c.Request.Context(), req.ShareDefault)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapProfileToResponse(profile))
}
