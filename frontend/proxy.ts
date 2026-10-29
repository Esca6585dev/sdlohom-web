import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["tm", "en", "ru"];
const PASSTHROUGH = ["/admin", "/_next", "/images", "/api", "/sitemap.xml", "/robots.txt", "/favicon.ico"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/tm", request.url));
  }
  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) return NextResponse.next();
  if (PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(p + "/")) || /\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }
  // Legacy PHP-style URLs (./?page=...) and any unknown root path -> default locale
  return NextResponse.redirect(new URL("/tm" + pathname + request.nextUrl.search, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
