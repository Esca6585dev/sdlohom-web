// Package models contains database row structs (db tags) and API DTOs (json tags).
package models

import "time"

// ---------- DB rows ----------

type AdminRow struct {
	ID           int        `db:"id"`
	Name         string     `db:"name"`
	Surname      string     `db:"surname"`
	Username     string     `db:"username"`
	PasswordHash string     `db:"password_hash"`
	Role         string     `db:"role"`
	IsActive     bool       `db:"is_active"`
	LastLoginAt  *time.Time `db:"last_login_at"`
	LegacyID     *int       `db:"legacy_id"`
	CreatedAt    time.Time  `db:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"`
}

type MenuRow struct {
	ID          int       `db:"id"`
	ParentID    *int      `db:"parent_id"`
	Lang        string    `db:"lang"`
	Title       string    `db:"title"`
	FullTitle   string    `db:"full_title"`
	Slug        string    `db:"slug"`
	Content     *string   `db:"content"`
	Image       *string   `db:"image"`
	Video       *string   `db:"video"`
	ExternalURL *string   `db:"external_url"`
	Sort        int       `db:"sort"`
	Depth       int       `db:"depth"`
	IsActive    bool      `db:"is_active"`
	ShowInMenu  bool      `db:"show_in_menu"`
	LegacyTable *string   `db:"legacy_table"`
	LegacyID    *int      `db:"legacy_id"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

type NewsRow struct {
	ID          int       `db:"id"`
	Lang        string    `db:"lang"`
	Title       string    `db:"title"`
	Slug        string    `db:"slug"`
	Excerpt     string    `db:"excerpt"`
	Content     *string   `db:"content"`
	Image       *string   `db:"image"`
	Video       *string   `db:"video"`
	PublishedAt time.Time `db:"published_at"`
	IsPublished bool      `db:"is_published"`
	Views       int       `db:"views"`
	LegacyID    *int      `db:"legacy_id"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

type SlideRow struct {
	ID        int       `db:"id"`
	Lang      string    `db:"lang"`
	Design    int       `db:"design"`
	Title     string    `db:"title"`
	Subtitle  string    `db:"subtitle"`
	Caption   string    `db:"caption"`
	Image     string    `db:"image"`
	Link      *string   `db:"link"`
	Sort      int       `db:"sort"`
	IsActive  bool      `db:"is_active"`
	LegacyID  *int      `db:"legacy_id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type ContactRow struct {
	ID        int       `db:"id"`
	Name      string    `db:"name"`
	Email     string    `db:"email"`
	Phone     *string   `db:"phone"`
	Message   string    `db:"message"`
	IP        string    `db:"ip"`
	UserAgent string    `db:"user_agent"`
	IsRead    bool      `db:"is_read"`
	LegacyID  *int      `db:"legacy_id"`
	CreatedAt time.Time `db:"created_at"`
}

type MediaRow struct {
	ID           int       `db:"id"`
	Kind         string    `db:"kind"`
	Path         string    `db:"path"`
	OriginalName string    `db:"original_name"`
	Mime         string    `db:"mime"`
	Size         int64     `db:"size"`
	UploadedBy   *int      `db:"uploaded_by"`
	LegacyID     *int      `db:"legacy_id"`
	CreatedAt    time.Time `db:"created_at"`
}

type UserGroupRow struct {
	ID         int       `db:"id"`
	Name       string    `db:"name"`
	Note       string    `db:"note"`
	LegacyID   *int      `db:"legacy_id"`
	CreatedAt  time.Time `db:"created_at"`
	UsersCount int       `db:"users_count"`
	FilesCount int       `db:"files_count"`
}

type PortalUserRow struct {
	ID           int        `db:"id"`
	GroupID      int        `db:"group_id"`
	GroupName    string     `db:"group_name"`
	Username     string     `db:"username"`
	PasswordHash string     `db:"password_hash"`
	FullName     string     `db:"full_name"`
	IsActive     bool       `db:"is_active"`
	LastLoginAt  *time.Time `db:"last_login_at"`
	LegacyID     *int       `db:"legacy_id"`
	CreatedAt    time.Time  `db:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"`
}

type UserFileRow struct {
	ID           int       `db:"id"`
	GroupID      int       `db:"group_id"`
	GroupName    string    `db:"group_name"`
	File         string    `db:"file"`
	OriginalName string    `db:"original_name"`
	Note         string    `db:"note"`
	LegacyID     *int      `db:"legacy_id"`
	CreatedAt    time.Time `db:"created_at"`
}

type LoginLogRow struct {
	ID        int       `db:"id"`
	Username  string    `db:"username"`
	ActorType string    `db:"actor_type"`
	Event     string    `db:"event"`
	IP        string    `db:"ip"`
	UserAgent string    `db:"user_agent"`
	CreatedAt time.Time `db:"created_at"`
}

type AuditLogRow struct {
	ID            int       `db:"id"`
	AdminID       *int      `db:"admin_id"`
	AdminUsername string    `db:"admin_username"`
	Action        string    `db:"action"`
	Entity        string    `db:"entity"`
	EntityID      *int      `db:"entity_id"`
	Details       *string   `db:"details"`
	IP            string    `db:"ip"`
	CreatedAt     time.Time `db:"created_at"`
}

// ---------- API DTOs ----------

type Ref struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
}

type MenuItem struct {
	ID          int         `json:"id"`
	ParentID    *int        `json:"parent_id"`
	Lang        string      `json:"lang"`
	Title       string      `json:"title"`
	FullTitle   string      `json:"full_title"`
	Slug        string      `json:"slug"`
	Image       *string     `json:"image"`
	ImageURL    *string     `json:"image_url"`
	ExternalURL *string     `json:"external_url"`
	Sort        int         `json:"sort"`
	Depth       int         `json:"depth"`
	IsActive    bool        `json:"is_active"`
	ShowInMenu  bool        `json:"show_in_menu"`
	HasContent  bool        `json:"has_content"`
	Excerpt     string      `json:"excerpt"`
	Children    []*MenuItem `json:"children"`
}

type Page struct {
	MenuItem
	Content     string      `json:"content"`
	Video       *string     `json:"video"`
	VideoURL    *string     `json:"video_url"`
	Parent      *Ref        `json:"parent"`
	Breadcrumbs []Ref       `json:"breadcrumbs"`
	Children    []*MenuItem `json:"children"`
	Siblings    []*MenuItem `json:"siblings"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type Slide struct {
	ID       int     `json:"id"`
	Lang     string  `json:"lang"`
	Design   int     `json:"design"`
	Title    string  `json:"title"`
	Subtitle string  `json:"subtitle"`
	Caption  string  `json:"caption"`
	Image    string  `json:"image"`
	ImageURL string  `json:"image_url"`
	Link     *string `json:"link"`
	Sort     int     `json:"sort"`
	IsActive bool    `json:"is_active"`
}

type NewsItem struct {
	ID          int       `json:"id"`
	Lang        string    `json:"lang"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug"`
	Excerpt     string    `json:"excerpt"`
	Image       *string   `json:"image"`
	ImageURL    *string   `json:"image_url"`
	Video       *string   `json:"video"`
	VideoURL    *string   `json:"video_url"`
	PublishedAt time.Time `json:"published_at"`
	IsPublished bool      `json:"is_published"`
	Views       int       `json:"views"`
}

type NewsRef struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

type News struct {
	NewsItem
	Content   string     `json:"content"`
	Prev      *NewsRef   `json:"prev"`
	Next      *NewsRef   `json:"next"`
	Related   []NewsItem `json:"related"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type PublicSettings struct {
	SiteTitle           string  `json:"site_title"`
	Phone               string  `json:"phone"`
	Email               string  `json:"email"`
	Address             string  `json:"address"`
	MetaDescription     string  `json:"meta_description"`
	Logo                *string `json:"logo"`
	LogoURL             *string `json:"logo_url"`
	MoodleURL           string  `json:"moodle_url"`
	MapURL              string  `json:"map_url"`
	Social              Social  `json:"social"`
	Stats               Stats   `json:"stats"`
	ExternalNewsEnabled bool    `json:"external_news_enabled"`
}

type Social struct {
	Facebook  string `json:"facebook"`
	Instagram string `json:"instagram"`
	YouTube   string `json:"youtube"`
	Telegram  string `json:"telegram"`
}

type Stats struct {
	Books       int `json:"books"`
	Specialties int `json:"specialties"`
	Teachers    int `json:"teachers"`
	Students    int `json:"students"`
}

type Contact struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     *string   `json:"phone"`
	Message   string    `json:"message"`
	IP        string    `json:"ip"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type Media struct {
	ID           int       `json:"id"`
	Kind         string    `json:"kind"`
	Path         string    `json:"path"`
	URL          string    `json:"url"`
	OriginalName string    `json:"original_name"`
	Mime         string    `json:"mime"`
	Size         int64     `json:"size"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserGroup struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	Note       string    `json:"note"`
	UsersCount int       `json:"users_count"`
	FilesCount int       `json:"files_count"`
	CreatedAt  time.Time `json:"created_at"`
}

type PortalUser struct {
	ID          int        `json:"id"`
	GroupID     int        `json:"group_id"`
	GroupName   string     `json:"group_name"`
	Username    string     `json:"username"`
	FullName    string     `json:"full_name"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type UserFile struct {
	ID           int       `json:"id"`
	GroupID      int       `json:"group_id"`
	GroupName    string    `json:"group_name"`
	File         string    `json:"file"`
	FileURL      string    `json:"file_url"`
	OriginalName string    `json:"original_name"`
	Note         string    `json:"note"`
	CreatedAt    time.Time `json:"created_at"`
}

type Admin struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	Surname     string     `json:"surname"`
	Username    string     `json:"username"`
	Role        string     `json:"role"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type LoginLog struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	ActorType string    `json:"actor_type"`
	Event     string    `json:"event"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

type AuditLog struct {
	ID            int       `json:"id"`
	AdminID       *int      `json:"admin_id"`
	AdminUsername string    `json:"admin_username"`
	Action        string    `json:"action"`
	Entity        string    `json:"entity"`
	EntityID      *int      `json:"entity_id"`
	Details       string    `json:"details"`
	IP            string    `json:"ip"`
	CreatedAt     time.Time `json:"created_at"`
}

type ExternalNews struct {
	ID               int     `json:"id"`
	Title            string  `json:"title"`
	ShortDescription string  `json:"short_description"`
	Image            *string `json:"image"`
	URL              string  `json:"url"`
	PublishedAt      *string `json:"published_at"`
}

// Analytics DTOs

type DailyPoint struct {
	Date   string `json:"date" db:"date"`
	Views  int    `json:"views" db:"views"`
	Unique int    `json:"unique" db:"uniq"`
}
type HourlyPoint struct {
	Hour  int `json:"hour" db:"hour"`
	Views int `json:"views" db:"views"`
}
type KeyCount struct {
	Key   string `json:"-" db:"k"`
	Views int    `json:"views" db:"views"`
}
type PathCount struct {
	Path  string `json:"path" db:"k"`
	Views int    `json:"views" db:"views"`
}
type DeviceCount struct {
	Device string `json:"device" db:"k"`
	Views  int    `json:"views" db:"views"`
}
type BrowserCount struct {
	Browser string `json:"browser" db:"k"`
	Views   int    `json:"views" db:"views"`
}
type OSCount struct {
	OS    string `json:"os" db:"k"`
	Views int    `json:"views" db:"views"`
}
type ReferrerCount struct {
	Referrer string `json:"referrer" db:"k"`
	Views    int    `json:"views" db:"views"`
}
type TopNews struct {
	ID    int    `json:"id" db:"id"`
	Title string `json:"title" db:"title"`
	Slug  string `json:"slug" db:"slug"`
	Views int    `json:"views" db:"views"`
}

type VisitSummary struct {
	Today        int `json:"today"`
	Yesterday    int `json:"yesterday"`
	Last7        int `json:"last7"`
	Last30       int `json:"last30"`
	Total        int `json:"total"`
	UniqueToday  int `json:"unique_today"`
	UniquePeriod int `json:"unique_period"`
}

type Analytics struct {
	Summary   VisitSummary    `json:"summary"`
	Daily     []DailyPoint    `json:"daily"`
	TopPages  []PathCount     `json:"top_pages"`
	Devices   []DeviceCount   `json:"devices"`
	Browsers  []BrowserCount  `json:"browsers"`
	OS        []OSCount       `json:"os"`
	Referrers []ReferrerCount `json:"referrers"`
	TopNews   []TopNews       `json:"top_news"`
	Hourly    []HourlyPoint   `json:"hourly"`
}

type DashboardCounts struct {
	News           int `json:"news"`
	Pages          int `json:"pages"`
	Slides         int `json:"slides"`
	ContactsUnread int `json:"contacts_unread"`
	ContactsTotal  int `json:"contacts_total"`
	Users          int `json:"users"`
	Media          int `json:"media"`
	Admins         int `json:"admins"`
}

type DashboardVisits struct {
	Today       int `json:"today"`
	Yesterday   int `json:"yesterday"`
	Last7       int `json:"last7"`
	Last30      int `json:"last30"`
	UniqueToday int `json:"unique_today"`
}

type Dashboard struct {
	Counts         DashboardCounts `json:"counts"`
	Visits         DashboardVisits `json:"visits"`
	RecentContacts []Contact       `json:"recent_contacts"`
	RecentNews     []NewsItem      `json:"recent_news"`
	RecentLogins   []LoginLog      `json:"recent_logins"`
	Daily          []DailyPoint    `json:"daily"`
}

// ---------- Banners ----------

type BannerRow struct {
	ID         int        `db:"id"`
	Position   string     `db:"position"`
	Lang       string     `db:"lang"`
	Title      string     `db:"title"`
	Image      string     `db:"image"`
	Link       *string    `db:"link"`
	OpenNewTab bool       `db:"open_new_tab"`
	Sort       int        `db:"sort"`
	IsActive   bool       `db:"is_active"`
	Clicks     int        `db:"clicks"`
	StartsAt   *time.Time `db:"starts_at"`
	EndsAt     *time.Time `db:"ends_at"`
	CreatedAt  time.Time  `db:"created_at"`
	UpdatedAt  time.Time  `db:"updated_at"`
}

type Banner struct {
	ID         int        `json:"id"`
	Position   string     `json:"position"`
	Lang       string     `json:"lang"` // "" = all languages
	Title      string     `json:"title"`
	Image      string     `json:"image"`
	ImageURL   string     `json:"image_url"`
	Link       *string    `json:"link"`
	OpenNewTab bool       `json:"open_new_tab"`
	Sort       int        `json:"sort"`
	IsActive   bool       `json:"is_active"`
	Clicks     int        `json:"clicks"`
	StartsAt   *time.Time `json:"starts_at"`
	EndsAt     *time.Time `json:"ends_at"`
	CreatedAt  time.Time  `json:"created_at"`
}
