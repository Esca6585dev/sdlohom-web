// Package router wires middleware and routes.
package router

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"

	"sdlohom/backend/internal/config"
	"sdlohom/backend/internal/handlers"
	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/middleware"
)

func rateLimit(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		KeyGenerator: func(c fiber.Ctx) string {
			if v := c.Get("CF-Connecting-IP"); v != "" {
				return v
			}
			return c.IP()
		},
		LimitReached: func(c fiber.Ctx) error { return httpx.RateLimited() },
	})
}

// New builds the Fiber app.
func New(cfg *config.Config, h *handlers.Handler) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "SDLOHOM API",
		ErrorHandler: httpx.ErrorHandler,
		BodyLimit:    int(cfg.MaxUploadMB) << 20,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
	})

	app.Use(recoverer.New())
	if cfg.AppEnv != "test" {
		app.Use(logger.New(logger.Config{Format: "${time} ${status} ${method} ${path} ${latency}\n"}))
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		MaxAge:       3600,
	}))
	app.Use(func(c fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		return c.Next()
	})

	// Static uploads (images, videos, documents)
	app.Use("/uploads", static.New(cfg.UploadsDir, static.Config{
		Browse: false,
		MaxAge: 86400,
		ModifyResponse: func(c fiber.Ctx) error {
			c.Set("Cross-Origin-Resource-Policy", "cross-origin")
			c.Set("Cache-Control", "public, max-age=86400")
			return nil
		},
	}))

	api := app.Group("/api/v1")

	// ---- Public ----
	api.Get("/health", h.Health)
	api.Get("/settings", h.Settings)
	api.Get("/menus", h.Menus)
	api.Get("/pages/id/:id", h.PageByID)
	api.Get("/pages/:slug", h.PageBySlug)
	api.Get("/slides", h.Slides)
	api.Get("/news/latest", h.NewsLatest)
	api.Get("/news", h.NewsList)
	api.Get("/news/:slug", h.NewsBySlug)
	api.Get("/search", h.Search)
	api.Get("/external-news", h.ExternalNews)
	api.Get("/external-news/:id", h.ExternalNewsDetail)
	api.Get("/banners", h.Banners)
	api.Post("/banners/:id/click", rateLimit(120, time.Minute), h.BannerClick)
	api.Post("/contact", rateLimit(20, 10*time.Minute), h.Contact)
	api.Post("/analytics/visit", rateLimit(600, time.Minute), h.Visit)

	// ---- Auth ----
	auth := api.Group("/auth")
	auth.Post("/admin/login", rateLimit(10, time.Minute), h.AdminLogin)
	auth.Post("/portal/login", rateLimit(10, time.Minute), h.PortalLogin)

	adminAuth := middleware.Require(cfg.JWTSecret, middleware.TypAdmin)
	portalAuth := middleware.Require(cfg.JWTSecret, middleware.TypPortal)

	auth.Get("/admin/me", adminAuth, h.AdminMe)
	auth.Post("/admin/logout", adminAuth, h.AdminLogout)
	auth.Post("/admin/change-password", adminAuth, h.AdminChangePassword)

	portal := api.Group("/portal", portalAuth)
	portal.Get("/me", h.PortalMe)
	portal.Get("/files", h.PortalFiles)

	// ---- Admin ----
	admin := api.Group("/admin", adminAuth)
	managers := middleware.RequireRole("superadmin", "admin")
	super := middleware.RequireRole("superadmin")

	admin.Get("/dashboard", h.AdminDashboard)
	admin.Get("/analytics", h.AdminAnalytics)

	admin.Get("/news", h.AdminNewsList)
	admin.Get("/news/:id", h.AdminNewsGet)
	admin.Post("/news", h.AdminNewsCreate)
	admin.Put("/news/:id", h.AdminNewsUpdate)
	admin.Delete("/news/:id", h.AdminNewsDelete)

	admin.Get("/menus", h.AdminMenuList)
	admin.Put("/menus/reorder", h.AdminMenuReorder)
	admin.Get("/menus/:id", h.AdminMenuGet)
	admin.Post("/menus", h.AdminMenuCreate)
	admin.Put("/menus/:id", h.AdminMenuUpdate)
	admin.Delete("/menus/:id", h.AdminMenuDelete)

	admin.Get("/slides", h.AdminSlideList)
	admin.Post("/slides", h.AdminSlideCreate)
	admin.Put("/slides/:id", h.AdminSlideUpdate)
	admin.Delete("/slides/:id", h.AdminSlideDelete)

	admin.Get("/banners", h.AdminBannerList)
	admin.Post("/banners", h.AdminBannerCreate)
	admin.Put("/banners/:id", h.AdminBannerUpdate)
	admin.Delete("/banners/:id", h.AdminBannerDelete)

	admin.Get("/settings", managers, h.AdminSettingsGet)
	admin.Put("/settings", managers, h.AdminSettingsPut)

	admin.Get("/contacts", h.AdminContactList)
	admin.Patch("/contacts/:id", h.AdminContactPatch)
	admin.Delete("/contacts/:id", managers, h.AdminContactDelete)

	admin.Get("/media", h.AdminMediaList)
	admin.Post("/media/upload", h.AdminMediaUpload)
	admin.Delete("/media/:id", h.AdminMediaDelete)

	admin.Get("/user-groups", managers, h.AdminGroupList)
	admin.Post("/user-groups", managers, h.AdminGroupCreate)
	admin.Put("/user-groups/:id", managers, h.AdminGroupUpdate)
	admin.Delete("/user-groups/:id", managers, h.AdminGroupDelete)

	admin.Get("/users", managers, h.AdminUserList)
	admin.Post("/users", managers, h.AdminUserCreate)
	admin.Put("/users/:id", managers, h.AdminUserUpdate)
	admin.Delete("/users/:id", managers, h.AdminUserDelete)

	admin.Get("/user-files", managers, h.AdminUserFileList)
	admin.Post("/user-files", managers, h.AdminUserFileCreate)
	admin.Put("/user-files/:id", managers, h.AdminUserFileUpdate)
	admin.Delete("/user-files/:id", managers, h.AdminUserFileDelete)

	admin.Get("/admins", super, h.AdminAdminList)
	admin.Post("/admins", super, h.AdminAdminCreate)
	admin.Put("/admins/:id", super, h.AdminAdminUpdate)
	admin.Delete("/admins/:id", super, h.AdminAdminDelete)

	admin.Get("/logs/login", managers, h.AdminLoginLogs)
	admin.Get("/logs/audit", managers, h.AdminAuditLogs)

	app.Use(func(c fiber.Ctx) error { return httpx.NotFound("Marşrut tapylmady") })
	return app
}
