package middleware

import (
	"fmt"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// Recovery menangkap panic di handler, mencatatnya beserta stack trace, lalu membalas 500 dengan
// envelope error.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			recovered := recover()
			if recovered == nil {
				return
			}
			log.Error().
				Str("request_id", RequestIDFrom(c)).
				Str("panic", fmt.Sprint(recovered)).
				Bytes("stack", debug.Stack()).
				Msg("recovered from panic")
			if !c.Writer.Written() {
				response.Error(c, apperror.Internal(fmt.Errorf("panic: %v", recovered)))
			}
			c.Abort()
		}()
		c.Next()
	}
}
