"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY, ApiError, apiGet, apiList, apiSend, apiUpload, setStoredToken } from "@/lib/api";
import { useStoredToken } from "@/lib/useStoredToken";
import type { Admin, AdminLoginResponse, Media, Meta } from "@/lib/types";

type Query = Record<string, string | number | boolean | undefined | null>;

interface AuthValue {
  admin: Admin | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  get: <T>(path: string, query?: Query) => Promise<T>;
  list: <T>(path: string, query?: Query) => Promise<{ data: T[]; meta: Meta }>;
  send: <T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) => Promise<T>;
  upload: (file: File, kind: "image" | "video" | "document", folder: string) => Promise<Media>;
  can: (...roles: Admin["role"][]) => boolean;
}

const Ctx = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // The stored token is a reactive external store (null on the server); `checked` is the token value we validated.
  const token = useStoredToken(ADMIN_TOKEN_KEY);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checked, setChecked] = useState<string | null>(null);
  const loading = !!token && checked !== token;

  const logout = useCallback(() => {
    if (token) apiSend("POST", "/auth/admin/logout", undefined, token).catch(() => {});
    setStoredToken(ADMIN_TOKEN_KEY, null);
    setAdmin(null);
    setChecked(null);
    router.replace("/admin/login");
  }, [router, token]);

  // Validate the token whenever it changes (all state updates happen after an await).
  useEffect(() => {
    if (!token || checked === token) return;
    let alive = true;
    apiGet<Admin>("/auth/admin/me", { token })
      .then((me) => {
        if (!alive) return;
        setAdmin(me);
        setChecked(token);
      })
      .catch(() => {
        if (!alive) return;
        setStoredToken(ADMIN_TOKEN_KEY, null);
        setAdmin(null);
        setChecked(null);
      });
    return () => {
      alive = false;
    };
  }, [token, checked]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const me = await apiGet<Admin>("/auth/admin/me", { token });
    setAdmin(me);
    setChecked(token);
  }, [token]);

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) logout();
        throw e;
      }
    },
    [logout],
  );

  const value = useMemo<AuthValue>(
    () => ({
      admin: token ? admin : null,
      token,
      loading,
      login: async (username, password) => {
        const r = await apiSend<AdminLoginResponse>("POST", "/auth/admin/login", { username, password });
        setAdmin(r.admin);
        setChecked(r.token);
        setStoredToken(ADMIN_TOKEN_KEY, r.token);
      },
      logout,
      refresh,
      get: (path, query) => guard(() => apiGet(path, { token, query })),
      list: (path, query) => guard(() => apiList(path, { token, query })),
      send: (method, path, body) => guard(() => apiSend(method, path, body, token)),
      upload: (file, kind, folder) => guard(() => apiUpload<Media>(file, kind, folder, token)),
      can: (...roles) => !!admin && roles.includes(admin.role),
    }),
    [admin, token, loading, logout, refresh, guard],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AdminAuthProvider");
  return v;
}
