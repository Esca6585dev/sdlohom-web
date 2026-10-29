// Package handlers maps HTTP requests to store calls.
package handlers

import (
	"encoding/json"
	"errors"
	"net"
	"strings"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/config"
	"sdlohom/backend/internal/external"
	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/middleware"
	"sdlohom/backend/internal/store"
)

type Handler struct {
	S   *store.Store
	Cfg *config.Config
	Ext *external.Client
}

func New(s *store.Store, cfg *config.Config) *Handler {
	return &Handler{S: s, Cfg: cfg, Ext: external.New()}
}

// clientIP honours proxy headers only when TRUST_PROXY=1.
func (h *Handler) clientIP(c fiber.Ctx) string {
	if h.Cfg.TrustProxy {
		for _, hdr := range []string{"CF-Connecting-IP", "X-Real-IP", "X-Forwarded-For"} {
			if v := strings.TrimSpace(c.Get(hdr)); v != "" {
				first := strings.TrimSpace(strings.Split(v, ",")[0])
				if net.ParseIP(first) != nil {
					return first
				}
			}
		}
	}
	return c.IP()
}

func (h *Handler) ua(c fiber.Ctx) string { return c.Get("User-Agent") }

// bindJSON decodes the request body into v, returning a validation error on malformed JSON.
func bindJSON(c fiber.Ctx, v any) error {
	body := c.Body()
	if len(strings.TrimSpace(string(body))) == 0 {
		return httpx.Validation("Boş sorag", nil)
	}
	if err := json.Unmarshal(body, v); err != nil {
		return httpx.Validation("JSON nädogry: "+err.Error(), nil)
	}
	return nil
}

// mapErr converts store errors into API errors.
func mapErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, store.ErrNotFound) {
		return httpx.NotFound("")
	}
	msg := err.Error()
	if strings.Contains(msg, "Duplicate entry") {
		return httpx.Conflict("Şeýle ýazgy eýýäm bar (gaýtalanýan ulanyjy ady ýa-da slug)")
	}
	if strings.Contains(msg, "foreign key constraint") {
		return httpx.Validation("Baglanyşykly ýazgy tapylmady (topar/ene menýu)", nil)
	}
	return httpx.Internal(err)
}

func (h *Handler) audit(c fiber.Ctx, action, entity string, entityID *int, details string) {
	cl := middleware.Current(c)
	if cl == nil {
		return
	}
	id := cl.UserID
	h.S.LogAudit(&id, cl.Username, action, entity, entityID, details, h.clientIP(c))
}

func lang(c fiber.Ctx) string { return c.Query("lang", "tm") }
