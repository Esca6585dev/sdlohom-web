import { safeList } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { FALLBACK_SETTINGS } from "@/lib/site";
import { safeGet } from "@/lib/api";
import type { NewsItem, PublicSettings } from "@/lib/types";
import { SITE_URL } from "@/lib/utils";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const [settings, news] = await Promise.all([
    safeGet<PublicSettings>("/settings", FALLBACK_SETTINGS, { lang: locale }),
    safeList<NewsItem>("/news", { lang: locale, query: { limit: 30 } }),
  ]);
  const items = news.data
    .map(
      (n) => `<item>
  <title>${esc(n.title)}</title>
  <link>${SITE_URL}/${locale}/news/${n.slug}</link>
  <guid isPermaLink="true">${SITE_URL}/${locale}/news/${n.slug}</guid>
  <pubDate>${new Date(n.published_at).toUTCString()}</pubDate>
  <description>${esc(n.excerpt)}</description>${n.image_url ? `\n  <enclosure url="${esc(n.image_url)}" type="image/jpeg" />` : ""}
</item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(settings.site_title)}</title>
  <link>${SITE_URL}/${locale}</link>
  <atom:link href="${SITE_URL}/${locale}/rss.xml" rel="self" type="application/rss+xml" />
  <description>${esc(settings.meta_description || settings.site_title)}</description>
  <language>${locale === "tm" ? "tk" : locale}</language>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
