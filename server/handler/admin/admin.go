// Package admin berisi handler panel admin.
package admin

import (
	"github.com/gin-gonic/gin"

	adminModule "github.com/DerryRiccardo/Simula/server/core/module/admin"
	adminDto "github.com/DerryRiccardo/Simula/server/handler/dto/admin"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// PartnerHandler melayani menu Reviewer & Mitra.
type PartnerHandler struct {
	uc adminModule.PartnerUseCase
}

// Partner membuat handler Reviewer & Mitra.
func Partner(uc adminModule.PartnerUseCase) *PartnerHandler {
	return &PartnerHandler{uc: uc}
}

// GetDirectory: GET /api/admin/partners.
func (h *PartnerHandler) GetDirectory(c *gin.Context) {
	directory, err := h.uc.GetDirectory(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapDirectoryToResponse(directory))
}

// CreatePartner: POST /api/admin/partners.
func (h *PartnerHandler) CreatePartner(c *gin.Context) {
	var req adminDto.PartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	partner, err := h.uc.CreatePartner(c.Request.Context(), adminDto.MapPartnerReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, adminDto.MapPartner(partner))
}

// UpdatePartner: PUT /api/admin/partners/:id.
func (h *PartnerHandler) UpdatePartner(c *gin.Context) {
	var req adminDto.PartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	partner, err := h.uc.UpdatePartner(c.Request.Context(), c.Param("id"), adminDto.MapPartnerReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapPartner(partner))
}

// CreateReviewer: POST /api/admin/reviewers. Respons berisi password sementara (sekali saja).
func (h *PartnerHandler) CreateReviewer(c *gin.Context) {
	var req adminDto.ReviewerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	created, err := h.uc.CreateReviewer(c.Request.Context(), adminDto.MapReviewerReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, adminDto.MapCreatedReviewer(created))
}

// SetReviewerCases: PUT /api/admin/reviewers/:id/assignments.
func (h *PartnerHandler) SetReviewerCases(c *gin.Context) {
	var req adminDto.AssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	reviewer, err := h.uc.SetReviewerCases(c.Request.Context(), c.Param("id"), req.CaseIDs)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapReviewer(reviewer))
}

// SetReviewerStatus: PUT /api/admin/reviewers/:id/status.
func (h *PartnerHandler) SetReviewerStatus(c *gin.Context) {
	var req adminDto.StatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	reviewer, err := h.uc.SetReviewerStatus(c.Request.Context(), c.Param("id"), req.IsActive)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapReviewer(reviewer))
}

// ReviewHandler melayani menu Penilaian.
type ReviewHandler struct {
	uc adminModule.ReviewUseCase
}

// Review membuat handler Penilaian.
func Review(uc adminModule.ReviewUseCase) *ReviewHandler {
	return &ReviewHandler{uc: uc}
}

// ListReviews: GET /api/admin/reviews.
func (h *ReviewHandler) ListReviews(c *gin.Context) {
	list, err := h.uc.ListReviews(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapReviewListToResponse(list))
}

// GetReview: GET /api/admin/reviews/:id (id = enrollment).
func (h *ReviewHandler) GetReview(c *gin.Context) {
	h.respond(c)(h.uc.GetReview(c.Request.Context(), c.Param("id")))
}

// Regrade: POST /api/admin/reviews/:id/regrade.
func (h *ReviewHandler) Regrade(c *gin.Context) {
	h.respond(c)(h.uc.Regrade(c.Request.Context(), c.Param("id")))
}

// SetFlag: PUT /api/admin/reviews/:id/flag.
func (h *ReviewHandler) SetFlag(c *gin.Context) {
	var req adminDto.FlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	h.respond(c)(h.uc.SetFlag(c.Request.Context(), c.Param("id"), req.IsFlagged, req.Note))
}

// RemindReviewer: POST /api/admin/reviews/:id/remind.
func (h *ReviewHandler) RemindReviewer(c *gin.Context) {
	h.respond(c)(h.uc.RemindReviewer(c.Request.Context(), c.Param("id")))
}

// ReassignReviewer: POST /api/admin/reviews/:id/reassign.
func (h *ReviewHandler) ReassignReviewer(c *gin.Context) {
	var req adminDto.ReassignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	h.respond(c)(h.uc.ReassignReviewer(c.Request.Context(), c.Param("id"), req.ReviewerID))
}

// respond menulis detail penilaian atau error.
func (h *ReviewHandler) respond(c *gin.Context) func(adminModule.ReviewDetail, error) {
	return func(detail adminModule.ReviewDetail, err error) {
		if err != nil {
			_ = c.Error(err)
			return
		}
		response.OK(c, adminDto.MapReviewDetailToResponse(detail))
	}
}
