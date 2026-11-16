package admin

import (
	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	adminModule "github.com/DerryRiccardo/Simula/server/core/module/admin"
	adminDto "github.com/DerryRiccardo/Simula/server/handler/dto/admin"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// CaseHandler melayani pembuat case.
type CaseHandler struct {
	uc adminModule.CaseUseCase
}

// Case membuat handler pembuat case.
func Case(uc adminModule.CaseUseCase) *CaseHandler {
	return &CaseHandler{uc: uc}
}

// ListCases: GET /api/admin/cases.
func (h *CaseHandler) ListCases(c *gin.Context) {
	cases, err := h.uc.ListCases(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapCaseSummaries(cases))
}

// GetCase: GET /api/admin/cases/:id.
func (h *CaseHandler) GetCase(c *gin.Context) {
	detail, err := h.uc.GetCase(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminCase(detail))
}

// CreateCase: POST /api/admin/cases.
func (h *CaseHandler) CreateCase(c *gin.Context) {
	h.save(c, "", true)
}

// UpdateCase: PUT /api/admin/cases/:id.
func (h *CaseHandler) UpdateCase(c *gin.Context) {
	h.save(c, c.Param("id"), false)
}

func (h *CaseHandler) save(c *gin.Context, id string, isNew bool) {
	var req adminDto.CaseSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	detail, err := h.uc.SaveCase(c.Request.Context(), id, adminDto.MapCaseReqToInput(req.Input), req.IsPublish)
	if err != nil {
		_ = c.Error(err)
		return
	}
	if isNew {
		response.Created(c, adminDto.MapAdminCase(detail))
		return
	}
	response.OK(c, adminDto.MapAdminCase(detail))
}

// SetCaseStatus: PUT /api/admin/cases/:id/status.
func (h *CaseHandler) SetCaseStatus(c *gin.Context) {
	var req adminDto.CaseStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	detail, err := h.uc.SetCaseStatus(c.Request.Context(), c.Param("id"), entity.CaseStatus(req.Status))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminCase(detail))
}

// CreateMaterialUpload: POST /api/admin/uploads. URL unggah materi langsung ke R2.
func (h *CaseHandler) CreateMaterialUpload(c *gin.Context) {
	var req adminDto.MaterialUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	upload, err := h.uc.CreateMaterialUpload(c.Request.Context(), req.FileName, req.SizeBytes)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, adminDto.MapMaterialUpload(upload))
}
