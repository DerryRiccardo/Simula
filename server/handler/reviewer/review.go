// Package reviewer berisi handler portal reviewer mitra.
package reviewer

import (
	"github.com/gin-gonic/gin"

	reviewerModule "github.com/DerryRiccardo/Simula/server/core/module/reviewer"
	reviewerDto "github.com/DerryRiccardo/Simula/server/handler/dto/reviewer"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// ReviewHandler melayani antrean dan keputusan reviewer.
type ReviewHandler struct {
	uc reviewerModule.ReviewUseCase
}

// Review membuat handler portal reviewer.
func Review(uc reviewerModule.ReviewUseCase) *ReviewHandler {
	return &ReviewHandler{uc: uc}
}

// GetQueue: GET /api/reviewer/queue.
func (h *ReviewHandler) GetQueue(c *gin.Context) {
	queue, err := h.uc.GetQueue(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, reviewerDto.MapQueueToResponse(queue))
}

// GetSubmission: GET /api/reviewer/submissions/:id (id = enrollment).
func (h *ReviewHandler) GetSubmission(c *gin.Context) {
	detail, err := h.uc.GetSubmission(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, reviewerDto.MapDetailToResponse(detail))
}

// SaveDraft: PUT /api/reviewer/submissions/:id/draft.
func (h *ReviewHandler) SaveDraft(c *gin.Context) {
	var req reviewerDto.DraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	patch, err := reviewerDto.MapDraftReqToPatch(req)
	if err != nil {
		_ = c.Error(apperror.BadRequest("Format draft tidak valid."))
		return
	}
	draft, err := h.uc.SaveDraft(c.Request.Context(), c.Param("id"), patch)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, reviewerDto.MapDraft(draft))
}

// Grade: POST /api/reviewer/submissions/:id/grade.
func (h *ReviewHandler) Grade(c *gin.Context) {
	var req reviewerDto.GradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	entry, err := h.uc.Grade(c.Request.Context(), c.Param("id"), reviewerDto.MapGradeReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, reviewerDto.MapQueueItem(entry))
}

// RequestRevision: POST /api/reviewer/submissions/:id/revision.
func (h *ReviewHandler) RequestRevision(c *gin.Context) {
	var req reviewerDto.RevisionPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	entry, err := h.uc.RequestRevision(c.Request.Context(), c.Param("id"), req.Reason, req.Note)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, reviewerDto.MapQueueItem(entry))
}
