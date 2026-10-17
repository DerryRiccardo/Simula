package router

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
)

// Setiap route di engine wajib tercatat di grup akses. Route yang didaftarkan langsung ke engine
// (melewati grup) membuat test ini gagal.
func TestRegister_EveryRouteHasAccessGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()

	routes := Register(engine, Handlers{Health: publicHandler.Health(nil)})

	recorded := make(map[string]Access, len(routes))
	for _, route := range routes {
		assert.NotEmpty(t, route.Access, "route %s %s has no access group", route.Method, route.Path)
		recorded[route.Method+" "+route.Path] = route.Access
	}
	for _, info := range engine.Routes() {
		_, ok := recorded[info.Method+" "+info.Path]
		assert.True(t, ok, "route %s %s is not registered through an access group", info.Method, info.Path)
	}
	assert.Len(t, routes, len(engine.Routes()))
}

func TestRegister_HealthIsPublic(t *testing.T) {
	gin.SetMode(gin.TestMode)

	routes := Register(gin.New(), Handlers{Health: publicHandler.Health(nil)})

	assert.Contains(t, routes, Route{Method: "GET", Path: "/api/health", Access: AccessPublic})
	assert.Contains(t, routes, Route{Method: "GET", Path: "/api/health/ready", Access: AccessPublic})
}
