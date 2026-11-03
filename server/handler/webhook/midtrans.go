// Package webhook berisi endpoint yang dipanggil layanan eksternal. Tanpa middleware auth; setiap
// handler memverifikasi pemanggilnya sendiri (signature).
package webhook

import (
	"context"
	"io"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// NotificationProcessor memproses notifikasi pembayaran (shared.PaymentService).
type NotificationProcessor interface {
	HandleNotification(ctx context.Context, raw []byte) error
}

// MidtransHandler menerima HTTP notification Midtrans.
type MidtransHandler struct {
	payments NotificationProcessor
}

// Midtrans membuat handler webhook Midtrans.
func Midtrans(payments NotificationProcessor) *MidtransHandler {
	return &MidtransHandler{payments: payments}
}

// Notify: POST /api/webhooks/midtrans. Balas 200 setelah notifikasi tercatat supaya Midtrans
// berhenti mengirim ulang; error selain 400 membuat Midtrans mencoba lagi.
func (h *MidtransHandler) Notify(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		_ = c.Error(apperror.BadRequest("Notifikasi pembayaran tidak valid."))
		return
	}
	if err := h.payments.HandleNotification(c.Request.Context(), raw); err != nil {
		_ = c.Error(apperror.From(err))
		return
	}
	response.OK(c, nil)
}
