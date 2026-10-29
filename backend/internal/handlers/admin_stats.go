package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/store"
)

func (h *Handler) AdminDashboard(c fiber.Ctx) error {
	d := models.Dashboard{Counts: h.S.DashboardCounts(), RecentContacts: []models.Contact{}, RecentNews: []models.NewsItem{}, RecentLogins: []models.LoginLog{}}
	sum := h.S.VisitSummary(30)
	d.Visits = models.DashboardVisits{Today: sum.Today, Yesterday: sum.Yesterday, Last7: sum.Last7, Last30: sum.Last30, UniqueToday: sum.UniqueToday}
	if rc, _, err := h.S.ListContacts(1, 5, false); err == nil {
		d.RecentContacts = rc
	}
	if rn, _, err := h.S.ListNews(store.NewsFilter{Page: 1, Limit: 5}); err == nil {
		d.RecentNews = rn
	}
	if rl, _, err := h.S.ListLoginLogs("", 1, 8); err == nil {
		d.RecentLogins = rl
	}
	if daily, err := h.S.DailySeries(14); err == nil {
		d.Daily = daily
	} else {
		d.Daily = []models.DailyPoint{}
	}
	return httpx.OK(c, d)
}

func (h *Handler) AdminAnalytics(c fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "30"))
	if days < 1 || days > 365 {
		days = 30
	}
	a, err := h.S.Analytics(days)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, a)
}

func (h *Handler) AdminLoginLogs(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 30, 200)
	items, total, err := h.S.ListLoginLogs(strings.TrimSpace(c.Query("actor_type")), page, limit)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminAuditLogs(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 30, 200)
	items, total, err := h.S.ListAuditLogs(page, limit)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}
