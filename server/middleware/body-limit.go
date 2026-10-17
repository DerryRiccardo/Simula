package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimit membatasi ukuran body request. Body yang melebihi batas membuat binding gagal dengan
// *http.MaxBytesError, yang dipetakan apperror.FromBinding menjadi 400.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
