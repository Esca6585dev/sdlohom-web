package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/store"
)

// Public: banners for a position (+ language), used by sidebars / home.
func (h *Handler) Banners(c fiber.Ctx) error {
	pos := strings.TrimSpace(c.Query("position", "news_sidebar"))
	if !store.ValidBannerPosition(pos) {
		return httpx.Validation("position nädogry", map[string]string{"position": strings.Join(store.BannerPositions, "|")})
	}
	list, err := h.S.PublicBanners(pos, lang(c))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

// Public: click counter beacon.
func (h *Handler) BannerClick(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	h.S.ClickBanner(id)
	return httpx.NoContent(c)
}

func (h *Handler) AdminBannerList(c fiber.Ctx) error {
	list, err := h.S.ListBanners(strings.TrimSpace(c.Query("position")))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, fiber.Map{"items": list, "positions": store.BannerPositions})
}

func (h *Handler) AdminBannerCreate(c fiber.Ctx) error {
	var in store.BannerInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if in.Image == nil || strings.TrimSpace(*in.Image) == "" {
		return httpx.Validation("Surat hökmany", map[string]string{"image": "Hökmany"})
	}
	if in.Position != nil && !store.ValidBannerPosition(*in.Position) {
		return httpx.Validation("position nädogry", map[string]string{"position": strings.Join(store.BannerPositions, "|")})
	}
	b, err := h.S.CreateBanner(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "banner", &b.ID, b.Title)
	return httpx.Created(c, b)
}

func (h *Handler) AdminBannerUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.BannerInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	b, err := h.S.UpdateBanner(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "banner", &id, b.Title)
	return httpx.OK(c, b)
}

func (h *Handler) AdminBannerDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteBanner(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "banner", &id, "")
	return httpx.NoContent(c)
}
