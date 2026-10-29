# SDLOHOM API v1 — kontrakt (Go Fiber backend <-> Next.js frontend)

Base URL (dev): `http://localhost:8090/api/v1`  · Uploads: `http://localhost:8090/uploads/<path>`
Env (frontend): `NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1`, `API_URL` (server-side, same value).

## Conventions
- JSON only. Success: `{ "data": <payload>, "meta"?: {...} }`. Error: `{ "error": { "code": "not_found" | "validation" | "unauthorized" | "forbidden" | "rate_limited" | "conflict" | "internal", "message": "...", "fields"?: { "field": "msg" } } }` with matching HTTP status (404/422/401/403/429/409/500).
- `lang` query param: `tm` | `en` | `ru` (also accepts legacy `eng`/`rus`). API always returns `lang` as `tm|en|ru`. Default `tm`.
- Pagination: `?page=1&limit=12` -> `meta: { page, limit, total, total_pages }`.
- Every entity with a file has `image` (relative path, e.g. `habarlar/20260905/x.jpg`) and `image_url` (absolute URL or `null`); same for `video`/`video_url`, `file`/`file_url`.
- Dates: ISO 8601 strings (`2026-09-05T09:00:00+05:00`).
- Admin routes require header `Authorization: Bearer <jwt>` (admin token). Portal routes require portal token.
- IDs are integers. Booleans are JSON booleans.

## Types
```ts
type Lang = 'tm' | 'en' | 'ru';
interface MenuItem { id:number; parent_id:number|null; lang:Lang; title:string; full_title:string; slug:string; image:string|null; image_url:string|null; external_url:string|null; sort:number; depth:1|2|3; is_active:boolean; show_in_menu:boolean; has_content:boolean; excerpt:string; children:MenuItem[] }
interface Page extends Omit<MenuItem,'children'> { content:string; video:string|null; video_url:string|null; parent:{id:number;title:string;slug:string}|null; breadcrumbs:{id:number;title:string;slug:string}[]; children:MenuItem[]; siblings:MenuItem[]; updated_at:string }
interface Slide { id:number; lang:Lang; design:number; title:string; subtitle:string; caption:string; image:string; image_url:string; link:string|null; sort:number; is_active:boolean }
interface NewsItem { id:number; lang:Lang; title:string; slug:string; excerpt:string; image:string|null; image_url:string|null; video:string|null; video_url:string|null; published_at:string; is_published:boolean; views:number }
interface News extends NewsItem { content:string; prev:{slug:string;title:string}|null; next:{slug:string;title:string}|null; related:NewsItem[]; updated_at:string }
interface PublicSettings { site_title:string; phone:string; email:string; address:string; meta_description:string; logo:string|null; logo_url:string|null; moodle_url:string; map_url:string; social:{facebook:string;instagram:string;youtube:string;telegram:string}; stats:{books:number;specialties:number;teachers:number;students:number}; external_news_enabled:boolean }
interface Contact { id:number; name:string; email:string; phone:string|null; message:string; ip:string; is_read:boolean; created_at:string }
interface Media { id:number; kind:'image'|'video'|'document'; path:string; url:string; original_name:string; mime:string; size:number; created_at:string }
interface UserGroup { id:number; name:string; note:string; users_count:number; files_count:number; created_at:string }
interface PortalUser { id:number; group_id:number; group_name:string; username:string; full_name:string; is_active:boolean; last_login_at:string|null; created_at:string }
interface UserFile { id:number; group_id:number; group_name:string; file:string; file_url:string; original_name:string; note:string; created_at:string }
interface Admin { id:number; name:string; surname:string; username:string; role:'superadmin'|'admin'|'editor'; is_active:boolean; last_login_at:string|null; created_at:string }
interface LoginLog { id:number; username:string; actor_type:'admin'|'portal'; event:'login'|'logout'|'failed'; ip:string; user_agent:string; created_at:string }
interface AuditLog { id:number; admin_id:number|null; admin_username:string; action:string; entity:string; entity_id:number|null; details:string; ip:string; created_at:string }
interface ExternalNews { id:number; title:string; short_description:string; image:string|null; url:string; published_at:string|null }
```

## Public endpoints
| Method | Path | Query/Body | Returns |
|---|---|---|---|
| GET | `/health` | | `{data:{status:'ok',time}}` |
| GET | `/settings` | `lang` | `PublicSettings` |
| GET | `/menus` | `lang` | `MenuItem[]` (tree, active + show_in_menu only, sorted by sort) |
| GET | `/pages/:slug` | `lang` | `Page` (404 if missing/inactive) |
| GET | `/pages/id/:id` | | `Page` |
| GET | `/slides` | `lang` | `Slide[]` (active, sorted) |
| GET | `/news` | `lang, page, limit, q` | `NewsItem[]` + meta (published only, newest first) |
| GET | `/news/latest` | `lang, limit=6` | `NewsItem[]` |
| GET | `/news/:slug` | `lang` | `News` (increments views) |
| GET | `/search` | `lang, q` | `{news:NewsItem[], pages:MenuItem[]}` |
| GET | `/external-news` | `lang, limit=8` | `ExternalNews[]` (server proxy to merkez.bilim.tm, cached 10 min; `[]` on failure) |
| POST | `/contact` | `{name,email,phone?,message,website?}` (`website` is a honeypot, must be empty) | `{data:{id}}` 201; 429 if >5 per 10 min per IP |
| POST | `/analytics/visit` | `{path,locale,referrer?,visitor_id?}` | 204 |

## Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/admin/login` | `{username,password}` | `{token, expires_at, admin:Admin}`; 401 on failure; rate-limited 10/min |
| GET | `/auth/admin/me` | | `Admin` |
| POST | `/auth/admin/logout` | | 204 (logs event) |
| POST | `/auth/admin/change-password` | `{current_password,new_password}` | 204 |
| POST | `/auth/portal/login` | `{username,password}` | `{token, expires_at, user:PortalUser}` |
| GET | `/portal/me` | | `PortalUser` |
| GET | `/portal/files` | | `UserFile[]` (files of the user's group) |

## Admin endpoints (prefix `/admin`, admin JWT)
| Method | Path | Body/Query | Returns |
|---|---|---|---|
| GET | `/dashboard` | | `{counts:{news,pages,slides,contacts_unread,contacts_total,users,media,admins}, visits:{today,yesterday,last7,last30,unique_today}, recent_contacts:Contact[], recent_news:NewsItem[], recent_logins:LoginLog[], daily:{date,views,unique}[] (14 days)}` |
| GET | `/analytics` | `days=30` | `{summary:{today,yesterday,last7,last30,total,unique_today,unique_period}, daily:{date,views,unique}[], top_pages:{path,views}[], devices:{device,views}[], browsers:{browser,views}[], os:{os,views}[], referrers:{referrer,views}[], top_news:{id,title,slug,views}[], hourly:{hour,views}[]}` |
| GET | `/news` | `lang?, page, limit, q, published?` | `NewsItem[]` + meta (all, incl. drafts) |
| GET | `/news/:id` | | `News` |
| POST | `/news` | `{lang,title,slug?,excerpt?,content,image?,video?,published_at?,is_published}` | `News` 201 |
| PUT | `/news/:id` | same (partial ok) | `News` |
| DELETE | `/news/:id` | | 204 |
| GET | `/menus` | `lang?` | `MenuItem[]` flat (all, incl. inactive; with `parent_id`, `depth`, `has_content`) |
| GET | `/menus/:id` | | `Page` (content included regardless of active) |
| POST | `/menus` | `{lang,parent_id?,title,full_title?,slug?,content?,image?,video?,external_url?,sort,is_active,show_in_menu}` | `Page` 201 |
| PUT | `/menus/:id` | same | `Page` |
| DELETE | `/menus/:id` | | 204 (cascades children) |
| PUT | `/menus/reorder` | `{items:[{id,sort,parent_id}]}` | 204 |
| GET | `/slides` | `lang?` | `Slide[]` |
| POST | `/slides` | `{lang,design,title,subtitle,caption,image,link?,sort,is_active}` | `Slide` |
| PUT | `/slides/:id` | | `Slide` |
| DELETE | `/slides/:id` | | 204 |
| GET | `/settings` | | `{ [key:string]: string }` (all keys) |
| PUT | `/settings` | `{ [key:string]: string }` | same |
| GET | `/contacts` | `page, limit, unread?` | `Contact[]` + meta |
| PATCH | `/contacts/:id` | `{is_read}` | `Contact` |
| DELETE | `/contacts/:id` | | 204 |
| GET | `/media` | `kind?, page, limit, q` | `Media[]` + meta |
| POST | `/media/upload` | multipart `file`; query `kind=image|video|document`, `folder=habarlar|docs|slides|wideo_habarlar|wideo_menu|gollanma|files|logo` | `Media` 201 |
| DELETE | `/media/:id` | | 204 |
| GET | `/user-groups` | | `UserGroup[]` |
| POST | `/user-groups` | `{name,note}` | `UserGroup` |
| PUT | `/user-groups/:id` | | `UserGroup` |
| DELETE | `/user-groups/:id` | | 204 |
| GET | `/users` | `page, limit, q, group_id?` | `PortalUser[]` + meta |
| POST | `/users` | `{group_id,username,password,full_name,is_active}` | `PortalUser` |
| PUT | `/users/:id` | same (`password` optional) | `PortalUser` |
| DELETE | `/users/:id` | | 204 |
| GET | `/user-files` | `group_id?, page, limit` | `UserFile[]` + meta |
| POST | `/user-files` | `{group_id,file,original_name?,note}` | `UserFile` |
| PUT | `/user-files/:id` | | `UserFile` |
| DELETE | `/user-files/:id` | | 204 |
| GET | `/admins` | | `Admin[]` (superadmin) |
| POST | `/admins` | `{name,surname,username,password,role,is_active}` | `Admin` (superadmin) |
| PUT | `/admins/:id` | same (`password` optional) | `Admin` (superadmin) |
| DELETE | `/admins/:id` | | 204 (superadmin, not self) |
| GET | `/logs/login` | `page, limit, actor_type?` | `LoginLog[]` + meta |
| GET | `/logs/audit` | `page, limit` | `AuditLog[]` + meta |

## Settings keys
`site_title_tm, site_title_en, site_title_ru, phone, email, address_tm, address_en, address_ru, meta_description_tm, meta_description_en, meta_description_ru, logo, stat_books, stat_specialties, stat_teachers, stat_students, facebook, instagram, youtube, telegram, moodle_url, map_url, external_news_enabled ("1"/"0"), external_news_url, external_news_token`

Roles: `superadmin` = everything; `admin` = everything except `/admins` CRUD; `editor` = content only (news, menus, slides, media, contacts read), dashboard read, no settings/users/admins/logs.

## Banners (reklama / promo bloklary)
| Method | Path | Query/Body | Returns |
|---|---|---|---|
| GET | `/banners` | `position=news_sidebar|page_sidebar|home`, `lang` | `Banner[]` (active, in date window, lang-specific + all-language) |
| POST | `/banners/:id/click` | | 204 (click counter) |
| GET | `/admin/banners` | `position?` | `{items:Banner[], positions:string[]}` |
| POST | `/admin/banners` | `{position,lang("" = all),title,image,link?,open_new_tab,sort,is_active,starts_at?,ends_at?}` | `Banner` 201 |
| PUT | `/admin/banners/:id` | same (+ `clear_dates:true`) | `Banner` |
| DELETE | `/admin/banners/:id` | | 204 |

`interface Banner { id; position; lang:''|'tm'|'en'|'ru'; title; image; image_url; link:string|null; open_new_tab; sort; is_active; clicks; starts_at:string|null; ends_at:string|null; created_at }`
