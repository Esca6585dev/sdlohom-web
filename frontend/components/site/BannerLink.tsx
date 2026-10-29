"use client";

import { apiBase } from "@/lib/api";
import type { Banner } from "@/lib/types";

/** Renders a banner as a link (or a plain figure when it has no link) and sends a click beacon. */
export default function BannerLink({ banner, className, children }: { banner: Banner; className?: string; children: React.ReactNode }) {
  const track = () => {
    try {
      fetch(`${apiBase()}/banners/${banner.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* ignore */
    }
  };
  if (!banner.link) return <figure className={className}>{children}</figure>;
  const external = /^https?:\/\//i.test(banner.link);
  return (
    <a
      href={banner.link}
      className={className}
      onClick={track}
      target={banner.open_new_tab && external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer sponsored" : undefined}
    >
      {children}
    </a>
  );
}
