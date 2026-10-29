# PROMPT — SDLOHOM saýtyny PHP-den Go Fiber + Next.js-e doly geçirmek

> Bu resminama taslamany başga bir AI/ýa-da programmist bilen gaýtadan ýerine ýetirmek üçin taýýarlanan doly **prompt + ädim-ädim meýilnama**. Aşakdaky teksti göni prompt hökmünde ulanyp bolýar.

---

## ROL

Sen senior full-stack inženersiň (Go, Fiber v3, MySQL, Next.js 16 App Router, React 19, Tailwind 4, TypeScript). Köne PHP saýtyny täze steke **maglumatlary 100% saklap** geçirýärsiň. Çatda sorag berip garaşma: özbaşdak karar ber, ýalňyşlyk çyksa düzedip täzeden barla, ahyrynda ikisini-de işledip görkez.

## KONTEKST

- Köne saýt: https://www.sdlohom.edu.tm/ — **Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebi**. 3 dil (tm/eng/rus).
- Köne kod: `html/` (PHP, mysqli, Porto/Bootstrap 4 şablony), admin: `html/admin_sdlohom/`.
- Köne baza: `sdlohomdatabase.sql` (MySQL 8 dump, 15 tablisa — gurluşy `docs/ANALYSIS.md`-de).
- Menýu: Baş sahypa · Biz barada · Hünärler (8 hünär: Şepagatçylyk işi, Laboratoriýa anyklaýyş, Fizioterapiýa we dikeldiş, Sanitar feldşer, Farmasiýa, Bejeriş işi (feldşer), Ortopedik stomatologiýa, Akuşerçilik) · Resminamalar · Talyp durmuşy · Moodle (daşky salgy) · Täzelikler · Habarlaşmak · Ulgama gir (portal).
- Baş sahypa: slaýder (3 dil), soňky 6 habar, merkez.bilim.tm-den daşky täzelikler, 4 sanaýjy (kitap, hünär, mugallym, talyp), hünärler kartlary, footer (salgy, telefon, email).

## TALAPLAR

### 1. Backend — Go 1.27 + Fiber v3 (`backend/`)
- Gurluş: `cmd/api` (serwer), `cmd/migrate` (köne bazadan täze baza maglumat göçürmek), `internal/{config,database,models,handlers,middleware,services,utils}`, `migrations/*.sql` (awtomat ulanylýar).
- Täze normalizlenen shema: `admins, menus(parent_id, depth, slug), news(slug, excerpt, views), slides, settings(key/value), contacts, media, user_groups, portal_users, user_files, login_logs, audit_logs, page_views`.
- Howpsuzlyk: diňe parametrli SQL, bcrypt (köne SHA1 parollar `sha1$<hex>` görnüşde saklanyp ilkinji girişde bcrypt-e geçýär), JWT (HS256, 12 sagat), rol (superadmin/admin/editor), rate-limit (login 10/min, contact 5/10min), CORS allowlist, helmet, faýl ýükleme barlagy (MIME + ölçeg), honeypot.
- API kontrakty: `docs/API.md` (JSON envelope `{data, meta}` / `{error}`; `lang=tm|en|ru`; `image` + `image_url`).
- Statik: `/uploads/*` papkasy (köne `html/uploads/*` we `html/download/gollanma` şol ýere göçürilýär).
- Analitika: `POST /analytics/visit` → `page_views` (ip hash, enjam/brauzer/OS user-agent-den), admin üçin gündelik/sagatlyk seriýalar, top sahypalar, referer, iň köp okalan habarlar.
- Daşky täzelikler: merkez.bilim.tm API serwer tarapynda proxy + 10 min keş (token brauzere çykmaýar).
- Audit log: admin CRUD hereketleri ýazylýar.

### 2. Maglumat göçürmek (`backend/cmd/migrate`)
- Çeşme: köne `sdlohomdatabase`; nyşana: täze `sdlohom`. Her tablisa üçin `legacy_id` saklanýar (yzarlanyp bolýar).
- `menu_yokarky` → `menus depth=1`; `menu_sub` → `depth=2` (parent = legacy top id); `menu_sub_sub` → `depth=3`. `Moodle` → `external_url`.
- `habarlar` → `news` (slug = translit(title)+id, excerpt = strip_tags(text) ilkinji 200 harp).
- `slide` → `slides`; `settings` → key/value (adresi HTML-den tekste); `contacts`, `fayllar` → `media`; `users_types` → `user_groups`; `users_auth` → `portal_users`; `users_files` → `user_files`; `log_login` + `log_login_users` → `login_logs`.
- Faýllar: `uploads/habarlar, docs, slides, wideo_*`, `download/gollanma` → `backend/uploads/...` (ýollar DB-de otnositel saklanýar).
- Idempotent: gaýta işledilende `legacy_id` boýunça täzelenýär, dublikat döretmeýär.

### 3. Frontend — Next.js 16 + React 19 + Tailwind 4 + TypeScript (`frontend/`)
- App Router, `app/[locale]/...` (tm/en/ru), `app/admin/...` (dil garaşsyz).
- **Dizaýn:** häzirki zaman, lukmançylyk mekdebi; **gök + ýaşyl palitra** (primary `#0B5FA5`→`#1D7FD1` gök, secondary `#0F9D6B`→`#16A34A` ýaşyl, gradient hero, ak/açyk çal fon, ýumşak kölegeler, `rounded-2xl` kartlar, lucide ikonlar). Mobil-first, erişilebilir (focus halkalary, kontrast), `prefers-color-scheme` taýýar tokenler.
- Jemgyýetçilik sahypalar: baş sahypa (hero slaýder, sanaýjylar, hünärler grid, soňky habarlar, daşky täzelikler, "Biz barada" teaser, CTA), `/news` (gözleg + sahypalama), `/news/[slug]`, `/page/[slug]` (mazmun + çagalar kartlary + gapdal menýu + breadcrumb), `/contact` (forma + karta), `/portal` (login + faýllar), `/search`, 404, `sitemap.xml`, `rss.xml`, `robots.txt`. SEO meta (title/description/og:image), dil çalşyjy.
- Admin panel (`/admin`): login, dashboard (sanlar + 14 günlük grafik + soňky hatlar/girişler), analitika (grafikler), habarlar CRUD (TipTap editor, surat ýükleme, slug, çap/garalama), sahypalar/menýu (agaç, süýräp tertiplemek ýa-da sort), slaýdlar, media kitaphanasy, hatlar (okalan/okalmadyk), portal toparlary/ulanyjylary/faýllary, adminler (rol), sazlamalar (toparlanan forma), loglar, profil (parol çalyşmak). Sidebar + topbar layout, jogapkär tablisalar, toast habarlar, tassyklama modallary.
- API klient: `lib/api.ts` (server + client), token `localStorage` + `Authorization` header; 401-de login sahypa.

### 4. Işletmek we barlamak
- `.env` nusgalary, `README.md` (gurnama, migrasiýa, işletmek), `docker-compose.yml` (mysql + api + web) we `scripts/dev.ps1`.
- Backend: `go build ./... && go vet ./...`, `go run ./cmd/api` (port 8090). Frontend: `npm run build`, `npm run dev`.
- Smoke test: `curl` bilen `/health`, `/menus?lang=tm`, `/news?lang=tm`, `/pages/hunarler`, login → `/admin/dashboard`.
- Ýalňyşlyk çyksa: logy oka, düzet, täzeden işlet. Ähli zat işlänsoň brauzerde görkez: `http://localhost:3002/tm` we `http://localhost:3002/admin` (admin/köne parol).

## ÄDIM-ÄDIM MEÝILNAMA

1. Köne kody we bazany analiz et → `docs/ANALYSIS.md`.
2. API kontraktyny ýaz → `docs/API.md`. Täze shema → `backend/migrations/001_init.sql`.
3. Backend skeleti: config, DB, migrasiýa işlediji, envelope/ýalňyşlyk, JWT, rate-limit, CORS, static.
4. Modeller + repozitoriýalar + handlerler (public → auth → admin).
5. `cmd/migrate`: maglumat + faýl göçürme; işlet, sanlary deňeşdir.
6. Frontend skeleti: Next 16, Tailwind 4, dizaýn tokenleri, layout, i18n sözlükler (köne `lang/*.php`-den).
7. Jemgyýetçilik sahypalar → admin panel.
8. Ikisini işlet, curl + brauzer bilen barla, ýalňyşlyklary düzet.
9. README + deploy faýllary.

## KABUL EDIŞ ŞERTLERI
- Köne bazadaky ähli setirler täze bazada (sanlar deň: 13 menýu, 14 sub, 53 habar, 3 slaýd, 2 admin, 2 topar, 1 faýl, 291 log).
- Köne admin ulanyjylary köne parollary bilen girip bilýär.
- Ähli köne sahypalar täze URL-lerde açylýar; suratlar görünýär.
- `go vet` we `next build` ýalňyşsyz.
- Admin panelde CRUD, ýükleme, analitika işleýär.
