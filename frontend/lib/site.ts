import { safeGet } from "@/lib/api";
import type { Lang, MenuItem, PublicSettings } from "@/lib/types";

export const FALLBACK_SETTINGS: PublicSettings = {
  site_title: "Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebi",
  phone: "",
  email: "",
  address: "",
  meta_description: "",
  logo: null,
  logo_url: null,
  moodle_url: "",
  map_url: "",
  social: { facebook: "", instagram: "", youtube: "", telegram: "" },
  stats: { books: 0, specialties: 0, teachers: 0, students: 0 },
  external_news_enabled: false,
};

export async function getSiteData(lang: Lang): Promise<{ settings: PublicSettings; menus: MenuItem[] }> {
  const [settings, menus] = await Promise.all([
    safeGet<PublicSettings>("/settings", FALLBACK_SETTINGS, { lang }),
    safeGet<MenuItem[]>("/menus", [], { lang }),
  ]);
  return { settings: settings ?? FALLBACK_SETTINGS, menus: Array.isArray(menus) ? menus : [] };
}

/** Top-level menu item with the most children = the specialties section. */
export function pickSpecialties(menus: MenuItem[]): MenuItem | null {
  const withKids = menus.filter((m) => (m.children?.length ?? 0) > 0 && !m.external_url);
  if (withKids.length === 0) return null;
  return withKids.sort((a, b) => b.children.length - a.children.length)[0];
}

/** First top-level content page without children = "About us". */
export function pickAbout(menus: MenuItem[]): MenuItem | null {
  return menus.find((m) => m.has_content && (m.children?.length ?? 0) === 0 && !m.external_url) ?? null;
}

export function menuHref(locale: Lang, item: MenuItem): string {
  if (item.external_url) return item.external_url;
  return `/${locale}/page/${item.slug}`;
}
