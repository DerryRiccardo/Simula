// Package router adalah satu-satunya tempat mendaftarkan route. Setiap route wajib berada di
// grup akses yang eksplisit (deny by default); route yang didaftarkan langsung ke engine adalah bug.
package router

import (
	"github.com/gin-gonic/gin"

	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
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
	Health *publicHandler.HealthHandler
}

// Route adalah catatan satu route beserta grup aksesnya.
type Route struct {
	Method string
	Path   string
	Access Access
}

// Register mendaftarkan semua route ke engine dan mengembalikan daftar route beserta aksesnya.
func Register(engine *gin.Engine, h Handlers) []Route {
	r := &registry{api: engine.Group(BasePath)}

	public := r.group(AccessPublic)
	public.GET("/health", h.Health.Live)
	public.GET("/health/ready", h.Health.Ready)

	return r.routes
}

type registry struct {
	api    *gin.RouterGroup
	routes []Route
}

// group membuat grup akses. Middleware auth dan peran untuk grup selain publik ditambahkan
// bersama modul Auth.
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
