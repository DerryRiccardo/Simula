package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// ErrorHandler membaca error terakhir yang dipasang handler lewat c.Error, memetakannya ke status
// HTTP, lalu menulis envelope error. Error 500 dicatat lengkap; client hanya menerima pesan umum.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 || c.Writer.Written() {
			return
		}

		appErr := apperror.From(c.Errors.Last().Err)
		if appErr.Kind == apperror.KindInternal {
			log.Error().
				Err(appErr.Unwrap()).
				Str("request_id", RequestIDFrom(c)).
				Str("method", c.Request.Method).
				Str("route", c.FullPath()).
				Msg("internal error")
		}
		response.Error(c, appErr)
	}
}

// NotFound dipasang di engine.NoRoute agar route yang tidak ada (termasuk method yang salah)
// dibalas dengan envelope error.
func NotFound() gin.HandlerFunc {
	return func(c *gin.Context) {
		_ = c.Error(apperror.NotFound("Endpoint tidak ditemukan."))
	}
}
