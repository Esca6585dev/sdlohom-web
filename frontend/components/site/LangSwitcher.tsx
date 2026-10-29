"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function LangSwitcher({ locale, compact = false }: { locale: Lang; compact?: boolean }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(tm|en|ru)(?=\/|$)/, "");
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={LOCALE_LABELS[l].html}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition",
            l === locale ? "bg-white/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
          )}
          title={LOCALE_LABELS[l].name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCALE_LABELS[l].flag} alt="" width={18} height={12} className="h-3 w-[18px] rounded-[2px] object-cover" />
          {!compact && <span>{LOCALE_LABELS[l].short}</span>}
        </Link>
      ))}
    </div>
  );
}
