export type Lang = "tm" | "en" | "ru";

export interface MenuItem {
  id: number;
  parent_id: number | null;
  lang: Lang;
  title: string;
  full_title: string;
  slug: string;
  image: string | null;
  image_url: string | null;
  external_url: string | null;
  sort: number;
  depth: 1 | 2 | 3;
  is_active: boolean;
  show_in_menu: boolean;
  has_content: boolean;
  excerpt: string;
  children: MenuItem[];
}

export interface PageRef {
  id: number;
  title: string;
  slug: string;
}

export interface Page extends Omit<MenuItem, "children"> {
  content: string;
  video: string | null;
  video_url: string | null;
  parent: PageRef | null;
  breadcrumbs: PageRef[];
  children: MenuItem[];
  siblings: MenuItem[];
  updated_at: string;
}

export interface Slide {
  id: number;
  lang: Lang;
  design: number;
  title: string;
  subtitle: string;
  caption: string;
  image: string;
  image_url: string;
  link: string | null;
  sort: number;
  is_active: boolean;
}

export interface NewsItem {
  id: number;
  lang: Lang;
  title: string;
  slug: string;
  excerpt: string;
  image: string | null;
  image_url: string | null;
  video: string | null;
  video_url: string | null;
  published_at: string;
  is_published: boolean;
  views: number;
}

export interface News extends NewsItem {
  content: string;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  related: NewsItem[];
  updated_at: string;
}

export interface PublicSettings {
  site_title: string;
  phone: string;
  email: string;
  address: string;
  meta_description: string;
  logo: string | null;
  logo_url: string | null;
  moodle_url: string;
  map_url: string;
  social: { facebook: string; instagram: string; youtube: string; telegram: string };
  stats: { books: number; specialties: number; teachers: number; students: number };
  external_news_enabled: boolean;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  ip: string;
  is_read: boolean;
  created_at: string;
}

export interface Media {
  id: number;
  kind: "image" | "video" | "document";
  path: string;
  url: string;
  original_name: string;
  mime: string;
  size: number;
  created_at: string;
}

export interface UserGroup {
  id: number;
  name: string;
  note: string;
  users_count: number;
  files_count: number;
  created_at: string;
}

export interface PortalUser {
  id: number;
  group_id: number;
  group_name: string;
  username: string;
  full_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface UserFile {
  id: number;
  group_id: number;
  group_name: string;
  file: string;
  file_url: string;
  original_name: string;
  note: string;
  created_at: string;
}

export type AdminRole = "superadmin" | "admin" | "editor";

export interface Admin {
  id: number;
  name: string;
  surname: string;
  username: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginLog {
  id: number;
  username: string;
  actor_type: "admin" | "portal";
  event: "login" | "logout" | "failed";
  ip: string;
  user_agent: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number | null;
  admin_username: string;
  action: string;
  entity: string;
  entity_id: number | null;
  details: string;
  ip: string;
  created_at: string;
}

export interface ExternalNews {
  id: number;
  title: string;
  short_description: string;
  image: string | null;
  url: string;
  published_at: string | null;
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: Meta;
}

export interface DailyPoint {
  date: string;
  views: number;
  unique: number;
}

export interface Dashboard {
  counts: {
    news: number;
    pages: number;
    slides: number;
    contacts_unread: number;
    contacts_total: number;
    users: number;
    media: number;
    admins: number;
  };
  visits: { today: number; yesterday: number; last7: number; last30: number; unique_today: number };
  recent_contacts: Contact[];
  recent_news: NewsItem[];
  recent_logins: LoginLog[];
  daily: DailyPoint[];
}

export interface Analytics {
  summary: {
    today: number;
    yesterday: number;
    last7: number;
    last30: number;
    total: number;
    unique_today: number;
    unique_period: number;
  };
  daily: DailyPoint[];
  top_pages: { path: string; views: number }[];
  devices: { device: string; views: number }[];
  browsers: { browser: string; views: number }[];
  os: { os: string; views: number }[];
  referrers: { referrer: string; views: number }[];
  top_news: { id: number; title: string; slug: string; views: number }[];
  hourly: { hour: number; views: number }[];
}

export interface AdminLoginResponse {
  token: string;
  expires_at: string;
  admin: Admin;
}

export interface PortalLoginResponse {
  token: string;
  expires_at: string;
  user: PortalUser;
}

export type SettingsMap = Record<string, string>;

export type BannerPosition = "news_sidebar" | "page_sidebar" | "home";

export interface Banner {
  id: number;
  position: BannerPosition;
  lang: Lang | "";
  title: string;
  image: string;
  image_url: string;
  link: string | null;
  open_new_tab: boolean;
  sort: number;
  is_active: boolean;
  clicks: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}
