# QA hasabaty — SDLOHOM v2 (2026-10-29)

Doly analiz: awtomat skriptler (curl, headless Chrome/CDP, ESLint, tsc, go vet) + ekran suratlary bilen gözden geçirildi.

## 1. Näme barlandy

| Barlag | Netije |
|---|---|
| Ähli habar (53) we sahypa (27) URL-leri, 3 dilde — `curl` | 77 URL, hemmesi 200 |
| DB-däki surat ýollary diskde barmy (habar, menýu, slaýd) | 0 ýitik faýl |
| 43 sahypa (jemgyýetçilik + admin) brauzerde: konsol ýalňyşlygy, JS exception, 4xx/5xx soraglar, döwük suratlar, gorizontal overflow, `title`/`description`/`og:title`, `h1` sany | 0 ýalňyşlyk (diňe bilgeşleýin 404 synag sahypasy) |
| Mobil (390px) 14 sahypa — overflow, konsol | 0 ýalňyşlyk |
| Admin login brauzerde formany doldurup (E2E) | /admin dashboard açyldy, token saklandy |
| ESLint (react-hooks v7, React Compiler düzgünleri) | 0 problem |
| TypeScript (`tsc --noEmit`) | 0 ýalňyşlyk |
| `next build` | 31 marşrut, üstünlikli |
| `go build` + `go vet` | arassa |
| Frontend howpsuzlyk header-leri | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| API 60+ endpoint (curl): CRUD, ýükleme, rollar, rate-limit, UTF-8, köne SHA1 parol | geçdi |
| Köne ↔ täze baza sanlary | 27 menýu, 53 habar, 3 slaýd, 2 admin, 2 topar, 291 log — deň |

## 2. Tapylan we düzedilen kemçilikler

| # | Kemçilik | Düzediş |
|---|---|---|
| 1 | OS garaňky režimde menýu/tekst görünmeýärdi (CSS token mirasy) | Tokenler `@theme inline`, `<html data-theme>` + tema çalşyjy |
| 2 | Mobilde sahypa gapdala çykýardy (öz `.line-clamp` klasy Tailwind `hidden`-i ýeňýärdi) | Klas aýryldy, ady `2xl`-den görkezilýär |
| 3 | Mobilde habarlaşmak kartlary (uzyn e-poçta) we admin dashboard kartlary overflow | `min-w-0` + `overflow-wrap:anywhere` |
| 4 | Admin ýokarky panel mobilde dar | Ady gysgaldylýar, rol belgisi `md`-den |
| 5 | 6 ESLint `set-state-in-effect` | `useSyncExternalStore` (tema, token), derived state (drawer, loading) |
| 6 | Frontendde howpsuzlyk header-leri ýokdy | `next.config.ts` → `headers()` |
| 7 | merkez.bilim.tm haýal/ýapyk bolanda baş sahypa 10 s garaşýardy, detail 404 berýärdi | Stale-while-revalidate keş, startda gyzdyrma, negatiw keş 2 min, fallback sahypa |
| 8 | Go HTTP klienti merkez.bilim.tm-e TLS handshake timeout berýärdi (IPv6-first/TLS1.3) | IPv4 + TLS 1.2 + HTTP/1.1 transport |
| 9 | Köne HTML mazmunda tab/nbsp boşluklary | `TidyLegacyHTML` (API çykyşynda) |
| 10 | Filtr `<Select className="w-40">` giňligi işlemeýärdi | `w-*` berlende `w-full` aýrylýar |
| 11 | Habar sahypasynda "meňzeş habar" diňe soňkylardy | Ady boýunça söz gabat getirme + doldurma |

## 3. Galan bellikler (kritiki däl)

- merkez.bilim.tm detail jogaby ~120 KB we 3–8 s; ilkinji açylyşda şonça garaşylýar, soň 24 sagat keşde.
- Habar/sahypa HTML mazmuny köne redaktordan gelýär (inline stiller); `prose-legacy` CSS bilen normallaşdyrylýar, täze mazmun TipTap bilen arassa döredilýär.
- Serwere geçirilende `backend/.env`: JWT_SECRET, PUBLIC_URL, CORS_ORIGINS, DB_* üýtgedilmeli; `TRUST_PROXY=1` nginx arkasynda.
- Portal ulanyjysy köne bazada ýok (0 setir) — admin panelden döredilýär.

## 4. Nädip gaýtalamaly

```powershell
cd frontend; npx eslint .; npx tsc --noEmit; npm run build
cd backend;  go vet ./...; go build ./...
# brauzer audit skriptleri (CDP): scratchpad/audit.mjs, diag.mjs, shoot.mjs, logintest.mjs
```
