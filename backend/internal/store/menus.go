package store

import (
	"fmt"
	"sort"
	"strings"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

const menuCols = `id, parent_id, lang, title, full_title, slug, content, image, video, external_url, sort, depth, is_active, show_in_menu, legacy_table, legacy_id, created_at, updated_at`

func (s *Store) toMenuItem(r *models.MenuRow) *models.MenuItem {
	content := deref(r.Content)
	plain := utils.StripTags(content)
	return &models.MenuItem{
		ID: r.ID, ParentID: r.ParentID, Lang: utils.APILang(r.Lang), Title: r.Title, FullTitle: r.FullTitle, Slug: r.Slug,
		Image: r.Image, ImageURL: s.urlPtr(r.Image), ExternalURL: r.ExternalURL, Sort: r.Sort, Depth: r.Depth,
		IsActive: r.IsActive, ShowInMenu: r.ShowInMenu, HasContent: len(plain) > 0, Excerpt: utils.Excerpt(content, 160),
		Children: []*models.MenuItem{},
	}
}

// MenuTree returns the public navigation tree for a language.
func (s *Store) MenuTree(lang string) ([]*models.MenuItem, error) {
	var rows []models.MenuRow
	err := s.DB.Select(&rows, `SELECT `+menuCols+` FROM menus WHERE lang = ? AND is_active = 1 AND show_in_menu = 1 ORDER BY sort ASC, id ASC`, utils.DBLang(lang))
	if err != nil {
		return nil, err
	}
	return buildTree(s, rows), nil
}

// MenuFlat returns every menu row (admin), optionally filtered by lang.
func (s *Store) MenuFlat(lang string) ([]*models.MenuItem, error) {
	var rows []models.MenuRow
	var err error
	if lang != "" {
		err = s.DB.Select(&rows, `SELECT `+menuCols+` FROM menus WHERE lang = ? ORDER BY lang, depth, sort, id`, utils.DBLang(lang))
	} else {
		err = s.DB.Select(&rows, `SELECT `+menuCols+` FROM menus ORDER BY lang, depth, sort, id`)
	}
	if err != nil {
		return nil, err
	}
	out := make([]*models.MenuItem, 0, len(rows))
	for i := range rows {
		out = append(out, s.toMenuItem(&rows[i]))
	}
	return out, nil
}

func buildTree(s *Store, rows []models.MenuRow) []*models.MenuItem {
	byID := map[int]*models.MenuItem{}
	items := make([]*models.MenuItem, 0, len(rows))
	for i := range rows {
		it := s.toMenuItem(&rows[i])
		byID[it.ID] = it
		items = append(items, it)
	}
	var roots []*models.MenuItem
	for _, it := range items {
		if it.ParentID != nil {
			if p, ok := byID[*it.ParentID]; ok {
				p.Children = append(p.Children, it)
				continue
			}
		}
		roots = append(roots, it)
	}
	var sortRec func(list []*models.MenuItem)
	sortRec = func(list []*models.MenuItem) {
		sort.SliceStable(list, func(i, j int) bool {
			if list[i].Sort != list[j].Sort {
				return list[i].Sort < list[j].Sort
			}
			return list[i].ID < list[j].ID
		})
		for _, it := range list {
			sortRec(it.Children)
		}
	}
	sortRec(roots)
	if roots == nil {
		roots = []*models.MenuItem{}
	}
	return roots
}

func (s *Store) menuRowBy(where string, args ...any) (*models.MenuRow, error) {
	var r models.MenuRow
	if err := s.DB.Get(&r, `SELECT `+menuCols+` FROM menus WHERE `+where+` LIMIT 1`, args...); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

// PageBySlug returns a full page (public: must be active).
func (s *Store) PageBySlug(lang, slug string, adminMode bool) (*models.Page, error) {
	where := `lang = ? AND slug = ?`
	if !adminMode {
		where += ` AND is_active = 1`
	}
	r, err := s.menuRowBy(where, utils.DBLang(lang), slug)
	if err != nil {
		return nil, err
	}
	return s.buildPage(r, adminMode)
}

// PageByID returns a full page by id.
func (s *Store) PageByID(id int, adminMode bool) (*models.Page, error) {
	where := `id = ?`
	if !adminMode {
		where += ` AND is_active = 1`
	}
	r, err := s.menuRowBy(where, id)
	if err != nil {
		return nil, err
	}
	return s.buildPage(r, adminMode)
}

func (s *Store) buildPage(r *models.MenuRow, adminMode bool) (*models.Page, error) {
	item := s.toMenuItem(r)
	p := &models.Page{MenuItem: *item, Content: utils.TidyLegacyHTML(deref(r.Content)), Video: r.Video, VideoURL: s.urlPtr(r.Video), UpdatedAt: r.UpdatedAt,
		Breadcrumbs: []models.Ref{}, Children: []*models.MenuItem{}, Siblings: []*models.MenuItem{}}
	p.MenuItem.Children = nil

	activeCond := ""
	if !adminMode {
		activeCond = " AND is_active = 1"
	}
	// children
	var kids []models.MenuRow
	if err := s.DB.Select(&kids, `SELECT `+menuCols+` FROM menus WHERE parent_id = ?`+activeCond+` ORDER BY sort, id`, r.ID); err != nil {
		return nil, err
	}
	for i := range kids {
		p.Children = append(p.Children, s.toMenuItem(&kids[i]))
	}
	// siblings + parent + breadcrumbs
	if r.ParentID != nil {
		var sib []models.MenuRow
		if err := s.DB.Select(&sib, `SELECT `+menuCols+` FROM menus WHERE parent_id = ? AND id <> ?`+activeCond+` ORDER BY sort, id`, *r.ParentID, r.ID); err != nil {
			return nil, err
		}
		for i := range sib {
			p.Siblings = append(p.Siblings, s.toMenuItem(&sib[i]))
		}
		// walk up
		cur := r.ParentID
		var chain []models.Ref
		for depth := 0; cur != nil && depth < 5; depth++ {
			pr, err := s.menuRowBy(`id = ?`, *cur)
			if err != nil {
				break
			}
			chain = append([]models.Ref{{ID: pr.ID, Title: pr.Title, Slug: pr.Slug}}, chain...)
			if p.Parent == nil {
				p.Parent = &models.Ref{ID: pr.ID, Title: pr.Title, Slug: pr.Slug}
			}
			cur = pr.ParentID
		}
		p.Breadcrumbs = chain
	}
	p.Breadcrumbs = append(p.Breadcrumbs, models.Ref{ID: r.ID, Title: r.Title, Slug: r.Slug})
	return p, nil
}

// MenuInput is the admin create/update payload.
type MenuInput struct {
	Lang        string  `json:"lang"`
	ParentID    *int    `json:"parent_id"`
	Title       string  `json:"title"`
	FullTitle   string  `json:"full_title"`
	Slug        string  `json:"slug"`
	Content     string  `json:"content"`
	Image       *string `json:"image"`
	Video       *string `json:"video"`
	ExternalURL *string `json:"external_url"`
	Sort        *int    `json:"sort"`
	IsActive    *bool   `json:"is_active"`
	ShowInMenu  *bool   `json:"show_in_menu"`
}

// UniqueSlug ensures a slug is unique within (table, lang) excluding an id.
func (s *Store) UniqueSlug(table, lang, base string, excludeID int) (string, error) {
	base = utils.Slugify(base)
	slug := base
	for i := 2; i < 1000; i++ {
		var n int
		if err := s.DB.Get(&n, fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE lang = ? AND slug = ? AND id <> ?`, table), lang, slug, excludeID); err != nil {
			return "", err
		}
		if n == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
	return slug, nil
}

func (s *Store) CreateMenu(in MenuInput) (*models.Page, error) {
	lang := utils.DBLang(in.Lang)
	depth := 1
	if in.ParentID != nil {
		pr, err := s.menuRowBy(`id = ?`, *in.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent: %w", err)
		}
		depth = pr.Depth + 1
	}
	base := in.Slug
	if strings.TrimSpace(base) == "" {
		base = in.Title
	}
	slug, err := s.UniqueSlug("menus", lang, base, 0)
	if err != nil {
		return nil, err
	}
	sortV, active, show := 0, true, true
	if in.Sort != nil {
		sortV = *in.Sort
	}
	if in.IsActive != nil {
		active = *in.IsActive
	}
	if in.ShowInMenu != nil {
		show = *in.ShowInMenu
	}
	full := in.FullTitle
	if strings.TrimSpace(full) == "" {
		full = in.Title
	}
	res, err := s.DB.Exec(`INSERT INTO menus (parent_id, lang, title, full_title, slug, content, image, video, external_url, sort, depth, is_active, show_in_menu)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		in.ParentID, lang, strings.TrimSpace(in.Title), full, slug, utils.SanitizeHTML(in.Content), in.Image, in.Video, in.ExternalURL, sortV, depth, active, show)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.PageByID(int(id), true)
}

func (s *Store) UpdateMenu(id int, in MenuInput) (*models.Page, error) {
	cur, err := s.menuRowBy(`id = ?`, id)
	if err != nil {
		return nil, err
	}
	lang := cur.Lang
	if in.Lang != "" {
		lang = utils.DBLang(in.Lang)
	}
	depth := cur.Depth
	parent := cur.ParentID
	if in.ParentID != nil {
		if *in.ParentID == id {
			return nil, fmt.Errorf("menu cannot be its own parent")
		}
		if *in.ParentID == 0 {
			parent = nil
			depth = 1
		} else {
			pr, err := s.menuRowBy(`id = ?`, *in.ParentID)
			if err != nil {
				return nil, fmt.Errorf("parent: %w", err)
			}
			parent = in.ParentID
			depth = pr.Depth + 1
		}
	}
	title := cur.Title
	if strings.TrimSpace(in.Title) != "" {
		title = strings.TrimSpace(in.Title)
	}
	full := cur.FullTitle
	if strings.TrimSpace(in.FullTitle) != "" {
		full = in.FullTitle
	}
	slug := cur.Slug
	if strings.TrimSpace(in.Slug) != "" && utils.Slugify(in.Slug) != cur.Slug {
		if slug, err = s.UniqueSlug("menus", lang, in.Slug, id); err != nil {
			return nil, err
		}
	}
	content := deref(cur.Content)
	if in.Content != "" || cur.Content == nil {
		content = utils.SanitizeHTML(in.Content)
	}
	sortV, active, show := cur.Sort, cur.IsActive, cur.ShowInMenu
	if in.Sort != nil {
		sortV = *in.Sort
	}
	if in.IsActive != nil {
		active = *in.IsActive
	}
	if in.ShowInMenu != nil {
		show = *in.ShowInMenu
	}
	image, video, ext := cur.Image, cur.Video, cur.ExternalURL
	if in.Image != nil {
		image = strPtr(*in.Image)
	}
	if in.Video != nil {
		video = strPtr(*in.Video)
	}
	if in.ExternalURL != nil {
		ext = strPtr(*in.ExternalURL)
	}
	_, err = s.DB.Exec(`UPDATE menus SET parent_id=?, lang=?, title=?, full_title=?, slug=?, content=?, image=?, video=?, external_url=?, sort=?, depth=?, is_active=?, show_in_menu=? WHERE id=?`,
		parent, lang, title, full, slug, content, image, video, ext, sortV, depth, active, show, id)
	if err != nil {
		return nil, err
	}
	// keep children depth consistent
	_, _ = s.DB.Exec(`UPDATE menus SET depth = ? WHERE parent_id = ?`, depth+1, id)
	return s.PageByID(id, true)
}

func (s *Store) DeleteMenu(id int) error {
	res, err := s.DB.Exec(`DELETE FROM menus WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

type ReorderItem struct {
	ID       int  `json:"id"`
	Sort     int  `json:"sort"`
	ParentID *int `json:"parent_id"`
}

func (s *Store) ReorderMenus(items []ReorderItem) error {
	tx, err := s.DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, it := range items {
		if it.ParentID != nil && *it.ParentID == 0 {
			it.ParentID = nil
		}
		depth := 1
		if it.ParentID != nil {
			var d int
			if err := tx.Get(&d, `SELECT depth FROM menus WHERE id = ?`, *it.ParentID); err == nil {
				depth = d + 1
			}
		}
		if _, err := tx.Exec(`UPDATE menus SET sort = ?, parent_id = ?, depth = ? WHERE id = ?`, it.Sort, it.ParentID, depth, it.ID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// SearchPages does a simple LIKE search on menus.
func (s *Store) SearchPages(lang, q string, limit int) ([]*models.MenuItem, error) {
	var rows []models.MenuRow
	l := like(q)
	err := s.DB.Select(&rows, `SELECT `+menuCols+` FROM menus WHERE lang = ? AND is_active = 1 AND (title LIKE ? OR full_title LIKE ? OR content LIKE ?) ORDER BY depth, sort LIMIT ?`, utils.DBLang(lang), l, l, l, limit)
	if err != nil {
		return nil, err
	}
	out := []*models.MenuItem{}
	for i := range rows {
		out = append(out, s.toMenuItem(&rows[i]))
	}
	return out, nil
}

func (s *Store) CountMenus() (int, error) {
	var n int
	return n, s.DB.Get(&n, `SELECT COUNT(*) FROM menus`)
}
