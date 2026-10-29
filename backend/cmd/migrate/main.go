// cmd/migrate copies every row of the legacy PHP database (sdlohomdatabase) and every upload file
// into the new normalized schema. It is idempotent: rows are matched by legacy_id and updated.
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/jmoiron/sqlx"

	"sdlohom/backend/internal/config"
	"sdlohom/backend/internal/database"
	"sdlohom/backend/internal/utils"
)

type migrator struct {
	old, db  *sqlx.DB
	cfg      *config.Config
	oldHTML  string
	menuMap  map[string]int // "table:legacyID" -> new id
	groupMap map[int]int
	stats    map[string]int
}

func main() {
	cfg := config.Load()
	if loc, err := time.LoadLocation(cfg.Timezone); err == nil {
		time.Local = loc
	}
	oldHTML := flag.String("old-html", cfg.LegacyHTML, "path to legacy html/ folder")
	skipFiles := flag.Bool("skip-files", false, "do not copy upload files")
	flag.Parse()

	old, err := database.Connect(cfg.DSN(cfg.LegacyDBName))
	if err != nil {
		log.Fatalf("legacy db: %v", err)
	}
	if err := database.EnsureDatabase(cfg.DSN(""), cfg.DBName); err != nil {
		log.Fatalf("ensure db: %v", err)
	}
	db, err := database.Connect(cfg.DSN(cfg.DBName))
	if err != nil {
		log.Fatalf("new db: %v", err)
	}
	mdir := os.Getenv("MIGRATIONS_DIR")
	if mdir == "" {
		mdir = "./migrations"
	}
	if err := database.Migrate(db, mdir); err != nil {
		log.Fatalf("schema: %v", err)
	}

	m := &migrator{old: old, db: db, cfg: cfg, oldHTML: *oldHTML, menuMap: map[string]int{}, groupMap: map[int]int{}, stats: map[string]int{}}
	m.admins()
	m.menus()
	m.news()
	m.slides()
	m.settings()
	m.contacts()
	m.media()
	m.groups()
	m.users()
	m.userFiles()
	m.logs()
	if !*skipFiles {
		m.files()
	}
	m.summary()
}

func (m *migrator) count(name string) { m.stats[name]++ }

func nz(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// ---------- admins ----------

func (m *migrator) admins() {
	type row struct {
		ID       int       `db:"id"`
		Name     string    `db:"name"`
		Surname  string    `db:"surname"`
		Username string    `db:"username"`
		Password string    `db:"password"`
		Regdate  time.Time `db:"regdate"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, name, surname, username, password, regdate FROM admin`); err != nil {
		log.Fatalf("admins: %v", err)
	}
	for _, r := range rows {
		role := "admin"
		if r.Username == "admin" {
			role = "superadmin"
		}
		var id int
		var curHash string
		err := m.db.QueryRow(`SELECT id, password_hash FROM admins WHERE legacy_id = ?`, r.ID).Scan(&id, &curHash)
		if err == nil {
			hash := curHash
			if strings.HasPrefix(curHash, "sha1$") {
				hash = utils.LegacySHA1Hash(r.Password)
			}
			_, err = m.db.Exec(`UPDATE admins SET name=?, surname=?, username=?, password_hash=?, role=? WHERE id=?`, r.Name, r.Surname, r.Username, hash, role, id)
		} else {
			_, err = m.db.Exec(`INSERT INTO admins (name, surname, username, password_hash, role, is_active, legacy_id, created_at) VALUES (?,?,?,?,?,1,?,?)`,
				r.Name, r.Surname, r.Username, utils.LegacySHA1Hash(r.Password), role, r.ID, dateOr(r.Regdate))
		}
		if err != nil {
			log.Printf("admin %s: %v", r.Username, err)
			continue
		}
		m.count("admins")
	}
}

func dateOr(t time.Time) time.Time {
	if t.IsZero() || t.Year() < 1971 {
		return time.Now()
	}
	return t
}

// ---------- menus ----------

func (m *migrator) upsertMenu(legacyTable string, legacyID int, parentID *int, lang, title, full, slugBase, content string, image, video, ext *string, sort, depth int, created time.Time) {
	var id int
	err := m.db.QueryRow(`SELECT id FROM menus WHERE legacy_table = ? AND legacy_id = ?`, legacyTable, legacyID).Scan(&id)
	exists := err == nil
	lang = utils.DBLang(lang)
	// slug unique within lang (excluding ourselves)
	slug := utils.Slugify(slugBase)
	for i := 2; ; i++ {
		var n int
		_ = m.db.Get(&n, `SELECT COUNT(*) FROM menus WHERE lang = ? AND slug = ? AND NOT (legacy_table = ? AND legacy_id = ?)`, lang, slug, legacyTable, legacyID)
		if n == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", utils.Slugify(slugBase), i)
	}
	if strings.TrimSpace(full) == "" {
		full = title
	}
	content = utils.SanitizeHTML(content)
	if exists {
		_, err = m.db.Exec(`UPDATE menus SET parent_id=?, lang=?, title=?, full_title=?, slug=?, content=?, image=?, video=?, external_url=?, sort=?, depth=? WHERE id=?`,
			parentID, lang, title, full, slug, content, image, video, ext, sort, depth, id)
	} else {
		var res interface{ LastInsertId() (int64, error) }
		res, err = m.db.Exec(`INSERT INTO menus (parent_id, lang, title, full_title, slug, content, image, video, external_url, sort, depth, is_active, show_in_menu, legacy_table, legacy_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,?,?,?)`,
			parentID, lang, title, full, slug, content, image, video, ext, sort, depth, legacyTable, legacyID, dateOr(created))
		if err == nil {
			i64, _ := res.LastInsertId()
			id = int(i64)
		}
	}
	if err != nil {
		log.Printf("menu %s#%d (%s): %v", legacyTable, legacyID, title, err)
		return
	}
	m.menuMap[fmt.Sprintf("%s:%d", legacyTable, legacyID)] = id
	m.count("menus")
}

func pathPtr(prefix, name string) *string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	p := prefix + "/" + strings.TrimLeft(name, "/")
	return &p
}

func (m *migrator) menus() {
	type top struct {
		ID      int    `db:"id"`
		Lang    string `db:"lang"`
		Ady     string `db:"ady"`
		DolyAdy string `db:"dolyady"`
		Text    string `db:"text"`
		Sort    int    `db:"sort"`
		Wideo   string `db:"wideo"`
	}
	var tops []top
	if err := m.old.Select(&tops, `SELECT id, lang, ady, dolyady, text, sort, wideo FROM menu_yokarky ORDER BY id`); err != nil {
		log.Fatalf("menu_yokarky: %v", err)
	}
	moodle := "http://119.235.119.206/"
	for _, t := range tops {
		var ext *string
		if strings.EqualFold(strings.TrimSpace(t.Ady), "moodle") {
			ext = &moodle
		}
		slugBase := t.DolyAdy
		if strings.TrimSpace(slugBase) == "" {
			slugBase = t.Ady
		}
		m.upsertMenu("menu_yokarky", t.ID, nil, t.Lang, strings.TrimSpace(t.Ady), strings.TrimSpace(t.DolyAdy), slugBase, t.Text, nil, pathPtr("wideo_menu", t.Wideo), ext, t.Sort, 1, time.Time{})
	}

	type sub struct {
		ID       int       `db:"id"`
		Datetime time.Time `db:"datetime"`
		Degisli  string    `db:"degisli"`
		Lang     string    `db:"lang"`
		Ady      string    `db:"ady"`
		Sort     int       `db:"sort"`
		Text     string    `db:"text"`
		Surat    string    `db:"surat"`
		Wideo    string    `db:"wideo"`
	}
	var subs []sub
	if err := m.old.Select(&subs, `SELECT id, datetime, degisli, lang, ady, sort, text, surat, wideo FROM menu_sub ORDER BY id`); err != nil {
		log.Fatalf("menu_sub: %v", err)
	}
	for _, s := range subs {
		pid, _ := strconv.Atoi(strings.TrimSpace(s.Degisli))
		parent, ok := m.menuMap[fmt.Sprintf("menu_yokarky:%d", pid)]
		if !ok {
			log.Printf("menu_sub #%d (%s): parent %s not found, importing as top-level", s.ID, s.Ady, s.Degisli)
			m.upsertMenu("menu_sub", s.ID, nil, s.Lang, strings.TrimSpace(s.Ady), "", s.Ady, s.Text, pathPtr("docs", s.Surat), pathPtr("wideo_docs", s.Wideo), nil, s.Sort, 1, s.Datetime)
			continue
		}
		m.upsertMenu("menu_sub", s.ID, &parent, s.Lang, strings.TrimSpace(s.Ady), "", s.Ady, s.Text, pathPtr("docs", s.Surat), pathPtr("wideo_docs", s.Wideo), nil, s.Sort, 2, s.Datetime)
	}

	var subsubs []sub
	if err := m.old.Select(&subsubs, `SELECT id, datetime, degisli, lang, ady, sort, text, surat, wideo FROM menu_sub_sub ORDER BY id`); err != nil {
		log.Fatalf("menu_sub_sub: %v", err)
	}
	for _, s := range subsubs {
		pid, _ := strconv.Atoi(strings.TrimSpace(s.Degisli))
		parent, ok := m.menuMap[fmt.Sprintf("menu_sub:%d", pid)]
		if !ok {
			log.Printf("menu_sub_sub #%d: parent %s not found, skipped", s.ID, s.Degisli)
			continue
		}
		m.upsertMenu("menu_sub_sub", s.ID, &parent, s.Lang, strings.TrimSpace(s.Ady), "", s.Ady, s.Text, pathPtr("docs", s.Surat), pathPtr("wideo_docs", s.Wideo), nil, s.Sort, 3, s.Datetime)
	}
}

// ---------- news ----------

func (m *migrator) news() {
	type row struct {
		ID       int       `db:"id"`
		Datetime time.Time `db:"datetime"`
		Ady      string    `db:"ady"`
		Text     string    `db:"text"`
		Lang     string    `db:"lang"`
		Surat    string    `db:"surat"`
		Wideo    string    `db:"wideo"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, datetime, ady, text, lang, surat, wideo FROM habarlar ORDER BY id`); err != nil {
		log.Fatalf("habarlar: %v", err)
	}
	for _, r := range rows {
		lang := utils.DBLang(r.Lang)
		title := strings.TrimSpace(r.Ady)
		slug := utils.Slugify(title)
		var n int
		_ = m.db.Get(&n, `SELECT COUNT(*) FROM news WHERE lang = ? AND slug = ? AND legacy_id <> ?`, lang, slug, r.ID)
		if n > 0 {
			slug = fmt.Sprintf("%s-%d", slug, r.ID)
		}
		content := utils.SanitizeHTML(r.Text)
		excerpt := utils.Excerpt(content, 220)
		image := pathPtr("habarlar", r.Surat)
		video := pathPtr("wideo_habarlar", r.Wideo)
		var id int
		err := m.db.QueryRow(`SELECT id FROM news WHERE legacy_id = ?`, r.ID).Scan(&id)
		if err == nil {
			_, err = m.db.Exec(`UPDATE news SET lang=?, title=?, slug=?, excerpt=?, content=?, image=?, video=?, published_at=? WHERE id=?`,
				lang, title, slug, excerpt, content, image, video, dateOr(r.Datetime), id)
		} else {
			_, err = m.db.Exec(`INSERT INTO news (lang, title, slug, excerpt, content, image, video, published_at, is_published, views, legacy_id, created_at) VALUES (?,?,?,?,?,?,?,?,1,0,?,?)`,
				lang, title, slug, excerpt, content, image, video, dateOr(r.Datetime), r.ID, dateOr(r.Datetime))
		}
		if err != nil {
			log.Printf("news #%d: %v", r.ID, err)
			continue
		}
		m.count("news")
	}
}

// ---------- slides ----------

func (m *migrator) slides() {
	type row struct {
		ID     int    `db:"id"`
		Design string `db:"design"`
		Text1  string `db:"text1"`
		Text2  string `db:"text2"`
		Text3  string `db:"text3"`
		Lang   string `db:"lang"`
		Surat  string `db:"surat"`
		Sort   int    `db:"sort"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, design, text1, text2, text3, lang, surat, sort FROM slide ORDER BY id`); err != nil {
		log.Fatalf("slide: %v", err)
	}
	for _, r := range rows {
		design, _ := strconv.Atoi(strings.TrimSpace(r.Design))
		if design == 0 {
			design = 1
		}
		img := "slides/" + strings.TrimSpace(r.Surat)
		var id int
		err := m.db.QueryRow(`SELECT id FROM slides WHERE legacy_id = ?`, r.ID).Scan(&id)
		if err == nil {
			_, err = m.db.Exec(`UPDATE slides SET lang=?, design=?, title=?, subtitle=?, caption=?, image=?, sort=? WHERE id=?`,
				utils.DBLang(r.Lang), design, r.Text1, r.Text2, r.Text3, img, r.Sort, id)
		} else {
			_, err = m.db.Exec(`INSERT INTO slides (lang, design, title, subtitle, caption, image, sort, is_active, legacy_id) VALUES (?,?,?,?,?,?,?,1,?)`,
				utils.DBLang(r.Lang), design, r.Text1, r.Text2, r.Text3, img, r.Sort, r.ID)
		}
		if err != nil {
			log.Printf("slide #%d: %v", r.ID, err)
			continue
		}
		m.count("slides")
	}
}

// ---------- settings ----------

func (m *migrator) settings() {
	type row struct {
		TitleTM string `db:"page_title_tm"`
		TitleEN string `db:"page_title_eng"`
		TitleRU string `db:"page_title_rus"`
		Tel     string `db:"yokarky_tel"`
		Email   string `db:"yokarky_email"`
		Adresi  string `db:"adresi"`
		Fakul   int    `db:"sanaw_fakul"`
		Hunar   int    `db:"sanaw_hunar"`
		Mug     int    `db:"sanaw_mug"`
		Talyp   int    `db:"sanaw_talyp"`
	}
	var r row
	if err := m.old.Get(&r, `SELECT page_title_tm, page_title_eng, page_title_rus, yokarky_tel, yokarky_email, adresi, sanaw_fakul, sanaw_hunar, sanaw_mug, sanaw_talyp FROM settings WHERE immsettings = 'immsettings' LIMIT 1`); err != nil {
		log.Printf("settings: %v", err)
		return
	}
	addr := utils.StripTags(r.Adresi)
	kv := map[string]string{
		"site_short_title_tm": r.TitleTM, "site_short_title_en": r.TitleEN, "site_short_title_ru": r.TitleRU,
		"phone": strings.TrimSpace(r.Tel), "email": strings.TrimSpace(r.Email),
		"address_tm": addr, "address_en": addr, "address_ru": addr,
		"stat_books": strconv.Itoa(r.Fakul), "stat_specialties": strconv.Itoa(r.Hunar), "stat_teachers": strconv.Itoa(r.Mug), "stat_students": strconv.Itoa(r.Talyp),
	}
	if m.cfg.ExternalNewsToken != "" {
		kv["external_news_token"] = m.cfg.ExternalNewsToken
	}
	for k, v := range kv {
		if _, err := m.db.Exec("INSERT INTO settings (`key`,`value`,`group`) VALUES (?,?,'general') ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", k, v); err != nil {
			log.Printf("setting %s: %v", k, err)
			continue
		}
		m.count("settings")
	}
}

// ---------- contacts ----------

func (m *migrator) contacts() {
	type row struct {
		ID       int       `db:"id"`
		Datetime time.Time `db:"datetime"`
		Ady      string    `db:"ady"`
		Email    string    `db:"email"`
		Message  string    `db:"message"`
		IP       string    `db:"ipadress"`
		Okadym   string    `db:"okadym"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, datetime, ady, email, message, ipadress, okadym FROM contacts ORDER BY id`); err != nil {
		log.Printf("contacts: %v", err)
		return
	}
	for _, r := range rows {
		var id int
		if err := m.db.QueryRow(`SELECT id FROM contacts WHERE legacy_id = ?`, r.ID).Scan(&id); err == nil {
			continue
		}
		if _, err := m.db.Exec(`INSERT INTO contacts (name, email, message, ip, is_read, legacy_id, created_at) VALUES (?,?,?,?,?,?,?)`,
			r.Ady, r.Email, r.Message, r.IP, r.Okadym == "1", r.ID, dateOr(r.Datetime)); err != nil {
			log.Printf("contact #%d: %v", r.ID, err)
			continue
		}
		m.count("contacts")
	}
}

// ---------- media (fayllar) ----------

func kindByExt(name string) string {
	switch strings.ToLower(strings.TrimPrefix(filepath.Ext(name), ".")) {
	case "jpg", "jpeg", "jfif", "png", "gif", "webp", "bmp":
		return "image"
	case "mp4", "webm", "mov", "m4v":
		return "video"
	default:
		return "document"
	}
}

func (m *migrator) media() {
	type row struct {
		ID      int    `db:"id"`
		Gornusi string `db:"gornusi"`
		Fayl    string `db:"fayl"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, gornusi, fayl FROM fayllar ORDER BY id`); err != nil {
		log.Printf("fayllar: %v", err)
		return
	}
	for _, r := range rows {
		path := "files/" + strings.TrimLeft(strings.TrimSpace(r.Fayl), "/")
		kind := kindByExt(path)
		if r.Gornusi == "surat" {
			kind = "image"
		} else if r.Gornusi == "wideo" {
			kind = "video"
		}
		var size int64
		if st, err := os.Stat(filepath.Join(m.oldHTML, "download", filepath.FromSlash(strings.TrimSpace(r.Fayl)))); err == nil {
			size = st.Size()
		}
		if _, err := m.db.Exec(`INSERT INTO media (kind, path, original_name, mime, size, legacy_id) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE legacy_id = VALUES(legacy_id), kind = VALUES(kind)`,
			kind, path, filepath.Base(path), "", size, r.ID); err != nil {
			log.Printf("media #%d: %v", r.ID, err)
			continue
		}
		m.count("media")
	}
}

// ---------- user groups / users / files ----------

func (m *migrator) groups() {
	type row struct {
		ID     int    `db:"id"`
		Ady    string `db:"ady"`
		Bellik string `db:"bellik"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, ady, bellik FROM users_types ORDER BY id`); err != nil {
		log.Printf("users_types: %v", err)
		return
	}
	for _, r := range rows {
		var id int
		err := m.db.QueryRow(`SELECT id FROM user_groups WHERE legacy_id = ?`, r.ID).Scan(&id)
		if err == nil {
			_, err = m.db.Exec(`UPDATE user_groups SET name=?, note=? WHERE id=?`, r.Ady, r.Bellik, id)
		} else {
			var res interface{ LastInsertId() (int64, error) }
			res, err = m.db.Exec(`INSERT INTO user_groups (name, note, legacy_id) VALUES (?,?,?)`, r.Ady, r.Bellik, r.ID)
			if err == nil {
				i64, _ := res.LastInsertId()
				id = int(i64)
			}
		}
		if err != nil {
			log.Printf("group #%d: %v", r.ID, err)
			continue
		}
		m.groupMap[r.ID] = id
		m.count("user_groups")
	}
}

func (m *migrator) users() {
	type row struct {
		ID       int    `db:"id"`
		Degisli  int    `db:"degisli"`
		Username string `db:"username"`
		Password string `db:"password"`
		AdyFam   string `db:"ady_fam"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, degisli, username, password, ady_fam FROM users_auth ORDER BY id`); err != nil {
		log.Printf("users_auth: %v", err)
		return
	}
	for _, r := range rows {
		gid, ok := m.groupMap[r.Degisli]
		if !ok {
			log.Printf("user %s: group %d missing, skipped", r.Username, r.Degisli)
			continue
		}
		var id int
		var cur string
		err := m.db.QueryRow(`SELECT id, password_hash FROM portal_users WHERE legacy_id = ?`, r.ID).Scan(&id, &cur)
		if err == nil {
			hash := cur
			if strings.HasPrefix(cur, "sha1$") {
				hash = utils.LegacySHA1Hash(r.Password)
			}
			_, err = m.db.Exec(`UPDATE portal_users SET group_id=?, username=?, password_hash=?, full_name=? WHERE id=?`, gid, r.Username, hash, r.AdyFam, id)
		} else {
			_, err = m.db.Exec(`INSERT INTO portal_users (group_id, username, password_hash, full_name, is_active, legacy_id) VALUES (?,?,?,?,1,?)`,
				gid, r.Username, utils.LegacySHA1Hash(r.Password), r.AdyFam, r.ID)
		}
		if err != nil {
			log.Printf("user #%d: %v", r.ID, err)
			continue
		}
		m.count("portal_users")
	}
}

func (m *migrator) userFiles() {
	type row struct {
		ID      int       `db:"id"`
		Date    time.Time `db:"date"`
		Degisli int       `db:"degisli"`
		File    string    `db:"file"`
		Bellik  string    `db:"bellik"`
	}
	var rows []row
	if err := m.old.Select(&rows, `SELECT id, date, degisli, file, bellik FROM users_files ORDER BY id`); err != nil {
		log.Printf("users_files: %v", err)
		return
	}
	for _, r := range rows {
		gid, ok := m.groupMap[r.Degisli]
		if !ok {
			log.Printf("user file #%d: group %d missing, skipped", r.ID, r.Degisli)
			continue
		}
		path := "gollanma/" + strings.TrimLeft(strings.TrimSpace(r.File), "/")
		var id int
		err := m.db.QueryRow(`SELECT id FROM user_files WHERE legacy_id = ?`, r.ID).Scan(&id)
		if err == nil {
			_, err = m.db.Exec(`UPDATE user_files SET group_id=?, file=?, original_name=?, note=? WHERE id=?`, gid, path, filepath.Base(path), r.Bellik, id)
		} else {
			_, err = m.db.Exec(`INSERT INTO user_files (group_id, file, original_name, note, legacy_id, created_at) VALUES (?,?,?,?,?,?)`, gid, path, filepath.Base(path), r.Bellik, r.ID, dateOr(r.Date))
		}
		if err != nil {
			log.Printf("user file #%d: %v", r.ID, err)
			continue
		}
		m.count("user_files")
	}
}

// ---------- login logs ----------

func (m *migrator) logs() {
	var already int
	_ = m.db.Get(&already, `SELECT COUNT(*) FROM login_logs WHERE user_agent = 'legacy-import'`)
	if already > 0 {
		log.Printf("login logs already imported (%d rows), skipping", already)
		m.stats["login_logs(skipped)"] = already
		return
	}
	type row struct {
		Username string    `db:"username"`
		Datetime time.Time `db:"datetime"`
		Inorout  string    `db:"inorout"`
	}
	imp := func(table, actor string) {
		var rows []row
		if err := m.old.Select(&rows, `SELECT username, datetime, inorout FROM `+table+` ORDER BY id`); err != nil {
			log.Printf("%s: %v", table, err)
			return
		}
		for _, r := range rows {
			ev := "login"
			if strings.Contains(strings.ToLower(r.Inorout), "out") {
				ev = "logout"
			}
			if _, err := m.db.Exec(`INSERT INTO login_logs (username, actor_type, event, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)`,
				r.Username, actor, ev, "", "legacy-import", dateOr(r.Datetime)); err != nil {
				log.Printf("log: %v", err)
				continue
			}
			m.count("login_logs")
		}
	}
	imp("log_login", "admin")
	imp("log_login_users", "portal")
}

// ---------- files ----------

func copyFile(src, dst string) error {
	if st, err := os.Stat(dst); err == nil {
		if sst, err2 := os.Stat(src); err2 == nil && sst.Size() == st.Size() {
			return nil // already copied
		}
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func (m *migrator) copyTree(src, dstRel string, register bool) {
	if st, err := os.Stat(src); err != nil || !st.IsDir() {
		return
	}
	_ = filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(src, p)
		dstPath := filepath.Join(m.cfg.UploadsDir, dstRel, rel)
		if err := copyFile(p, dstPath); err != nil {
			log.Printf("copy %s: %v", p, err)
			return nil
		}
		m.count("files_copied")
		if register {
			mediaPath := filepath.ToSlash(filepath.Join(dstRel, rel))
			kind := kindByExt(mediaPath)
			_, _ = m.db.Exec(`INSERT IGNORE INTO media (kind, path, original_name, mime, size) VALUES (?,?,?,?,?)`, kind, mediaPath, filepath.Base(mediaPath), "", info.Size())
		}
		return nil
	})
}

func (m *migrator) files() {
	up := filepath.Join(m.oldHTML, "uploads")
	dl := filepath.Join(m.oldHTML, "download")
	for _, d := range []string{"habarlar", "docs", "slides", "wideo_habarlar", "wideo_menu", "wideo_docs"} {
		m.copyTree(filepath.Join(up, d), d, true)
	}
	m.copyTree(filepath.Join(dl, "gollanma"), "gollanma", false)
	entries, _ := os.ReadDir(dl)
	for _, e := range entries {
		if e.IsDir() && e.Name() != "gollanma" {
			m.copyTree(filepath.Join(dl, e.Name()), filepath.Join("files", e.Name()), false)
		}
	}
}

// ---------- summary ----------

func (m *migrator) summary() {
	fmt.Println("\n==== MIGRATION SUMMARY ====")
	for _, k := range []string{"admins", "menus", "news", "slides", "settings", "contacts", "media", "user_groups", "portal_users", "user_files", "login_logs", "login_logs(skipped)", "files_copied"} {
		if v, ok := m.stats[k]; ok {
			fmt.Printf("%-22s %d\n", k, v)
		}
	}
	fmt.Println("\n==== ROW COUNTS (legacy -> new) ====")
	pairs := [][2]string{
		{"admin", "admins"}, {"menu_yokarky+menu_sub+menu_sub_sub", "menus"}, {"habarlar", "news"}, {"slide", "slides"},
		{"contacts", "contacts"}, {"fayllar", "media(legacy_id)"}, {"users_types", "user_groups"}, {"users_auth", "portal_users"},
		{"users_files", "user_files"}, {"log_login+log_login_users", "login_logs"},
	}
	for _, p := range pairs {
		oldN := m.sumOld(p[0])
		var newN int
		q := "SELECT COUNT(*) FROM " + p[1]
		if p[1] == "media(legacy_id)" {
			q = "SELECT COUNT(*) FROM media WHERE legacy_id IS NOT NULL"
		}
		_ = m.db.Get(&newN, q)
		fmt.Printf("%-36s %4d -> %4d\n", p[0], oldN, newN)
	}
}

func (m *migrator) sumOld(tables string) int {
	total := 0
	for _, t := range strings.Split(tables, "+") {
		var n int
		_ = m.old.Get(&n, "SELECT COUNT(*) FROM "+t)
		total += n
	}
	return total
}
