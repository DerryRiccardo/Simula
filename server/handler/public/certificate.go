package public

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	publicDto "github.com/DerryRiccardo/Simula/server/handler/dto/public"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// CertificateHandler melayani verifikasi sertifikat publik untuk recruiter.
type CertificateHandler struct {
	uc studentModule.CertificateUseCase
}

// Certificate membuat handler verifikasi sertifikat.
func Certificate(uc studentModule.CertificateUseCase) *CertificateHandler {
	return &CertificateHandler{uc: uc}
}

// Verify: GET /api/certificates/:id. Bila login, isOwner menandai pemilik sertifikat.
func (h *CertificateHandler) Verify(c *gin.Context) {
	verification, err := h.uc.Verify(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, publicDto.MapCertificateVerificationToResponse(verification))
}
