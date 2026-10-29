package store

import (
	"strconv"
	"strings"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

// ---------- Slides ----------

const slideCols = `id, lang, design, title, subtitle, caption, image, link, sort, is_active, legacy_id, created_at, updated_at`

func (s *Store) toSlide(r *models.SlideRow) models.Slide {
	return models.Slide{ID: r.ID, Lang: utils.APILang(r.Lang), Design: r.Design, Title: r.Title, Subtitle: r.Subtitle, Caption: r.Caption,
		Image: r.Image, ImageURL: s.url(r.Image), Link: r.Link, Sort: r.Sort, IsActive: r.IsActive}
}

func (s *Store) ListSlides(lang string, activeOnly bool) ([]models.Slide, error) {
	where, args := []string{"1=1"}, []any{}
	if lang != "" {
		where = append(where, "lang = ?")
		args = append(args, utils.DBLang(lang))
	}
	if activeOnly {
		where = append(where, "is_active = 1")
	}
	var rows []models.SlideRow
	if err := s.DB.Select(&rows, `SELECT `+slideCols+` FROM slides WHERE `+strings.Join(where, " AND ")+` ORDER BY lang, sort, id`, args...); err != nil {
		return nil, err
	}
	out := make([]models.Slide, 0, len(rows))
	for i := range rows {
		out = append(out, s.toSlide(&rows[i]))
	}
	return out, nil
}

func (s *Store) SlideByID(id int) (*models.Slide, error) {
	var r models.SlideRow
	if err := s.DB.Get(&r, `SELECT `+slideCols+` FROM slides WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	sl := s.toSlide(&r)
	return &sl, nil
}

type SlideInput struct {
	Lang     string  `json:"lang"`
	Design   *int    `json:"design"`
	Title    *string `json:"title"`
	Subtitle *string `json:"subtitle"`
	Caption  *string `json:"caption"`
	Image    *string `json:"image"`
	Link     *string `json:"link"`
	Sort     *int    `json:"sort"`
	IsActive *bool   `json:"is_active"`
}

func (s *Store) CreateSlide(in SlideInput) (*models.Slide, error) {
	design, sortV, active := 1, 0, true
	if in.Design != nil {
		design = *in.Design
	}
	if in.Sort != nil {
		sortV = *in.Sort
	}
	if in.IsActive != nil {
		active = *in.IsActive
	}
	res, err := s.DB.Exec(`INSERT INTO slides (lang, design, title, subtitle, caption, image, link, sort, is_active) VALUES (?,?,?,?,?,?,?,?,?)`,
		utils.DBLang(in.Lang), design, deref(in.Title), deref(in.Subtitle), deref(in.Caption), deref(in.Image), strPtrOrNil(in.Link), sortV, active)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.SlideByID(int(id))
}

func strPtrOrNil(p *string) *string {
	if p == nil {
		return nil
	}
	return strPtr(*p)
}

func (s *Store) UpdateSlide(id int, in SlideInput) (*models.Slide, error) {
	var cur models.SlideRow
	if err := s.DB.Get(&cur, `SELECT `+slideCols+` FROM slides WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	lang := cur.Lang
	if in.Lang != "" {
		lang = utils.DBLang(in.Lang)
	}
	if in.Design != nil {
		cur.Design = *in.Design
	}
	if in.Title != nil {
		cur.Title = *in.Title
	}
	if in.Subtitle != nil {
		cur.Subtitle = *in.Subtitle
	}
	if in.Caption != nil {
		cur.Caption = *in.Caption
	}
	if in.Image != nil && strings.TrimSpace(*in.Image) != "" {
		cur.Image = *in.Image
	}
	if in.Link != nil {
		cur.Link = strPtr(*in.Link)
	}
	if in.Sort != nil {
		cur.Sort = *in.Sort
	}
	if in.IsActive != nil {
		cur.IsActive = *in.IsActive
	}
	if _, err := s.DB.Exec(`UPDATE slides SET lang=?, design=?, title=?, subtitle=?, caption=?, image=?, link=?, sort=?, is_active=? WHERE id=?`,
		lang, cur.Design, cur.Title, cur.Subtitle, cur.Caption, cur.Image, cur.Link, cur.Sort, cur.IsActive, id); err != nil {
		return nil, err
	}
	return s.SlideByID(id)
}

func (s *Store) DeleteSlide(id int) error {
	res, err := s.DB.Exec(`DELETE FROM slides WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- Settings ----------

func (s *Store) AllSettings() (map[string]string, error) {
	rows, err := s.DB.Queryx("SELECT `key`, COALESCE(`value`,'') FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, nil
}

func (s *Store) SaveSettings(kv map[string]string) error {
	tx, err := s.DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for k, v := range kv {
		k = strings.TrimSpace(k)
		if k == "" || len(k) > 64 {
			continue
		}
		if _, err := tx.Exec("INSERT INTO settings (`key`,`value`,`group`) VALUES (?,?, 'general') ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", k, v); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) PublicSettings(lang string) (*models.PublicSettings, error) {
	all, err := s.AllSettings()
	if err != nil {
		return nil, err
	}
	l := utils.NormalizeLang(lang)
	pick := func(key string) string {
		if v := strings.TrimSpace(all[key+"_"+l]); v != "" {
			return v
		}
		return all[key+"_tm"]
	}
	atoi := func(k string) int { n, _ := strconv.Atoi(strings.TrimSpace(all[k])); return n }
	ps := &models.PublicSettings{
		SiteTitle: pick("site_title"), Phone: all["phone"], Email: all["email"], Address: pick("address"),
		MetaDescription: pick("meta_description"), MoodleURL: all["moodle_url"], MapURL: all["map_url"],
		Social:              models.Social{Facebook: all["facebook"], Instagram: all["instagram"], YouTube: all["youtube"], Telegram: all["telegram"]},
		Stats:               models.Stats{Books: atoi("stat_books"), Specialties: atoi("stat_specialties"), Teachers: atoi("stat_teachers"), Students: atoi("stat_students")},
		ExternalNewsEnabled: all["external_news_enabled"] == "1",
	}
	if logo := strings.TrimSpace(all["logo"]); logo != "" {
		ps.Logo = &logo
		ps.LogoURL = s.urlPtr(&logo)
	}
	return ps, nil
}

// ---------- Contacts ----------

const contactCols = `id, name, email, phone, message, ip, user_agent, is_read, legacy_id, created_at`

func toContact(r *models.ContactRow) models.Contact {
	return models.Contact{ID: r.ID, Name: r.Name, Email: r.Email, Phone: r.Phone, Message: r.Message, IP: r.IP, IsRead: r.IsRead, CreatedAt: r.CreatedAt}
}

func (s *Store) CreateContact(name, email, phone, message, ip, ua string) (int, error) {
	res, err := s.DB.Exec(`INSERT INTO contacts (name, email, phone, message, ip, user_agent) VALUES (?,?,?,?,?,?)`, name, email, strPtr(phone), message, ip, ua)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return int(id), nil
}

func (s *Store) ContactsSince(ip string, minutes int) (int, error) {
	var n int
	return n, s.DB.Get(&n, `SELECT COUNT(*) FROM contacts WHERE ip = ? AND created_at >= NOW() - INTERVAL ? MINUTE`, ip, minutes)
}

func (s *Store) ListContacts(page, limit int, unreadOnly bool) ([]models.Contact, int, error) {
	where := "1=1"
	if unreadOnly {
		where = "is_read = 0"
	}
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM contacts WHERE `+where); err != nil {
		return nil, 0, err
	}
	var rows []models.ContactRow
	if err := s.DB.Select(&rows, `SELECT `+contactCols+` FROM contacts WHERE `+where+` ORDER BY id DESC LIMIT ? OFFSET ?`, limit, (page-1)*limit); err != nil {
		return nil, 0, err
	}
	out := make([]models.Contact, 0, len(rows))
	for i := range rows {
		out = append(out, toContact(&rows[i]))
	}
	return out, total, nil
}

func (s *Store) SetContactRead(id int, read bool) (*models.Contact, error) {
	if _, err := s.DB.Exec(`UPDATE contacts SET is_read = ? WHERE id = ?`, read, id); err != nil {
		return nil, err
	}
	var r models.ContactRow
	if err := s.DB.Get(&r, `SELECT `+contactCols+` FROM contacts WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	c := toContact(&r)
	return &c, nil
}

func (s *Store) DeleteContact(id int) error {
	res, err := s.DB.Exec(`DELETE FROM contacts WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- Media ----------

const mediaCols = `id, kind, path, original_name, mime, size, uploaded_by, legacy_id, created_at`

func (s *Store) toMedia(r *models.MediaRow) models.Media {
	return models.Media{ID: r.ID, Kind: r.Kind, Path: r.Path, URL: s.url(r.Path), OriginalName: r.OriginalName, Mime: r.Mime, Size: r.Size, CreatedAt: r.CreatedAt}
}

func (s *Store) ListMedia(kind, q string, page, limit int) ([]models.Media, int, error) {
	where, args := []string{"1=1"}, []any{}
	if kind != "" {
		where = append(where, "kind = ?")
		args = append(args, kind)
	}
	if strings.TrimSpace(q) != "" {
		l := like(q)
		where = append(where, "(path LIKE ? OR original_name LIKE ?)")
		args = append(args, l, l)
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM media WHERE `+w, args...); err != nil {
		return nil, 0, err
	}
	var rows []models.MediaRow
	argsL := append(append([]any{}, args...), limit, (page-1)*limit)
	if err := s.DB.Select(&rows, `SELECT `+mediaCols+` FROM media WHERE `+w+` ORDER BY id DESC LIMIT ? OFFSET ?`, argsL...); err != nil {
		return nil, 0, err
	}
	out := make([]models.Media, 0, len(rows))
	for i := range rows {
		out = append(out, s.toMedia(&rows[i]))
	}
	return out, total, nil
}

func (s *Store) CreateMedia(kind, path, original, mime string, size int64, uploadedBy *int) (*models.Media, error) {
	res, err := s.DB.Exec(`INSERT INTO media (kind, path, original_name, mime, size, uploaded_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE original_name = VALUES(original_name), mime = VALUES(mime), size = VALUES(size)`,
		kind, path, original, mime, size, uploadedBy)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	var r models.MediaRow
	if id == 0 {
		err = s.DB.Get(&r, `SELECT `+mediaCols+` FROM media WHERE path = ?`, path)
	} else {
		err = s.DB.Get(&r, `SELECT `+mediaCols+` FROM media WHERE id = ?`, id)
	}
	if err != nil {
		return nil, err
	}
	m := s.toMedia(&r)
	return &m, nil
}

func (s *Store) MediaByID(id int) (*models.Media, error) {
	var r models.MediaRow
	if err := s.DB.Get(&r, `SELECT `+mediaCols+` FROM media WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	m := s.toMedia(&r)
	return &m, nil
}

func (s *Store) DeleteMedia(id int) error {
	res, err := s.DB.Exec(`DELETE FROM media WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
