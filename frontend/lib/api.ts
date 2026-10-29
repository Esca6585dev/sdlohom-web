import type { Lang, Meta } from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function apiBase(): string {
  if (typeof window === "undefined") {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/api/v1";
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface GetOptions {
  lang?: Lang | string;
  query?: Query;
  token?: string | null;
  revalidate?: number;
  cache?: RequestCache;
}

function buildUrl(path: string, query?: Query, lang?: string): string {
  const base = apiBase().replace(/\/$/, "");
  const url = new URL(base + (path.startsWith("/") ? path : "/" + path));
  if (lang) url.searchParams.set("lang", lang);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parse<T>(res: Response): Promise<{ data: T; meta?: Meta }> {
  if (res.status === 204) return { data: undefined as unknown as T };
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(res.status, err?.code || "internal", err?.message || `HTTP ${res.status}`, err?.fields);
  }
  const b = body as { data: T; meta?: Meta };
  return { data: b?.data as T, meta: b?.meta };
}

/** GET returning the unwrapped `data`. */
export async function apiGet<T>(path: string, opts: GetOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query, opts.lang), {
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
    cache: opts.cache ?? "no-store",
  });
  return (await parse<T>(res)).data;
}

/** GET returning `{data, meta}` (paginated lists). */
export async function apiList<T>(path: string, opts: GetOptions = {}): Promise<{ data: T[]; meta: Meta }> {
  const res = await fetch(buildUrl(path, opts.query, opts.lang), {
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
    cache: opts.cache ?? "no-store",
  });
  const r = await parse<T[]>(res);
  return {
    data: r.data ?? [],
    meta: r.meta ?? { page: 1, limit: (r.data ?? []).length, total: (r.data ?? []).length, total_pages: 1 },
  };
}

/** Safe GET for server components: returns fallback instead of throwing. */
export async function safeGet<T>(path: string, fallback: T, opts: GetOptions = {}): Promise<T> {
  try {
    const v = await apiGet<T>(path, opts);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function safeList<T>(path: string, opts: GetOptions = {}): Promise<{ data: T[]; meta: Meta }> {
  try {
    return await apiList<T>(path, opts);
  } catch {
    return { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } };
  }
}

export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string | null,
  query?: Query,
): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return (await parse<T>(res)).data;
}

export async function apiUpload<T>(
  file: File,
  kind: "image" | "video" | "document",
  folder: string,
  token?: string | null,
): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(buildUrl("/admin/media/upload", { kind, folder }), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  return (await parse<T>(res)).data;
}

export const ADMIN_TOKEN_KEY = "sdlohom_admin_token";
export const PORTAL_TOKEN_KEY = "sdlohom_portal_token";

export function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredToken(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
    window.dispatchEvent(new Event("sdlohom-storage"));
  } catch {
    /* ignore */
  }
}
