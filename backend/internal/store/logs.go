package store

import (
	"fmt"
	"time"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

// ---------- Login / audit logs ----------

func (s *Store) LogLogin(username, actorType, event, ip, ua string) {
	if len(ua) > 255 {
		ua = ua[:255]
	}
	_, _ = s.DB.Exec(`INSERT INTO login_logs (username, actor_type, event, ip, user_agent) VALUES (?,?,?,?,?)`, username, actorType, event, ip, ua)
}

func (s *Store) LogAudit(adminID *int, adminUsername, action, entity string, entityID *int, details, ip string) {
	if len(details) > 2000 {
		details = details[:2000]
	}
	_, _ = s.DB.Exec(`INSERT INTO audit_logs (admin_id, admin_username, action, entity, entity_id, details, ip) VALUES (?,?,?,?,?,?,?)`,
		adminID, adminUsername, action, entity, entityID, details, ip)
}

func (s *Store) ListLoginLogs(actorType string, page, limit int) ([]models.LoginLog, int, error) {
	where, args := "1=1", []any{}
	if actorType != "" {
		where = "actor_type = ?"
		args = append(args, actorType)
	}
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM login_logs WHERE `+where, args...); err != nil {
		return nil, 0, err
	}
	var rows []models.LoginLogRow
	argsL := append(append([]any{}, args...), limit, (page-1)*limit)
	if err := s.DB.Select(&rows, `SELECT id, username, actor_type, event, ip, user_agent, created_at FROM login_logs WHERE `+where+` ORDER BY id DESC LIMIT ? OFFSET ?`, argsL...); err != nil {
		return nil, 0, err
	}
	out := make([]models.LoginLog, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.LoginLog{ID: r.ID, Username: r.Username, ActorType: r.ActorType, Event: r.Event, IP: r.IP, UserAgent: r.UserAgent, CreatedAt: r.CreatedAt})
	}
	return out, total, nil
}

func (s *Store) ListAuditLogs(page, limit int) ([]models.AuditLog, int, error) {
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM audit_logs`); err != nil {
		return nil, 0, err
	}
	var rows []models.AuditLogRow
	if err := s.DB.Select(&rows, `SELECT id, admin_id, admin_username, action, entity, entity_id, details, ip, created_at FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`, limit, (page-1)*limit); err != nil {
		return nil, 0, err
	}
	out := make([]models.AuditLog, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.AuditLog{ID: r.ID, AdminID: r.AdminID, AdminUsername: r.AdminUsername, Action: r.Action, Entity: r.Entity, EntityID: r.EntityID, Details: deref(r.Details), IP: r.IP, CreatedAt: r.CreatedAt})
	}
	return out, total, nil
}

// ---------- Analytics ----------

func (s *Store) RecordVisit(path, locale, referrer, ip, ua, visitorID string) error {
	if len(path) > 255 {
		path = path[:255]
	}
	if len(referrer) > 255 {
		referrer = referrer[:255]
	}
	if len(ua) > 255 {
		ua = ua[:255]
	}
	if len(visitorID) > 36 {
		visitorID = visitorID[:36]
	}
	info := utils.ParseUA(ua)
	_, err := s.DB.Exec(`INSERT INTO page_views (path, locale, referrer, ip_hash, visitor_id, user_agent, device, browser, os) VALUES (?,?,?,?,?,?,?,?,?)`,
		path, utils.NormalizeLang(locale), referrer, utils.HashIP(ip, s.Cfg.IPHashSalt), visitorID, ua, info.Device, info.Browser, info.OS)
	return err
}

const uniqExpr = `COUNT(DISTINCT COALESCE(NULLIF(visitor_id,''), ip_hash))`

func (s *Store) countViews(where string, args ...any) (views, uniq int) {
	_ = s.DB.QueryRow(`SELECT COUNT(*), `+uniqExpr+` FROM page_views WHERE device <> 'bot' AND `+where, args...).Scan(&views, &uniq)
	return
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func (s *Store) VisitSummary(days int) models.VisitSummary {
	now := time.Now()
	today := startOfDay(now)
	var sum models.VisitSummary
	sum.Today, sum.UniqueToday = s.countViews(`created_at >= ?`, today)
	sum.Yesterday, _ = s.countViews(`created_at >= ? AND created_at < ?`, today.AddDate(0, 0, -1), today)
	sum.Last7, _ = s.countViews(`created_at >= ?`, today.AddDate(0, 0, -6))
	sum.Last30, _ = s.countViews(`created_at >= ?`, today.AddDate(0, 0, -29))
	sum.Total, _ = s.countViews(`1=1`)
	_, sum.UniquePeriod = s.countViews(`created_at >= ?`, today.AddDate(0, 0, -(days-1)))
	return sum
}

func (s *Store) DailySeries(days int) ([]models.DailyPoint, error) {
	from := startOfDay(time.Now()).AddDate(0, 0, -(days - 1))
	type row struct {
		D     string `db:"d"`
		Views int    `db:"views"`
		Uniq  int    `db:"uniq"`
	}
	var rows []row
	if err := s.DB.Select(&rows, `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS views, `+uniqExpr+` AS uniq FROM page_views WHERE device <> 'bot' AND created_at >= ? GROUP BY d ORDER BY d`, from); err != nil {
		return nil, err
	}
	m := map[string]row{}
	for _, r := range rows {
		m[r.D] = r
	}
	out := make([]models.DailyPoint, 0, days)
	for i := 0; i < days; i++ {
		d := from.AddDate(0, 0, i).Format("2006-01-02")
		p := models.DailyPoint{Date: d}
		if r, ok := m[d]; ok {
			p.Views, p.Unique = r.Views, r.Uniq
		}
		out = append(out, p)
	}
	return out, nil
}

func (s *Store) HourlySeries(days int) ([]models.HourlyPoint, error) {
	from := startOfDay(time.Now()).AddDate(0, 0, -(days - 1))
	var rows []models.HourlyPoint
	if err := s.DB.Select(&rows, `SELECT HOUR(created_at) AS hour, COUNT(*) AS views FROM page_views WHERE device <> 'bot' AND created_at >= ? GROUP BY hour ORDER BY hour`, from); err != nil {
		return nil, err
	}
	m := map[int]int{}
	for _, r := range rows {
		m[r.Hour] = r.Views
	}
	out := make([]models.HourlyPoint, 24)
	for h := 0; h < 24; h++ {
		out[h] = models.HourlyPoint{Hour: h, Views: m[h]}
	}
	return out, nil
}

func (s *Store) groupBy(col string, days, limit int) ([]models.KeyCount, error) {
	from := startOfDay(time.Now()).AddDate(0, 0, -(days - 1))
	out := []models.KeyCount{}
	err := s.DB.Select(&out, fmt.Sprintf(`SELECT %s AS k, COUNT(*) AS views FROM page_views WHERE device <> 'bot' AND created_at >= ? GROUP BY k ORDER BY views DESC LIMIT %d`, col, limit), from)
	return out, err
}

func (s *Store) Analytics(days int) (*models.Analytics, error) {
	a := &models.Analytics{Summary: s.VisitSummary(days), TopPages: []models.PathCount{}, Devices: []models.DeviceCount{}, Browsers: []models.BrowserCount{}, OS: []models.OSCount{}, Referrers: []models.ReferrerCount{}, TopNews: []models.TopNews{}}
	var err error
	if a.Daily, err = s.DailySeries(days); err != nil {
		return nil, err
	}
	if a.Hourly, err = s.HourlySeries(days); err != nil {
		return nil, err
	}
	if kc, err := s.groupBy("path", days, 15); err == nil {
		for _, k := range kc {
			a.TopPages = append(a.TopPages, models.PathCount{Path: k.Key, Views: k.Views})
		}
	}
	if kc, err := s.groupBy("device", days, 5); err == nil {
		for _, k := range kc {
			a.Devices = append(a.Devices, models.DeviceCount{Device: k.Key, Views: k.Views})
		}
	}
	if kc, err := s.groupBy("browser", days, 8); err == nil {
		for _, k := range kc {
			a.Browsers = append(a.Browsers, models.BrowserCount{Browser: k.Key, Views: k.Views})
		}
	}
	if kc, err := s.groupBy("os", days, 8); err == nil {
		for _, k := range kc {
			a.OS = append(a.OS, models.OSCount{OS: k.Key, Views: k.Views})
		}
	}
	if kc, err := s.groupBy("CASE WHEN referrer = '' THEN '(direct)' ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(referrer, '/', 3), '//', -1) END", days, 10); err == nil {
		for _, k := range kc {
			a.Referrers = append(a.Referrers, models.ReferrerCount{Referrer: k.Key, Views: k.Views})
		}
	}
	if tn, err := s.TopNews(10); err == nil {
		a.TopNews = tn
	}
	return a, nil
}

func (s *Store) DashboardCounts() models.DashboardCounts {
	var c models.DashboardCounts
	_ = s.DB.Get(&c.News, `SELECT COUNT(*) FROM news`)
	_ = s.DB.Get(&c.Pages, `SELECT COUNT(*) FROM menus`)
	_ = s.DB.Get(&c.Slides, `SELECT COUNT(*) FROM slides`)
	_ = s.DB.Get(&c.ContactsUnread, `SELECT COUNT(*) FROM contacts WHERE is_read = 0`)
	_ = s.DB.Get(&c.ContactsTotal, `SELECT COUNT(*) FROM contacts`)
	_ = s.DB.Get(&c.Users, `SELECT COUNT(*) FROM portal_users`)
	_ = s.DB.Get(&c.Media, `SELECT COUNT(*) FROM media`)
	_ = s.DB.Get(&c.Admins, `SELECT COUNT(*) FROM admins`)
	return c
}
