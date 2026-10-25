package student

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// UploadHandler membuat URL unggah berkas submission.
type UploadHandler struct {
	uc studentModule.UploadUseCase
}

// Upload membuat handler unggah.
func Upload(uc studentModule.UploadUseCase) *UploadHandler {
	return &UploadHandler{uc: uc}
}

// Create: POST /api/uploads. Browser lalu mengunggah langsung ke uploadUrl.
func (h *UploadHandler) Create(c *gin.Context) {
	var req studentDto.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	ticket, err := h.uc.CreateUpload(c.Request.Context(), studentDto.MapUploadReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, studentDto.MapUploadTicketToResponse(ticket))
}
