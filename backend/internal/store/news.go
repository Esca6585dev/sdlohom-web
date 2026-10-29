package store

import (
	"strings"
	"time"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

const newsCols = `id, lang, title, slug, excerpt, content, image, video, published_at, is_published, views, legacy_id, created_at, updated_at`

func (s *Store) toNewsItem(r *models.NewsRow) models.NewsItem {
	return models.NewsItem{
		ID: r.ID, Lang: utils.APILang(r.Lang), Title: r.Title, Slug: r.Slug, Excerpt: r.Excerpt,
		Image: r.Image, ImageURL: s.urlPtr(r.Image), Video: r.Video, VideoURL: s.urlPtr(r.Video),
		PublishedAt: r.PublishedAt, IsPublished: r.IsPublished, Views: r.Views,
	}
}

// NewsFilter controls listing.
type NewsFilter struct {
	Lang          string // "" = all (admin only)
	Query         string
	PublishedOnly bool
	Published     *bool
	Page, Limit   int
}

func (s *Store) ListNews(f NewsFilter) ([]models.NewsItem, int, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.Lang != "" {
		where = append(where, "lang = ?")
		args = append(args, utils.DBLang(f.Lang))
	}
	if f.PublishedOnly {
		where = append(where, "is_published = 1 AND published_at <= NOW()")
	} else if f.Published != nil {
		where = append(where, "is_published = ?")
		args = append(args, *f.Published)
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		l := like(q)
		where = append(where, "(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)")
		args = append(args, l, l, l)
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM news WHERE `+w, args...); err != nil {
		return nil, 0, err
	}
	var rows []models.NewsRow
	argsL := append(append([]any{}, args...), f.Limit, (f.Page-1)*f.Limit)
	if err := s.DB.Select(&rows, `SELECT `+newsCols+` FROM news WHERE `+w+` ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`, argsL...); err != nil {
		return nil, 0, err
	}
	out := make([]models.NewsItem, 0, len(rows))
	for i := range rows {
		out = append(out, s.toNewsItem(&rows[i]))
	}
	return out, total, nil
}

func (s *Store) newsRowBy(where string, args ...any) (*models.NewsRow, error) {
	var r models.NewsRow
	if err := s.DB.Get(&r, `SELECT `+newsCols+` FROM news WHERE `+where+` LIMIT 1`, args...); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

func (s *Store) buildNews(r *models.NewsRow, withNeighbors bool) (*models.News, error) {
	n := &models.News{NewsItem: s.toNewsItem(r), Content: utils.TidyLegacyHTML(deref(r.Content)), UpdatedAt: r.UpdatedAt, Related: []models.NewsItem{}}
	if withNeighbors {
		var prev, next models.NewsRow
		if err := s.DB.Get(&prev, `SELECT `+newsCols+` FROM news WHERE lang = ? AND is_published = 1 AND (published_at < ? OR (published_at = ? AND id < ?)) ORDER BY published_at DESC, id DESC LIMIT 1`, r.Lang, r.PublishedAt, r.PublishedAt, r.ID); err == nil {
			n.Prev = &models.NewsRef{Slug: prev.Slug, Title: prev.Title}
		}
		if err := s.DB.Get(&next, `SELECT `+newsCols+` FROM news WHERE lang = ? AND is_published = 1 AND (published_at > ? OR (published_at = ? AND id > ?)) ORDER BY published_at ASC, id ASC LIMIT 1`, r.Lang, r.PublishedAt, r.PublishedAt, r.ID); err == nil {
			n.Next = &models.NewsRef{Slug: next.Slug, Title: next.Title}
		}
		n.Related = s.relatedNews(r, 4)
	}
	return n, nil
}

// relatedNews finds items sharing significant title words with r (same language), then fills up with the latest ones.
func (s *Store) relatedNews(r *models.NewsRow, limit int) []models.NewsItem {
	out := []models.NewsItem{}
	seen := map[int]bool{r.ID: true}
	add := func(rows []models.NewsRow) {
		for i := range rows {
			if len(out) >= limit || seen[rows[i].ID] {
				continue
			}
			seen[rows[i].ID] = true
			out = append(out, s.toNewsItem(&rows[i]))
		}
	}
	// significant words: >= 5 runes, not purely numeric
	var words []string
	for _, w := range strings.FieldsFunc(strings.ToLower(utils.StripTags(r.Title)), func(c rune) bool {
		return !(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9') && !(c > 127 && c != '«' && c != '»' && c != '—' && c != '–')
	}) {
		if len([]rune(w)) >= 5 && len(words) < 4 {
			words = append(words, w)
		}
	}
	if len(words) > 0 {
		conds := make([]string, 0, len(words))
		args := []any{r.Lang, r.ID}
		for _, w := range words {
			conds = append(conds, "title LIKE ?")
			args = append(args, like(w))
		}
		var rows []models.NewsRow
		if err := s.DB.Select(&rows, `SELECT `+newsCols+` FROM news WHERE lang = ? AND is_published = 1 AND id <> ? AND (`+strings.Join(conds, " OR ")+`) ORDER BY published_at DESC, id DESC LIMIT ?`, append(args, limit)...); err == nil {
			add(rows)
		}
	}
	if len(out) < limit {
		var rows []models.NewsRow
		if err := s.DB.Select(&rows, `SELECT `+newsCols+` FROM news WHERE lang = ? AND is_published = 1 AND id <> ? ORDER BY published_at DESC, id DESC LIMIT ?`, r.Lang, r.ID, limit+len(out)); err == nil {
			add(rows)
		}
	}
	return out
}

// NewsBySlug returns a published news item and increments its view counter.
func (s *Store) NewsBySlug(lang, slug string) (*models.News, error) {
	r, err := s.newsRowBy(`lang = ? AND slug = ? AND is_published = 1`, utils.DBLang(lang), slug)
	if err != nil {
		// slug may exist in another language (links shared across locales)
		if r, err = s.newsRowBy(`slug = ? AND is_published = 1`, slug); err != nil {
			return nil, err
		}
	}
	_, _ = s.DB.Exec(`UPDATE news SET views = views + 1 WHERE id = ?`, r.ID)
	r.Views++
	return s.buildNews(r, true)
}

func (s *Store) NewsByID(id int) (*models.News, error) {
	r, err := s.newsRowBy(`id = ?`, id)
	if err != nil {
		return nil, err
	}
	return s.buildNews(r, false)
}

type NewsInput struct {
	Lang        string     `json:"lang"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Excerpt     string     `json:"excerpt"`
	Content     *string    `json:"content"`
	Image       *string    `json:"image"`
	Video       *string    `json:"video"`
	PublishedAt *time.Time `json:"published_at"`
	IsPublished *bool      `json:"is_published"`
}

func (s *Store) CreateNews(in NewsInput) (*models.News, error) {
	lang := utils.DBLang(in.Lang)
	base := in.Slug
	if strings.TrimSpace(base) == "" {
		base = in.Title
	}
	slug, err := s.UniqueSlug("news", lang, base, 0)
	if err != nil {
		return nil, err
	}
	content := utils.SanitizeHTML(deref(in.Content))
	excerpt := strings.TrimSpace(in.Excerpt)
	if excerpt == "" {
		excerpt = utils.Excerpt(content, 220)
	}
	pub := time.Now()
	if in.PublishedAt != nil {
		pub = *in.PublishedAt
	}
	published := true
	if in.IsPublished != nil {
		published = *in.IsPublished
	}
	res, err := s.DB.Exec(`INSERT INTO news (lang, title, slug, excerpt, content, image, video, published_at, is_published) VALUES (?,?,?,?,?,?,?,?,?)`,
		lang, strings.TrimSpace(in.Title), slug, excerpt, content, in.Image, in.Video, pub, published)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.NewsByID(int(id))
}

func (s *Store) UpdateNews(id int, in NewsInput) (*models.News, error) {
	cur, err := s.newsRowBy(`id = ?`, id)
	if err != nil {
		return nil, err
	}
	lang := cur.Lang
	if in.Lang != "" {
		lang = utils.DBLang(in.Lang)
	}
	title := cur.Title
	if strings.TrimSpace(in.Title) != "" {
		title = strings.TrimSpace(in.Title)
	}
	slug := cur.Slug
	if strings.TrimSpace(in.Slug) != "" && utils.Slugify(in.Slug) != cur.Slug {
		if slug, err = s.UniqueSlug("news", lang, in.Slug, id); err != nil {
			return nil, err
		}
	}
	content := deref(cur.Content)
	if in.Content != nil {
		content = utils.SanitizeHTML(*in.Content)
	}
	excerpt := cur.Excerpt
	if strings.TrimSpace(in.Excerpt) != "" {
		excerpt = strings.TrimSpace(in.Excerpt)
	} else if in.Content != nil {
		excerpt = utils.Excerpt(content, 220)
	}
	pub := cur.PublishedAt
	if in.PublishedAt != nil {
		pub = *in.PublishedAt
	}
	published := cur.IsPublished
	if in.IsPublished != nil {
		published = *in.IsPublished
	}
	image, video := cur.Image, cur.Video
	if in.Image != nil {
		image = strPtr(*in.Image)
	}
	if in.Video != nil {
		video = strPtr(*in.Video)
	}
	if _, err := s.DB.Exec(`UPDATE news SET lang=?, title=?, slug=?, excerpt=?, content=?, image=?, video=?, published_at=?, is_published=? WHERE id=?`,
		lang, title, slug, excerpt, content, image, video, pub, published, id); err != nil {
		return nil, err
	}
	return s.NewsByID(id)
}

func (s *Store) DeleteNews(id int) error {
	res, err := s.DB.Exec(`DELETE FROM news WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) TopNews(limit int) ([]models.TopNews, error) {
	out := []models.TopNews{}
	err := s.DB.Select(&out, `SELECT id, title, slug, views FROM news ORDER BY views DESC, id DESC LIMIT ?`, limit)
	return out, err
}

func (s *Store) CountNews() (int, error) {
	var n int
	return n, s.DB.Get(&n, `SELECT COUNT(*) FROM news`)
}
