package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Logger mencatat satu baris per request. Query string tidak dicatat karena bisa berisi data
// pribadi (misalnya kata kunci pencarian).
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		event := logLevel(status)
		event.
			Str("request_id", RequestIDFrom(c)).
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Str("route", c.FullPath()).
			Int("status", status).
			Dur("latency", time.Since(start)).
			Str("client_ip", c.ClientIP()).
			Msg("http request")
	}
}

func logLevel(status int) *zerolog.Event {
	switch {
	case status >= http.StatusInternalServerError:
		return log.Error()
	case status >= http.StatusBadRequest:
		return log.Info()
	default:
		return log.Debug()
	}
}
