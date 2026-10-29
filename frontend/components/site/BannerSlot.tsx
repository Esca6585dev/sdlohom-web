import { safeGet } from "@/lib/api";
import type { Banner, BannerPosition, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import BannerLink from "./BannerLink";

interface Props {
  position: BannerPosition;
  locale: Lang;
  /** "stack" = vertical sidebar column, "row" = horizontal strip (home) */
  layout?: "stack" | "row";
  className?: string;
  label?: string;
}

export default async function BannerSlot({ position, locale, layout = "stack", className, label }: Props) {
  const banners = await safeGet<Banner[]>("/banners", [], { lang: locale, query: { position } });
  if (!banners.length) return null;
  return (
    <section className={cn(layout === "row" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4", className)} aria-label={label || "Banner"}>
      {banners.map((b) => (
        <BannerLink key={b.id} banner={b} className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image_url} alt={b.title} loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          {b.title && <span className="block px-4 py-2.5 text-sm font-semibold text-ink">{b.title}</span>}
        </BannerLink>
      ))}
    </section>
  );
}
