import type { MetadataRoute } from "next";
import { safeGet, safeList } from "@/lib/api";
import { LOCALES } from "@/lib/i18n/config";
import type { MenuItem, NewsItem } from "@/lib/types";
import { SITE_URL } from "@/lib/utils";

export const dynamic = "force-dynamic";

function flatten(items: MenuItem[], out: MenuItem[] = []): MenuItem[] {
  for (const it of items) {
    out.push(it);
    flatten(it.children ?? [], out);
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    entries.push({ url: `${SITE_URL}/${locale}`, changeFrequency: "daily", priority: 1 });
    for (const p of ["news", "contact", "portal", "search"]) {
      entries.push({ url: `${SITE_URL}/${locale}/${p}`, changeFrequency: "weekly", priority: 0.6 });
    }
    const menus = await safeGet<MenuItem[]>("/menus", [], { lang: locale });
    for (const m of flatten(menus)) {
      if (m.external_url) continue;
      entries.push({ url: `${SITE_URL}/${locale}/page/${m.slug}`, changeFrequency: "monthly", priority: 0.7 });
    }
    const news = await safeList<NewsItem>("/news", { lang: locale, query: { limit: 50 } });
    for (const n of news.data) {
      entries.push({ url: `${SITE_URL}/${locale}/news/${n.slug}`, lastModified: n.published_at, changeFrequency: "yearly", priority: 0.5 });
    }
  }
  return entries;
}
