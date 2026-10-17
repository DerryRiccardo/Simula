package router

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	authHandler "github.com/DerryRiccardo/Simula/server/handler/auth"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
)

func registerForTest() (*gin.Engine, []Route) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	noop := func(c *gin.Context) { c.Next() }
	routes := Register(engine,
		Handlers{
			Health:     publicHandler.Health(nil),
			Auth:       authHandler.Auth(nil, sessioncookie.Config{}, "http://localhost:3000"),
			Onboarding: studentHandler.Onboarding(nil),
		},
		Middlewares{
			Auth:         noop,
			OptionalAuth: noop,
			RequireRole:  func(...entity.Role) gin.HandlerFunc { return noop },
		},
	)
	return engine, routes
}

// Setiap route di engine wajib tercatat di grup akses. Route yang didaftarkan langsung ke engine
// (melewati grup) membuat test ini gagal.
func TestRegister_EveryRouteHasAccessGroup(t *testing.T) {
	engine, routes := registerForTest()

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

func TestRegister_AccessGroups(t *testing.T) {
	_, routes := registerForTest()

	tests := []Route{
		{Method: "GET", Path: "/api/health", Access: AccessPublic},
		{Method: "GET", Path: "/api/health/ready", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/register", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/login", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/refresh", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/logout", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/google", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/google/callback", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/me", Access: AccessAuthenticated},
		{Method: "PATCH", Path: "/api/users/me/onboarding", Access: AccessStudent},
	}
	for _, want := range tests {
		t.Run(want.Method+" "+want.Path, func(t *testing.T) {
			assert.Contains(t, routes, want)
		})
	}
}
