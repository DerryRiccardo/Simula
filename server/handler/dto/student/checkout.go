package student

import (
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
)

// Kontrak checkout: client/src/types/checkout.ts.

// CreateOrderRequest adalah ICreateOrderPayload.
type CreateOrderRequest struct {
	CaseID string `json:"caseId"`
	Method string `json:"method"`
}

// SimulatePaymentRequest adalah body simulasi pembayaran (TPaymentOutcome).
type SimulatePaymentRequest struct {
	Outcome string `json:"outcome"`
}

// OrderResponse adalah IOrder.
type OrderResponse struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoiceNumber"`
	CaseID        string     `json:"caseId"`
	Method        string     `json:"method"`
	Status        string     `json:"status"`
	Subtotal      int        `json:"subtotal"`
	AdminFee      int        `json:"adminFee"`
	Total         int        `json:"total"`
	CreatedAt     time.Time  `json:"createdAt"`
	ExpiresAt     time.Time  `json:"expiresAt"`
	VANumber      *string    `json:"vaNumber"`
	PaidAt        *time.Time `json:"paidAt"`
}

// CheckoutSummaryResponse adalah ICheckoutSummary.
type CheckoutSummaryResponse struct {
	CaseInfo   CaseDetailResponse  `json:"caseInfo"`
	Enrollment *EnrollmentResponse `json:"enrollment"`
	Order      *OrderResponse      `json:"order"`
}

// MapCheckoutSummaryToResponse memetakan halaman checkout.
func MapCheckoutSummaryToResponse(s studentModule.CheckoutSummary) CheckoutSummaryResponse {
	response := CheckoutSummaryResponse{CaseInfo: mapCaseInfo(s.Case, s.Enrollment)}
	if s.Enrollment != nil {
		enrollment := MapEnrollment(s.Enrollment)
		response.Enrollment = &enrollment
	}
	if s.Order != nil {
		order := MapOrder(*s.Order)
		response.Order = &order
	}
	return response
}

// MapOrder memetakan order. vaNumber hanya untuk VA (bill key untuk Mandiri), dikelompokkan per 4
// digit seperti di client.
func MapOrder(o entity.Order) OrderResponse {
	response := OrderResponse{
		ID:            o.ID,
		InvoiceNumber: o.InvoiceNumber,
		CaseID:        o.CaseID,
		Method:        string(o.Method),
		Status:        string(o.Status),
		Subtotal:      o.Subtotal,
		AdminFee:      o.AdminFee,
		Total:         o.Total,
		CreatedAt:     o.CreatedAt.UTC(),
		ExpiresAt:     o.ExpiresAt.UTC(),
	}
	if o.PaidAt != nil {
		paidAt := o.PaidAt.UTC()
		response.PaidAt = &paidAt
	}
	if number := o.PaymentDetails.TransferNumber(); o.Method.IsVirtualAccount() && number != "" {
		grouped := groupDigits(number)
		response.VANumber = &grouped
	}
	return response
}

func groupDigits(number string) string {
	grouped := make([]byte, 0, len(number)+len(number)/4)
	for i := 0; i < len(number); i++ {
		if i > 0 && i%4 == 0 {
			grouped = append(grouped, ' ')
		}
		grouped = append(grouped, number[i])
	}
	return string(grouped)
}
