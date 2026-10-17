// Package middleware berisi middleware Gin global: request ID, logger, recovery, CORS, batas body,
// dan pemetaan error ke respons.
package middleware

import (
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HeaderRequestID dikirim balik di setiap respons dan boleh dikirim client untuk korelasi log.
const HeaderRequestID = "X-Request-ID"

const ctxKeyRequestID = "request_id"

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9-]{1,64}$`)

// RequestID memakai X-Request-ID dari client bila formatnya aman, atau membuat UUID baru.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(HeaderRequestID)
		if !validRequestID.MatchString(id) {
			id = uuid.NewString()
		}
		c.Set(ctxKeyRequestID, id)
		c.Header(HeaderRequestID, id)
		c.Next()
	}
}

// RequestIDFrom mengambil request ID dari context Gin.
func RequestIDFrom(c *gin.Context) string {
	return c.GetString(ctxKeyRequestID)
}
