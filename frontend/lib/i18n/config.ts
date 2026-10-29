import type { Lang } from "@/lib/types";

export const LOCALES: Lang[] = ["tm", "en", "ru"];
export const DEFAULT_LOCALE: Lang = "tm";

export function isLocale(v: string | undefined | null): v is Lang {
  return !!v && (LOCALES as string[]).includes(v);
}

export const LOCALE_LABELS: Record<Lang, { name: string; short: string; flag: string; html: string }> = {
  tm: { name: "Türkmençe", short: "TM", flag: "/images/flag_tm.png", html: "tk" },
  en: { name: "English", short: "EN", flag: "/images/flag_uk.png", html: "en" },
  ru: { name: "Русский", short: "RU", flag: "/images/flag_rus.png", html: "ru" },
};
