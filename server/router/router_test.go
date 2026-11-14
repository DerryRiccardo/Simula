package router

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	adminHandler "github.com/DerryRiccardo/Simula/server/handler/admin"
	authHandler "github.com/DerryRiccardo/Simula/server/handler/auth"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	reviewerHandler "github.com/DerryRiccardo/Simula/server/handler/reviewer"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	webhookHandler "github.com/DerryRiccardo/Simula/server/handler/webhook"
	"github.com/DerryRiccardo/Simula/server/pkg/sessioncookie"
)

func registerForTest() (*gin.Engine, []Route) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	noop := func(c *gin.Context) { c.Next() }
	routes := Register(engine,
		Handlers{
			Health:          publicHandler.Health(nil),
			Platform:        publicHandler.Platform(nil),
			Auth:            authHandler.Auth(nil, sessioncookie.Config{}, "http://localhost:3000"),
			Onboarding:      studentHandler.Onboarding(nil),
			Profile:         studentHandler.Profile(nil),
			Learning:        studentHandler.Learning(nil),
			Workspace:       studentHandler.Workspace(nil),
			Upload:          studentHandler.Upload(nil),
			Result:          studentHandler.Result(nil),
			Certificate:     publicHandler.Certificate(nil),
			Checkout:        studentHandler.Checkout(nil),
			Midtrans:        webhookHandler.Midtrans(nil),
			Review:          reviewerHandler.Review(nil),
			AdminPartner:    adminHandler.Partner(nil),
			AdminReview:     adminHandler.Review(nil),
			AdminCase:       adminHandler.Case(nil),
			AdminOverview:   adminHandler.Overview(nil),
			AdminMember:     adminHandler.Member(nil),
			AdminOrder:      adminHandler.Order(nil),
			AdminTalentPool: adminHandler.TalentPool(nil),
			AdminField:      adminHandler.Field(nil),
			AdminSettings:   adminHandler.Settings(nil),
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
		{Method: "GET", Path: "/api/fields", Access: AccessPublic},
		{Method: "GET", Path: "/api/settings", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/register", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/login", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/refresh", Access: AccessPublic},
		{Method: "POST", Path: "/api/auth/logout", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/google", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/google/callback", Access: AccessPublic},
		{Method: "GET", Path: "/api/auth/me", Access: AccessAuthenticated},
		{Method: "POST", Path: "/api/auth/change-password", Access: AccessAuthenticated},
		{Method: "PATCH", Path: "/api/users/me/onboarding", Access: AccessStudent},
		{Method: "GET", Path: "/api/users/me/profile", Access: AccessStudent},
		{Method: "PATCH", Path: "/api/users/me/profile", Access: AccessStudent},
		{Method: "PUT", Path: "/api/users/me/data-sharing", Access: AccessStudent},
		{Method: "GET", Path: "/api/cases", Access: AccessOptionalAuth},
		{Method: "GET", Path: "/api/cases/:slug", Access: AccessOptionalAuth},
		{Method: "GET", Path: "/api/me/dashboard", Access: AccessStudent},
		{Method: "GET", Path: "/api/me/enrollments", Access: AccessStudent},
		{Method: "POST", Path: "/api/me/enrollments", Access: AccessStudent},
		{Method: "GET", Path: "/api/me/certificates", Access: AccessStudent},
		{Method: "GET", Path: "/api/cases/:slug/workspace", Access: AccessStudent},
		{Method: "GET", Path: "/api/cases/:slug/status", Access: AccessStudent},
		{Method: "POST", Path: "/api/me/enrollments/:id/start", Access: AccessStudent},
		{Method: "PUT", Path: "/api/me/enrollments/:id/draft", Access: AccessStudent},
		{Method: "POST", Path: "/api/me/enrollments/:id/submit", Access: AccessStudent},
		{Method: "POST", Path: "/api/uploads", Access: AccessStudent},
		{Method: "GET", Path: "/api/cases/:slug/result", Access: AccessStudent},
		{Method: "POST", Path: "/api/me/enrollments/:id/retry", Access: AccessStudent},
		{Method: "GET", Path: "/api/certificates/:id", Access: AccessOptionalAuth},
		{Method: "GET", Path: "/api/cases/:slug/checkout", Access: AccessStudent},
		{Method: "POST", Path: "/api/orders", Access: AccessStudent},
		{Method: "POST", Path: "/api/orders/:id/cancel", Access: AccessStudent},
		{Method: "POST", Path: "/api/orders/:id/simulate", Access: AccessStudent},
		{Method: "POST", Path: "/api/webhooks/midtrans", Access: AccessWebhook},
		{Method: "POST", Path: "/api/me/enrollments/:id/share-consent", Access: AccessStudent},
		{Method: "GET", Path: "/api/reviewer/queue", Access: AccessReviewer},
		{Method: "GET", Path: "/api/reviewer/submissions/:id", Access: AccessReviewer},
		{Method: "PUT", Path: "/api/reviewer/submissions/:id/draft", Access: AccessReviewer},
		{Method: "POST", Path: "/api/reviewer/submissions/:id/grade", Access: AccessReviewer},
		{Method: "POST", Path: "/api/reviewer/submissions/:id/revision", Access: AccessReviewer},
		{Method: "GET", Path: "/api/admin/overview", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/members", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/members/:id", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/orders", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/talent-pool", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/talent-pool/:id/share", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/fields", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/fields", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/fields/:key", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/fields/:key/status", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/fields/:key/move", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/settings", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/settings", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/partners", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/partners", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/partners/:id", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/reviewers", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/reviewers/:id/assignments", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/reviewers/:id/status", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/reviews", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/reviews/:id", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/reviews/:id/regrade", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/reviews/:id/flag", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/reviews/:id/remind", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/reviews/:id/reassign", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/cases", Access: AccessAdmin},
		{Method: "GET", Path: "/api/admin/cases/:id", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/cases", Access: AccessAdmin},
		{Method: "PUT", Path: "/api/admin/cases/:id", Access: AccessAdmin},
		{Method: "POST", Path: "/api/admin/uploads", Access: AccessAdmin},
	}
	for _, want := range tests {
		t.Run(want.Method+" "+want.Path, func(t *testing.T) {
			assert.Contains(t, routes, want)
		})
	}
}
