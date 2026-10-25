// Package router adalah satu-satunya tempat mendaftarkan route. Setiap route wajib berada di
// grup akses yang eksplisit (deny by default); route yang didaftarkan langsung ke engine adalah bug.
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	authHandler "github.com/DerryRiccardo/Simula/server/handler/auth"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
)

// BasePath adalah prefix semua endpoint API (tanpa versi).
const BasePath = "/api"

// Access adalah grup akses sebuah route.
type Access string

const (
	AccessPublic        Access = "public"
	AccessOptionalAuth  Access = "optional_auth"
	AccessAuthenticated Access = "authenticated"
	AccessStudent       Access = "student"
	AccessReviewer      Access = "reviewer"
	AccessAdmin         Access = "admin"
	AccessWebhook       Access = "webhook"
)

// Handlers berisi semua handler yang didaftarkan. Dikonstruksi di app/server.go.
type Handlers struct {
	Health     *publicHandler.HealthHandler
	Auth       *authHandler.AuthHandler
	Onboarding *studentHandler.OnboardingHandler
	Learning   *studentHandler.LearningHandler
}

// Middlewares adalah middleware akses yang dipasang per grup.
type Middlewares struct {
	Auth         gin.HandlerFunc
	OptionalAuth gin.HandlerFunc
	RequireRole  func(roles ...entity.Role) gin.HandlerFunc
}

// Route adalah catatan satu route beserta grup aksesnya.
type Route struct {
	Method string
	Path   string
	Access Access
}

// Register mendaftarkan semua route ke engine dan mengembalikan daftar route beserta aksesnya.
func Register(engine *gin.Engine, h Handlers, mw Middlewares) []Route {
	r := &registry{api: engine.Group(BasePath)}

	public := r.group(AccessPublic)
	public.GET("/health", h.Health.Live)
	public.GET("/health/ready", h.Health.Ready)
	public.POST("/auth/register", h.Auth.Register)
	public.POST("/auth/login", h.Auth.Login)
	public.POST("/auth/refresh", h.Auth.Refresh)
	// Logout publik: tetap bisa menghapus cookie walau access token sudah kedaluwarsa.
	public.POST("/auth/logout", h.Auth.Logout)
	public.GET("/auth/google", h.Auth.GoogleStart)
	public.GET("/auth/google/callback", h.Auth.GoogleCallback)

	optional := r.group(AccessOptionalAuth, mw.OptionalAuth)
	optional.GET("/cases", h.Learning.ListCases)
	optional.GET("/cases/:slug", h.Learning.GetCase)

	authenticated := r.group(AccessAuthenticated, mw.Auth)
	authenticated.GET("/auth/me", h.Auth.Me)

	student := r.group(AccessStudent, mw.Auth, mw.RequireRole(entity.RoleStudent))
	student.PATCH("/users/me/onboarding", h.Onboarding.Complete)
	student.GET("/me/dashboard", h.Learning.Dashboard)
	student.GET("/me/enrollments", h.Learning.ListEnrollments)
	student.POST("/me/enrollments", h.Learning.StartCase)
	student.GET("/me/certificates", h.Learning.ListCertificates)

	return r.routes
}

type registry struct {
	api    *gin.RouterGroup
	routes []Route
}

// group membuat grup akses dengan middleware-nya.
func (r *registry) group(access Access, middlewares ...gin.HandlerFunc) *group {
	return &group{rg: r.api.Group("", middlewares...), access: access, registry: r}
}

type group struct {
	rg       *gin.RouterGroup
	access   Access
	registry *registry
}

func (g *group) GET(path string, h gin.HandlerFunc)    { g.handle("GET", path, h) }
func (g *group) POST(path string, h gin.HandlerFunc)   { g.handle("POST", path, h) }
func (g *group) PUT(path string, h gin.HandlerFunc)    { g.handle("PUT", path, h) }
func (g *group) PATCH(path string, h gin.HandlerFunc)  { g.handle("PATCH", path, h) }
func (g *group) DELETE(path string, h gin.HandlerFunc) { g.handle("DELETE", path, h) }

func (g *group) handle(method, path string, h gin.HandlerFunc) {
	g.rg.Handle(method, path, h)
	g.registry.routes = append(g.registry.routes, Route{
		Method: method,
		Path:   g.rg.BasePath() + path,
		Access: g.access,
	})
}
