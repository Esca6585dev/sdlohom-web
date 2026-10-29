# SDLOHOM v2 — Go Fiber + Next.js

Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebiniň web saýtynyň täze wersiýasy.
Köne PHP saýt (`html/`) doly analiz edilip, **Go 1.27 + Fiber v3** backend, **Next.js 16 + React 19 + Tailwind 4** frontend we häzirki zaman admin panel bilen täzeden ýazyldy. Köne bazadaky maglumatlaryň 100%-i täze shema göçürildi.

```
sdlohom-v2/
├── backend/          Go Fiber REST API (port 8090)
│   ├── cmd/api       serwer
│   ├── cmd/migrate   köne bazadan (sdlohomdatabase) täze baza (sdlohom) maglumat + faýl göçürmek
│   ├── cmd/adminctl  admin hasaby döretmek / parol täzelemek
│   ├── internal/     config, database, store (SQL), handlers, middleware, router
│   ├── migrations/   001_init.sql (awtomat ulanylýar)
│   └── uploads/      suratlar, wideolar, resminamalar (/uploads/* hökmünde berilýär)
├── frontend/         Next.js (port 3002): jemgyýetçilik saýt (/tm, /en, /ru) + admin panel (/admin)
├── docs/             ANALYSIS.md (köne taslamanyň analizi), PROMPT.md (doly tehniki tabşyryk), API.md (API kontrakty)
├── database/         köne dump nusgasy
├── scripts/          dev.ps1 (ikisini bile işletmek)
└── docker-compose.yml
```

## Talaplar
- Go 1.27+, Node.js 22+ (24 synagdan geçdi), MySQL 8 / MariaDB 10.4+ (XAMPP bolýar).

## 1. Baza we migrasiýa
```powershell
cd backend
copy .env.example .env          # DB_USER/DB_PASS, JWT_SECRET, PUBLIC_URL düzediň
# köne dumpy import ediň (MariaDB üçin utf8mb4_0900_ai_ci -> utf8mb4_unicode_ci çalşyň):
mysql -u root < ..\database\sdlohomdatabase.sql
go run ./cmd/migrate            # täze "sdlohom" bazasyny döredýär, shemany gurýar, maglumatlary + faýllary göçürýär
```
`migrate` idempotent — gaýta işledilende `legacy_id` boýunça täzeleýär, dublikat döretmeýär. Netijede legacy ↔ täze sanlar deňeşdirilip çap edilýär.

Admin hasaby: köne adminler köne parollary bilen girýär (SHA1 → ilkinji girişde bcrypt-e geçýär). Täze superadmin döretmek:
```powershell
go run ./cmd/adminctl -user superadmin -password "GüýçliParol123" -role superadmin
```

## 2. Backend
```powershell
cd backend
go run ./cmd/api                # http://localhost:8090  (health: /api/v1/health)
```
Gurluş we API: `docs/API.md`. Rollar: superadmin / admin / editor. Rate-limit: login 10/min, habarlaşmak 5/10min.

## 3. Frontend
```powershell
cd frontend
copy .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
npm install
npm run dev                     # http://localhost:3002/tm   admin: http://localhost:3002/admin
npm run build && npm start      # production
```

## 4. Bir buýruk bilen (Windows)
```powershell
.\scripts\dev.ps1
```

## 5. Docker
```bash
docker compose up -d --build    # mysql:8 + api + web
```

## Täze mümkinçilikler (köne saýtda ýok)
Admin dashboard · bannerlar/reklama bloklary (habar gapdaly, sahypa gapdaly, baş sahypa; dil, sene aralygy, basylma sany) · analitika (gündelik/sagatlyk görülme, unikal myhman, top sahypalar, enjam/brauzer/OS, referer, iň köp okalan habarlar) · media kitaphanasy · gözleg · RSS + sitemap + robots · SEO slug/meta · audit log · login log (IP, brauzer) · rol ulgamy · habar garalama/çap · daşky täzelikler (merkez.bilim.tm) serwer proxy · sazlamalarda sosial ulgamlar, karta, Moodle, meta description · honeypot + rate-limit bilen howpsuz habarlaşma formasy.

## Düzedilen kemçilikler
SQL injection (ähli soraglar setir birikdirme bilen) · SHA1 duzsuz parol + kuki esasly "giriş" · janly saýtda döwük habarlaşmak sahypasy (Fatal error) · brauzere çykýan daşky API tokeni · XSS · ulanylmaýan 2000 setir kod.

## 6. Serwere ýerleşdirmek (sdlohom.edu.tm)
Doly gollanma: [`deploy/README.md`](deploy/README.md) — nginx konfigi, systemd hyzmatlary, `deploy/deploy.sh` (git pull → build → restart), `.env.production.example` nusgalary.
Repo: https://github.com/Esca6585dev/sdlohom-web . Baza dumplary we `.env` faýllary repo-a goşulmaýar (`.gitignore`), olar serwere aýratyn geçirilýär.
