"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiBase } from "@/lib/api";
import { uuid } from "@/lib/utils";

const KEY = "sdlohom_visitor_id";

function visitorId(): string {
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v = uuid();
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

export default function VisitTracker({ locale }: { locale: string }) {
  const pathname = usePathname();
  const last = useRef<string>("");
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || last.current === pathname) return;
    last.current = pathname;
    const body = JSON.stringify({ path: pathname, locale, referrer: document.referrer || "", visitor_id: visitorId() });
    try {
      fetch(`${apiBase()}/analytics/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [pathname, locale]);
  return null;
}
