package handlers

import (
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/store"
	"sdlohom/backend/internal/utils"
)

func (h *Handler) Health(c fiber.Ctx) error {
	return httpx.OK(c, fiber.Map{"status": "ok", "time": time.Now()})
}

func (h *Handler) Settings(c fiber.Ctx) error {
	ps, err := h.S.PublicSettings(lang(c))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, ps)
}

func (h *Handler) Menus(c fiber.Ctx) error {
	tree, err := h.S.MenuTree(lang(c))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, tree)
}

func (h *Handler) PageBySlug(c fiber.Ctx) error {
	p, err := h.S.PageBySlug(lang(c), c.Params("slug"), false)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, p)
}

func (h *Handler) PageByID(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	p, err := h.S.PageByID(id, false)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, p)
}

func (h *Handler) Slides(c fiber.Ctx) error {
	list, err := h.S.ListSlides(lang(c), true)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

func (h *Handler) NewsList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 12, 50)
	items, total, err := h.S.ListNews(store.NewsFilter{Lang: lang(c), Query: c.Query("q"), PublishedOnly: true, Page: page, Limit: limit})
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) NewsLatest(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "6"))
	if limit < 1 || limit > 24 {
		limit = 6
	}
	items, _, err := h.S.ListNews(store.NewsFilter{Lang: lang(c), PublishedOnly: true, Page: 1, Limit: limit})
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, items)
}

func (h *Handler) NewsBySlug(c fiber.Ctx) error {
	n, err := h.S.NewsBySlug(lang(c), c.Params("slug"))
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, n)
}

func (h *Handler) Search(c fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	res := fiber.Map{"news": []models.NewsItem{}, "pages": []*models.MenuItem{}}
	if len([]rune(q)) < 2 {
		return httpx.OK(c, res)
	}
	news, _, err := h.S.ListNews(store.NewsFilter{Lang: lang(c), Query: q, PublishedOnly: true, Page: 1, Limit: 20})
	if err != nil {
		return mapErr(err)
	}
	pages, err := h.S.SearchPages(lang(c), q, 20)
	if err != nil {
		return mapErr(err)
	}
	res["news"], res["pages"] = news, pages
	return httpx.OK(c, res)
}

func (h *Handler) externalConfig() (base, token string, enabled bool) {
	all, err := h.S.AllSettings()
	if err != nil {
		return "", "", false
	}
	token = strings.TrimSpace(all["external_news_token"])
	if token == "" {
		token = h.Cfg.ExternalNewsToken
	}
	return strings.TrimSpace(all["external_news_url"]), token, all["external_news_enabled"] == "1"
}

// WarmExternalNews pre-fetches the external news lists for all languages (called in a goroutine at startup).
func (h *Handler) WarmExternalNews() {
	base, token, enabled := h.externalConfig()
	if !enabled || base == "" {
		return
	}
	h.Ext.Warm(base, token, []string{"tm", "en", "ru"}, 8)
}

func (h *Handler) ExternalNews(c fiber.Ctx) error {
	base, token, enabled := h.externalConfig()
	if !enabled {
		return httpx.OK(c, []models.ExternalNews{})
	}
	limit, _ := strconv.Atoi(c.Query("limit", "8"))
	if limit < 1 || limit > 30 {
		limit = 8
	}
	return httpx.OK(c, h.Ext.List(base, token, utils.NormalizeLang(lang(c)), limit))
}

func (h *Handler) ExternalNewsDetail(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	base, token, enabled := h.externalConfig()
	if !enabled {
		return httpx.NotFound("")
	}
	item := h.Ext.Detail(base, token, utils.NormalizeLang(lang(c)), id)
	if item == nil {
		return httpx.NotFound("Täzelik tapylmady")
	}
	return httpx.OK(c, item)
}

type contactReq struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Message string `json:"message"`
	Website string `json:"website"` // honeypot
}

func (h *Handler) Contact(c fiber.Ctx) error {
	var req contactReq
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	if strings.TrimSpace(req.Website) != "" {
		// bots fill the hidden field: pretend success
		return httpx.Created(c, fiber.Map{"id": 0})
	}
	fields := map[string]string{}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Message = strings.TrimSpace(req.Message)
	if l := len([]rune(req.Name)); l < 2 || l > 100 {
		fields["name"] = "Adyňyzy ýazyň (2-100 harp)"
	}
	if _, err := mail.ParseAddress(req.Email); err != nil || len(req.Email) > 150 {
		fields["email"] = "Dogry email adres ýazyň"
	}
	if l := len([]rune(req.Message)); l < 5 || l > 4000 {
		fields["message"] = "Hatyňyzy ýazyň (5-4000 harp)"
	}
	if len(fields) > 0 {
		return httpx.Validation("Formany dogry dolduryň", fields)
	}
	ip := h.clientIP(c)
	if n, _ := h.S.ContactsSince(ip, 10); n >= 5 {
		return httpx.RateLimited()
	}
	id, err := h.S.CreateContact(req.Name, req.Email, strings.TrimSpace(req.Phone), req.Message, ip, h.ua(c))
	if err != nil {
		return mapErr(err)
	}
	return httpx.Created(c, fiber.Map{"id": id})
}

type visitReq struct {
	Path      string `json:"path"`
	Locale    string `json:"locale"`
	Referrer  string `json:"referrer"`
	VisitorID string `json:"visitor_id"`
}

func (h *Handler) Visit(c fiber.Ctx) error {
	var req visitReq
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	p := strings.TrimSpace(req.Path)
	if p == "" || !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "/admin") {
		return httpx.NoContent(c)
	}
	if i := strings.Index(p, "?"); i > 0 {
		p = p[:i]
	}
	_ = h.S.RecordVisit(p, req.Locale, strings.TrimSpace(req.Referrer), h.clientIP(c), h.ua(c), strings.TrimSpace(req.VisitorID))
	return httpx.NoContent(c)
}
