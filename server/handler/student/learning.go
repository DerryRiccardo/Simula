package student

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// LearningHandler melayani katalog (juga untuk tamu), dashboard, Case Saya, dan Sertifikat Saya.
type LearningHandler struct {
	uc studentModule.LearningUseCase
}

// Learning membuat handler learning.
func Learning(uc studentModule.LearningUseCase) *LearningHandler {
	return &LearningHandler{uc: uc}
}

// ListCases: GET /api/cases.
func (h *LearningHandler) ListCases(c *gin.Context) {
	var query studentDto.CaseListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	page, err := h.uc.ListCases(c.Request.Context(), studentDto.MapCaseListQueryToInput(query))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCasePageToResponse(page))
}

// GetCase: GET /api/cases/:slug.
func (h *LearningHandler) GetCase(c *gin.Context) {
	result, err := h.uc.GetCase(c.Request.Context(), c.Param("slug"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCaseDetailToResponse(result))
}

// Dashboard: GET /api/me/dashboard.
func (h *LearningHandler) Dashboard(c *gin.Context) {
	dashboard, err := h.uc.Dashboard(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapDashboardToResponse(dashboard))
}

// ListEnrollments: GET /api/me/enrollments.
func (h *LearningHandler) ListEnrollments(c *gin.Context) {
	var query studentDto.EnrollmentListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	enrollments, err := h.uc.ListEnrollments(c.Request.Context(), studentDto.MapEnrollmentListQueryToInput(query))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapEnrollments(enrollments))
}

// StartCase: POST /api/me/enrollments. Hanya untuk AI case; B2B dibuat lewat checkout.
func (h *LearningHandler) StartCase(c *gin.Context) {
	var req studentDto.StartCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	enrollment, err := h.uc.StartCase(c.Request.Context(), req.CaseID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapEnrollment(&enrollment))
}

// ListCertificates: GET /api/me/certificates.
func (h *LearningHandler) ListCertificates(c *gin.Context) {
	var query studentDto.CertificateListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	certificates, err := h.uc.ListCertificates(c.Request.Context(), query.Tier)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCertificates(certificates))
}
