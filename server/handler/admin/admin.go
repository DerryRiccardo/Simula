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

// SetPartnerStatus: PUT /api/admin/partners/:id/status.
func (h *PartnerHandler) SetPartnerStatus(c *gin.Context) {
	var req adminDto.StatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	partner, err := h.uc.SetPartnerStatus(c.Request.Context(), c.Param("id"), req.IsActive)
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

// OverviewHandler melayani menu Dashboard admin.
type OverviewHandler struct {
	uc adminModule.OverviewUseCase
}

// Overview membuat handler Dashboard admin.
func Overview(uc adminModule.OverviewUseCase) *OverviewHandler {
	return &OverviewHandler{uc: uc}
}

// GetOverview: GET /api/admin/overview.
func (h *OverviewHandler) GetOverview(c *gin.Context) {
	overview, err := h.uc.GetOverview(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapOverviewToResponse(overview))
}

// MemberHandler melayani menu Member admin.
type MemberHandler struct {
	uc adminModule.MemberUseCase
}

// Member membuat handler Member admin.
func Member(uc adminModule.MemberUseCase) *MemberHandler {
	return &MemberHandler{uc: uc}
}

// ListMembers: GET /api/admin/members.
func (h *MemberHandler) ListMembers(c *gin.Context) {
	members, err := h.uc.ListMembers(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapMemberSummaries(members))
}

// GetMember: GET /api/admin/members/:id.
func (h *MemberHandler) GetMember(c *gin.Context) {
	detail, err := h.uc.GetMember(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapMemberDetailToResponse(detail))
}

// OrderHandler melayani menu Order admin.
type OrderHandler struct {
	uc adminModule.OrderUseCase
}

// Order membuat handler Order admin.
func Order(uc adminModule.OrderUseCase) *OrderHandler {
	return &OrderHandler{uc: uc}
}

// ListOrders: GET /api/admin/orders.
func (h *OrderHandler) ListOrders(c *gin.Context) {
	orders, err := h.uc.ListOrders(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminOrders(orders))
}

// TalentPoolHandler melayani menu Talent pool admin.
type TalentPoolHandler struct {
	uc adminModule.TalentPoolUseCase
}

// TalentPool membuat handler Talent pool admin.
func TalentPool(uc adminModule.TalentPoolUseCase) *TalentPoolHandler {
	return &TalentPoolHandler{uc: uc}
}

// ListTalentPool: GET /api/admin/talent-pool.
func (h *TalentPoolHandler) ListTalentPool(c *gin.Context) {
	candidates, err := h.uc.ListTalentPool(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapTalentCandidates(candidates))
}

// ShareTalent: POST /api/admin/talent-pool/:id/share.
func (h *TalentPoolHandler) ShareTalent(c *gin.Context) {
	candidate, err := h.uc.ShareTalent(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapTalentCandidate(candidate))
}

// FieldHandler melayani menu Bidang studi admin.
type FieldHandler struct {
	uc adminModule.FieldUseCase
}

// Field membuat handler Bidang studi admin.
func Field(uc adminModule.FieldUseCase) *FieldHandler {
	return &FieldHandler{uc: uc}
}

// ListFields: GET /api/admin/fields.
func (h *FieldHandler) ListFields(c *gin.Context) {
	fields, err := h.uc.ListFields(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminFields(fields))
}

// CreateField: POST /api/admin/fields.
func (h *FieldHandler) CreateField(c *gin.Context) {
	var req adminDto.FieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	created, err := h.uc.CreateField(c.Request.Context(), adminDto.MapFieldReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, adminDto.MapAdminField(created))
}

// UpdateField: PUT /api/admin/fields/:key.
func (h *FieldHandler) UpdateField(c *gin.Context) {
	var req adminDto.FieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	fields, err := h.uc.UpdateField(c.Request.Context(), c.Param("key"), adminDto.MapFieldReqToInput(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminFields(fields))
}

// SetFieldActive: PUT /api/admin/fields/:key/status.
func (h *FieldHandler) SetFieldActive(c *gin.Context) {
	var req adminDto.FieldStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	fields, err := h.uc.SetFieldActive(c.Request.Context(), c.Param("key"), req.IsActive)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminFields(fields))
}

// MoveField: POST /api/admin/fields/:key/move.
func (h *FieldHandler) MoveField(c *gin.Context) {
	var req adminDto.FieldMoveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	fields, err := h.uc.MoveField(c.Request.Context(), c.Param("key"), req.Direction)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminFields(fields))
}

// SettingsHandler melayani menu Pengaturan admin.
type SettingsHandler struct {
	uc adminModule.SettingsUseCase
}

// Settings membuat handler Pengaturan admin.
func Settings(uc adminModule.SettingsUseCase) *SettingsHandler {
	return &SettingsHandler{uc: uc}
}

// GetSettings: GET /api/admin/settings.
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	settings, err := h.uc.GetSettings(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminSettingsToResponse(settings))
}

// SaveSettings: PUT /api/admin/settings.
func (h *SettingsHandler) SaveSettings(c *gin.Context) {
	var req adminDto.PlatformSettingsPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	settings, err := h.uc.SaveSettings(c.Request.Context(), adminDto.MapSettingsReqToEntity(req))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, adminDto.MapAdminSettingsToResponse(settings))
}
