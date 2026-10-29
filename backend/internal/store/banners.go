package store

import (
	"strings"
	"time"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

// Positions a banner can be placed in. Keep in sync with the frontend BannerSlot usage.
var BannerPositions = []string{"news_sidebar", "page_sidebar", "home"}

func ValidBannerPosition(p string) bool {
	for _, v := range BannerPositions {
		if v == p {
			return true
		}
	}
	return false
}

const bannerCols = `id, position, lang, title, image, link, open_new_tab, sort, is_active, clicks, starts_at, ends_at, created_at, updated_at`

func (s *Store) toBanner(r *models.BannerRow) models.Banner {
	lang := ""
	if r.Lang != "" {
		lang = utils.APILang(r.Lang)
	}
	return models.Banner{ID: r.ID, Position: r.Position, Lang: lang, Title: r.Title, Image: r.Image, ImageURL: s.url(r.Image), Link: r.Link,
		OpenNewTab: r.OpenNewTab, Sort: r.Sort, IsActive: r.IsActive, Clicks: r.Clicks, StartsAt: r.StartsAt, EndsAt: r.EndsAt, CreatedAt: r.CreatedAt}
}

// PublicBanners returns active banners for a position: language-specific ones plus "all languages" ones, within their date window.
func (s *Store) PublicBanners(position, lang string) ([]models.Banner, error) {
	var rows []models.BannerRow
	err := s.DB.Select(&rows, `SELECT `+bannerCols+` FROM banners
		WHERE position = ? AND is_active = 1 AND (lang = '' OR lang = ?)
		AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())
		ORDER BY sort, id`, position, utils.DBLang(lang))
	if err != nil {
		return nil, err
	}
	out := make([]models.Banner, 0, len(rows))
	for i := range rows {
		out = append(out, s.toBanner(&rows[i]))
	}
	return out, nil
}

func (s *Store) ListBanners(position string) ([]models.Banner, error) {
	var rows []models.BannerRow
	var err error
	if position != "" {
		err = s.DB.Select(&rows, `SELECT `+bannerCols+` FROM banners WHERE position = ? ORDER BY position, sort, id`, position)
	} else {
		err = s.DB.Select(&rows, `SELECT `+bannerCols+` FROM banners ORDER BY position, sort, id`)
	}
	if err != nil {
		return nil, err
	}
	out := make([]models.Banner, 0, len(rows))
	for i := range rows {
		out = append(out, s.toBanner(&rows[i]))
	}
	return out, nil
}

func (s *Store) BannerByID(id int) (*models.Banner, error) {
	var r models.BannerRow
	if err := s.DB.Get(&r, `SELECT `+bannerCols+` FROM banners WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	b := s.toBanner(&r)
	return &b, nil
}

type BannerInput struct {
	Position   *string    `json:"position"`
	Lang       *string    `json:"lang"`
	Title      *string    `json:"title"`
	Image      *string    `json:"image"`
	Link       *string    `json:"link"`
	OpenNewTab *bool      `json:"open_new_tab"`
	Sort       *int       `json:"sort"`
	IsActive   *bool      `json:"is_active"`
	StartsAt   *time.Time `json:"starts_at"`
	EndsAt     *time.Time `json:"ends_at"`
	ClearDates bool       `json:"clear_dates"`
}

func bannerLang(p *string) string {
	if p == nil || strings.TrimSpace(*p) == "" || *p == "all" {
		return ""
	}
	return utils.DBLang(*p)
}

func (s *Store) CreateBanner(in BannerInput) (*models.Banner, error) {
	pos := "news_sidebar"
	if in.Position != nil && ValidBannerPosition(*in.Position) {
		pos = *in.Position
	}
	sortV, active, newTab := 0, true, true
	if in.Sort != nil {
		sortV = *in.Sort
	}
	if in.IsActive != nil {
		active = *in.IsActive
	}
	if in.OpenNewTab != nil {
		newTab = *in.OpenNewTab
	}
	res, err := s.DB.Exec(`INSERT INTO banners (position, lang, title, image, link, open_new_tab, sort, is_active, starts_at, ends_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
		pos, bannerLang(in.Lang), deref(in.Title), deref(in.Image), strPtrOrNil(in.Link), newTab, sortV, active, in.StartsAt, in.EndsAt)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.BannerByID(int(id))
}

func (s *Store) UpdateBanner(id int, in BannerInput) (*models.Banner, error) {
	var cur models.BannerRow
	if err := s.DB.Get(&cur, `SELECT `+bannerCols+` FROM banners WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	if in.Position != nil && ValidBannerPosition(*in.Position) {
		cur.Position = *in.Position
	}
	if in.Lang != nil {
		cur.Lang = bannerLang(in.Lang)
	}
	if in.Title != nil {
		cur.Title = *in.Title
	}
	if in.Image != nil && strings.TrimSpace(*in.Image) != "" {
		cur.Image = *in.Image
	}
	if in.Link != nil {
		cur.Link = strPtr(*in.Link)
	}
	if in.OpenNewTab != nil {
		cur.OpenNewTab = *in.OpenNewTab
	}
	if in.Sort != nil {
		cur.Sort = *in.Sort
	}
	if in.IsActive != nil {
		cur.IsActive = *in.IsActive
	}
	if in.ClearDates {
		cur.StartsAt, cur.EndsAt = nil, nil
	}
	if in.StartsAt != nil {
		cur.StartsAt = in.StartsAt
	}
	if in.EndsAt != nil {
		cur.EndsAt = in.EndsAt
	}
	if _, err := s.DB.Exec(`UPDATE banners SET position=?, lang=?, title=?, image=?, link=?, open_new_tab=?, sort=?, is_active=?, starts_at=?, ends_at=? WHERE id=?`,
		cur.Position, cur.Lang, cur.Title, cur.Image, cur.Link, cur.OpenNewTab, cur.Sort, cur.IsActive, cur.StartsAt, cur.EndsAt, id); err != nil {
		return nil, err
	}
	return s.BannerByID(id)
}

func (s *Store) DeleteBanner(id int) error {
	res, err := s.DB.Exec(`DELETE FROM banners WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ClickBanner(id int) {
	_, _ = s.DB.Exec(`UPDATE banners SET clicks = clicks + 1 WHERE id = ?`, id)
}
