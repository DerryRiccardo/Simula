package student

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// WorkspaceHandler melayani halaman pengerjaan dan halaman status.
type WorkspaceHandler struct {
	uc studentModule.WorkspaceUseCase
}

// Workspace membuat handler workspace.
func Workspace(uc studentModule.WorkspaceUseCase) *WorkspaceHandler {
	return &WorkspaceHandler{uc: uc}
}

// GetWorkspace: GET /api/cases/:slug/workspace.
func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
	workspace, err := h.uc.GetWorkspace(c.Request.Context(), c.Param("slug"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapWorkspaceToResponse(workspace))
}

// GetStatus: GET /api/cases/:slug/status.
func (h *WorkspaceHandler) GetStatus(c *gin.Context) {
	status, err := h.uc.GetStatus(c.Request.Context(), c.Param("slug"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCaseStatusToResponse(status))
}

// StartWork: POST /api/me/enrollments/:id/start. Tanpa body.
func (h *WorkspaceHandler) StartWork(c *gin.Context) {
	enrollment, err := h.uc.StartWork(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapEnrollment(&enrollment))
}

// SaveDraft: PUT /api/me/enrollments/:id/draft.
func (h *WorkspaceHandler) SaveDraft(c *gin.Context) {
	var req studentDto.SubmissionContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	draft, err := h.uc.SaveDraft(c.Request.Context(), c.Param("id"), studentDto.MapSubmissionContentReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapDraftToResponse(draft))
}

// Submit: POST /api/me/enrollments/:id/submit.
func (h *WorkspaceHandler) Submit(c *gin.Context) {
	var req studentDto.SubmissionContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	enrollment, err := h.uc.Submit(c.Request.Context(), c.Param("id"), studentDto.MapSubmissionContentReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapEnrollment(&enrollment))
}
