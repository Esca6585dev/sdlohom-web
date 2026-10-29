package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/store"
)

// ---------- News ----------

func (h *Handler) AdminNewsList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 20, 100)
	f := store.NewsFilter{Lang: strings.TrimSpace(c.Query("lang")), Query: c.Query("q"), Page: page, Limit: limit}
	if v := c.Query("published"); v != "" {
		b := v == "1" || v == "true"
		f.Published = &b
	}
	items, total, err := h.S.ListNews(f)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminNewsGet(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	n, err := h.S.NewsByID(id)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, n)
}

func (h *Handler) AdminNewsCreate(c fiber.Ctx) error {
	var in store.NewsInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if strings.TrimSpace(in.Title) == "" {
		return httpx.Validation("Ady hökmany", map[string]string{"title": "Hökmany"})
	}
	n, err := h.S.CreateNews(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "news", &n.ID, n.Title)
	return httpx.Created(c, n)
}

func (h *Handler) AdminNewsUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.NewsInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	n, err := h.S.UpdateNews(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "news", &id, n.Title)
	return httpx.OK(c, n)
}

func (h *Handler) AdminNewsDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteNews(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "news", &id, "")
	return httpx.NoContent(c)
}

// ---------- Menus / pages ----------

func (h *Handler) AdminMenuList(c fiber.Ctx) error {
	list, err := h.S.MenuFlat(strings.TrimSpace(c.Query("lang")))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

func (h *Handler) AdminMenuGet(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	p, err := h.S.PageByID(id, true)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, p)
}

func (h *Handler) AdminMenuCreate(c fiber.Ctx) error {
	var in store.MenuInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if strings.TrimSpace(in.Title) == "" {
		return httpx.Validation("Ady hökmany", map[string]string{"title": "Hökmany"})
	}
	if in.ParentID != nil && *in.ParentID == 0 {
		in.ParentID = nil
	}
	p, err := h.S.CreateMenu(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "menu", &p.ID, p.Title)
	return httpx.Created(c, p)
}

func (h *Handler) AdminMenuUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.MenuInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	p, err := h.S.UpdateMenu(id, in)
	if err != nil {
		if strings.Contains(err.Error(), "own parent") {
			return httpx.Validation("Menýu öz-özüniň enesi bolup bilmez", nil)
		}
		return mapErr(err)
	}
	h.audit(c, "update", "menu", &id, p.Title)
	return httpx.OK(c, p)
}

func (h *Handler) AdminMenuDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteMenu(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "menu", &id, "")
	return httpx.NoContent(c)
}

func (h *Handler) AdminMenuReorder(c fiber.Ctx) error {
	var req struct {
		Items []store.ReorderItem `json:"items"`
	}
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	if err := h.S.ReorderMenus(req.Items); err != nil {
		return mapErr(err)
	}
	h.audit(c, "reorder", "menu", nil, fmt.Sprintf("%d items", len(req.Items)))
	return httpx.NoContent(c)
}

// ---------- Slides ----------

func (h *Handler) AdminSlideList(c fiber.Ctx) error {
	list, err := h.S.ListSlides(strings.TrimSpace(c.Query("lang")), false)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

func (h *Handler) AdminSlideCreate(c fiber.Ctx) error {
	var in store.SlideInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if in.Image == nil || strings.TrimSpace(*in.Image) == "" {
		return httpx.Validation("Surat hökmany", map[string]string{"image": "Hökmany"})
	}
	sl, err := h.S.CreateSlide(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "slide", &sl.ID, sl.Title)
	return httpx.Created(c, sl)
}

func (h *Handler) AdminSlideUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.SlideInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	sl, err := h.S.UpdateSlide(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "slide", &id, sl.Title)
	return httpx.OK(c, sl)
}

func (h *Handler) AdminSlideDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteSlide(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "slide", &id, "")
	return httpx.NoContent(c)
}

// ---------- Settings ----------

func (h *Handler) AdminSettingsGet(c fiber.Ctx) error {
	all, err := h.S.AllSettings()
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, all)
}

func (h *Handler) AdminSettingsPut(c fiber.Ctx) error {
	var kv map[string]string
	if err := bindJSON(c, &kv); err != nil {
		return err
	}
	for _, k := range []string{"stat_books", "stat_specialties", "stat_teachers", "stat_students"} {
		if v, ok := kv[k]; ok {
			if _, err := strconv.Atoi(strings.TrimSpace(v)); err != nil && strings.TrimSpace(v) != "" {
				return httpx.Validation("San ýazyň", map[string]string{k: "San bolmaly"})
			}
		}
	}
	if err := h.S.SaveSettings(kv); err != nil {
		return mapErr(err)
	}
	keys := make([]string, 0, len(kv))
	for k := range kv {
		keys = append(keys, k)
	}
	h.audit(c, "update", "settings", nil, strings.Join(keys, ","))
	all, err := h.S.AllSettings()
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, all)
}
