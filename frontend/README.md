# SDLOHOM frontend — Next.js 16 + React 19 + Tailwind 4

```powershell
copy .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
npm install
npm run dev                      # http://localhost:3002
npm run build && npm start       # production
```

## Marşrutlar

| Jemgyýetçilik (`/tm`, `/en`, `/ru`) | Admin (`/admin`) |
|---|---|
| `/[locale]` baş sahypa (slaýder, sanaýjylar, hünärler, habarlar, daşky täzelikler, Moodle CTA) | `/admin/login` |
| `/[locale]/news`, `/[locale]/news/[slug]` | `/admin` dashboard, `/admin/analytics` |
| `/[locale]/page/[slug]` (menýu sahypalary, 3 dereje) | `/admin/news`, `/admin/news/new`, `/admin/news/[id]` |
| `/[locale]/contact` | `/admin/pages`, `/admin/pages/new`, `/admin/pages/[id]` |
| `/[locale]/portal` (talyp portaly) | `/admin/slides`, `/admin/media`, `/admin/contacts` |
| `/[locale]/search?q=` | `/admin/portal/groups`, `/admin/portal/users`, `/admin/portal/files` |
| `/[locale]/external-news/[id]` | `/admin/admins`, `/admin/settings`, `/admin/logs`, `/admin/profile` |
| `/[locale]/rss.xml`, `/sitemap.xml`, `/robots.txt` | |

## Gurluş
- `app/[locale]/…` — serwer komponentleri, API-den `lib/api.ts` (`safeGet`/`safeList`) bilen maglumat alýar; backend ýapyk bolsa boş ýagdaý görkezýär.
- `app/admin/…` — client komponentleri; token `localStorage` (`sdlohom_admin_token`), `components/admin/AuthProvider.tsx` 401-de login sahypasyna ugradýar.
- `lib/i18n/dictionaries.ts` — TM/EN/RU UI setirleri (köne `lang/*.php`-den geçirildi).
- `components/site/*` — jemgyýetçilik UI, `components/admin/*` — admin UI kit (Button, Modal, Table, Toast, RichTextEditor (TipTap), Uploader).
- `proxy.ts` — `/` → `/tm`, köne PHP salgylary → `/tm/...`.
- Dizaýn tokenleri: `app/globals.css` (`brand-*` gök, `accent-*` ýaşyl, `prose-legacy` köne HTML mazmun üçin).
