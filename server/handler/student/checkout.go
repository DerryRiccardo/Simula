package student

import (
	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// CheckoutHandler melayani checkout B2B.
type CheckoutHandler struct {
	uc studentModule.CheckoutUseCase
}

// Checkout membuat handler checkout.
func Checkout(uc studentModule.CheckoutUseCase) *CheckoutHandler {
	return &CheckoutHandler{uc: uc}
}

// GetCheckout: GET /api/cases/:slug/checkout.
func (h *CheckoutHandler) GetCheckout(c *gin.Context) {
	summary, err := h.uc.GetCheckout(c.Request.Context(), c.Param("slug"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapCheckoutSummaryToResponse(summary))
}

// CreateOrder: POST /api/orders.
func (h *CheckoutHandler) CreateOrder(c *gin.Context) {
	var req studentDto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	order, err := h.uc.CreateOrder(c.Request.Context(), req.CaseID, entity.PaymentMethod(req.Method))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.Created(c, studentDto.MapOrder(order))
}

// CancelOrder: POST /api/orders/:id/cancel. Tanpa body.
func (h *CheckoutHandler) CancelOrder(c *gin.Context) {
	order, err := h.uc.CancelOrder(c.Request.Context(), c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapOrder(order))
}

// SimulatePayment: POST /api/orders/:id/simulate. Hanya dengan PAYMENT_PROVIDER=fake; selain itu 404.
func (h *CheckoutHandler) SimulatePayment(c *gin.Context) {
	var req studentDto.SimulatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(bind.Error(err))
		return
	}
	order, err := h.uc.SimulatePayment(c.Request.Context(), c.Param("id"), req.Outcome)
	if err != nil {
		_ = c.Error(err)
		return
	}
	response.OK(c, studentDto.MapOrder(order))
}
