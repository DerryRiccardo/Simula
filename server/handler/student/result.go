package student

import (
	"github.com/gin-gonic/gin"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// ResultHandler melayani halaman hasil dan "Coba lagi".
type ResultHandler struct {
	uc studentModule.ResultUseCase
}

// Result membuat handler hasil.
func Result(uc studentModule.ResultUseCase) *ResultHandler {
	return &ResultHandler{uc: uc}
}

// GetResult: GET /api/cases/:slug/result.
func (h *ResultHandler) GetResult(c *gin.Context) {
	result, err := h.uc.GetResult(c.Request.Context(), c.Param("slug"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCaseResultToResponse(result))
}

// Retry: POST /api/me/enrollments/:id/retry. Tanpa body.
func (h *ResultHandler) Retry(c *gin.Context) {
	enrollment, err := h.uc.Retry(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapEnrollment(&enrollment))
}
