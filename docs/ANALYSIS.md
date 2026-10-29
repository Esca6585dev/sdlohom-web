# SDLOHOM – köne taslamanyň analizi

**Saýt:** https://www.sdlohom.edu.tm/ — Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebi
**Köne stek:** PHP 7/8 (prosedura stilinde, mysqli), MySQL 8, jQuery + Bootstrap 4 "Porto" şablony, aýratyn PHP admin panel (`admin_sdlohom/`).
**Täze stek:** Go 1.27 + Fiber v3.6 (REST API) · Next.js 16 + React 19 + Tailwind 4 (jemgyýetçilik saýt + admin panel) · MySQL/MariaDB.

---

## 1. Köne taslamanyň gurluşy

| Bölüm | Faýl / papka | Näme edýär |
|---|---|---|
| Giriş nokady | `html/index.php` | Sessiýa, dil, kuki-login, `index_sahypa.html`-i çagyrýar |
| Marşrutlaýjy | `includes/index_sahypa.html` | `?page=` parametrine görä şablon saýlaýar (`contacts`, `habarlar`, `habar`, `my`, `ss`, san = menýu id) |
| Menýu | `include_menu_cek.php` | 3 derejeli menýu: `menu_yokarky` → `menu_sub` → `menu_sub_sub` (her dil üçin aýratyn setirler) |
| Habarlar | `sahypa_habarlar2.html`, `sahypa_habar.html`, `index_habarlar_suratly.html` | `habarlar` tablisasy, sahypalama `?sah=`, baş sahypada soňky 6 habar |
| Sahypalar | `sahypa_pages.html` (ýokarky menýu), `sahypa_page.html` (sub), `sahypa_page_ss.html` (sub-sub) | HTML mazmun + surat + wideo |
| Slaýder | `index_slider.html` | `slide` tablisasy (`slides` tablisasy ulanylmaýar – köne institutyň galyndysy) |
| Sanaýjylar | `index_sanayjy.html` | `settings.sanaw_*` (kitap, hünär, mugallym, talyp sany) |
| Daşky täzelikler | `includes/api_news.php`, `api_news_details.php` | merkez.bilim.tm merkezleşdirilen API-den (Bearer token brauzerde açyk!) |
| Habarlaşmak | `sahypa_contact.html` + `captcha.php` | `contacts` tablisasyna ýazýar. **Janly saýtda "Fatal error" berýär** (captcha/GD) |
| Portal | `sahypa_per_login.html`, `sahypa_personal.html` | `users_auth` ulanyjylary toparyna (`users_types`) ugradylan faýllary (`users_files`) görýär |
| Admin | `admin_sdlohom/index.php` + `includes/Admin_*.html` | Kuki esasly login, SHA1 parol, 13 bölüm |
| Diller | `lang/tm.php`, `eng.php`, `rus.php` | UI setirleri; DB-de `lang` = `tm`/`eng`/`rus` |

## 2. Köne baza (`sdlohomdatabase`, 15 tablisa)

| Tablisa | Setir | Täze ýeri | Bellik |
|---|---|---|---|
| `admin` | 2 | `admins` | SHA1 parollar → `sha1$<hex>` görnüşinde saklanýar, ilkinji girişde bcrypt-e geçirilýär |
| `menu_yokarky` | 13 | `menus` (depth=1) | `Moodle` → `external_url` |
| `menu_sub` | 14 | `menus` (depth=2) | hünärler, resminamalar |
| `menu_sub_sub` | 0 | `menus` (depth=3) | |
| `habarlar` | 53 | `news` | slug, excerpt awtomat döredilýär |
| `slide` | 3 | `slides` | |
| `slides` | 4 | — | ulanylmaýar (köne institut), geçirilmeýär |
| `settings` | 1 | `settings` (key/value) | |
| `contacts` | 0 | `contacts` | |
| `fayllar` | 1 | `media` | |
| `users_types` | 2 | `user_groups` | |
| `users_auth` | 0 | `portal_users` | |
| `users_files` | 1 | `user_files` | |
| `log_login` | 259 | `login_logs` (actor=admin) | |
| `log_login_users` | 32 | `login_logs` (actor=portal) | |

Surat ýollary: `habarlar.surat` = `YYYYMMDD/hash.jpg` (`uploads/habarlar/` içinde), `menu_sub.surat` → `uploads/docs/`, `slide.surat` → `uploads/slides/`, wideolar → `uploads/wideo_habarlar|wideo_menu|wideo_docs/`, portal faýllary → `download/gollanma/`.

## 3. Tapylan kemçilikler (düzedildi)

1. **SQL injection** – ähli soraglar setir birikdirmesi bilen (`WHERE id like '$this_id'`). → Täze API-de diňe parametrli soraglar.
2. **Parol howpsuzlygy** – SHA1 duzsuz; kuki-de ulanyjy ady ýatda saklanýar (`SetCookie("sdlohomedutm", username)`) — islendik adam kukini üýtgedip admin bolup bilýär. → JWT + bcrypt, rol esasly rugsat.
3. **Habarlaşmak sahypasy döwük** – janly saýtda `Fatal error`. → Honeypot + rate-limit bilen täze forma.
4. **Daşky API tokeni brauzerde açyk** (`api_news.php`). → Serwer tarapynda proxy + keş.
5. **XSS** – ulanyjy girizen tekstler eskeýp edilmeýär. → React awtomat eskeýp; admin HTML mazmuny sanitizasiýa.
6. **Duplikat/ölü kod** – `functions.php` 2100 setir, 80% başga taslamalardan (bagşy, aýdym, talyp bahalary). → Aýryldy.
7. **Bir dil = aýratyn setir** – menýu/habar terjimeleri biri-birine baglanmaýar. → `lang` sütüni saklandy (maglumat 100% göçürildi), admin panelde dil filtri.
8. **SEO ýok** – URL-ler `./?/HÜNÄRLER/&page=14&in=81`. → `/tm/page/sepagatcylyk-isi`, `/tm/news/<slug>`, sitemap.xml, RSS, meta-taglar.
9. **Analitika ýok** → `page_views` tablisasy, admin dashboard-da gündelik grafik, iň köp okalan sahypalar, enjam/brauzer.
10. **Mobil uýgunlaşma gowşak** → Tailwind responsive dizaýn.

## 4. Goşulan täze mümkinçilikler

- Admin dashboard (sanlar, soňky hatlar, girişler, traffik grafigi)
- Analitika (gündelik görülme, unikal myhman, top sahypalar, enjam, brauzer, referer, iň köp okalan habarlar)
- Media kitaphanasy (surat/wideo/resminama ýüklemek, gözleg)
- Gözleg (habarlar + sahypalar), RSS, sitemap.xml, robots.txt
- Audit log (admin kim näme üýtgetdi), login log (IP, brauzer)
- Rol ulgamy: superadmin / admin / editor
- Habar: çap/garalama, görülme sany, slug, gysga mazmun
- Daşky täzelikler (merkez.bilim.tm) serwer proxy + 10 min keş
- Sazlamalar: sosial ulgamlar, karta, Moodle salgysy, meta description
- Dark mode-a taýýar reňk tokenleri, gök-ýaşyl lukmançylyk palitrasy
