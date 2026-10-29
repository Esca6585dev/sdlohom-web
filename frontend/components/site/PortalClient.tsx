"use client";

import { useEffect, useState } from "react";
import { Download, FileText, LogOut, UserRound } from "lucide-react";
import { ApiError, apiGet, apiSend, PORTAL_TOKEN_KEY, setStoredToken } from "@/lib/api";
import { useStoredToken } from "@/lib/useStoredToken";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang, PortalLoginResponse, PortalUser, UserFile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function PortalClient({ dict, locale }: { dict: Dictionary; locale: Lang }) {
  const token = useStoredToken(PORTAL_TOKEN_KEY);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [checked, setChecked] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loading = !!token && checked !== token;

  // Validate a stored token and load the user's files (state is only set after awaits).
  useEffect(() => {
    if (!token || checked === token) return;
    let alive = true;
    (async () => {
      try {
        const me = await apiGet<PortalUser>("/portal/me", { token });
        const list = await apiGet<UserFile[]>("/portal/files", { token });
        if (!alive) return;
        setUser(me);
        setFiles(list);
        setChecked(token);
      } catch {
        if (!alive) return;
        setStoredToken(PORTAL_TOKEN_KEY, null);
        setChecked(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, checked]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await apiSend<PortalLoginResponse>("POST", "/auth/portal/login", form);
      const list = await apiGet<UserFile[]>("/portal/files", { token: r.token });
      setUser(r.user);
      setFiles(list);
      setChecked(r.token);
      setStoredToken(PORTAL_TOKEN_KEY, r.token);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? dict.tooManyRequests : dict.loginError);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setStoredToken(PORTAL_TOKEN_KEY, null);
    setUser(null);
    setFiles([]);
    setChecked(null);
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />;

  if (!token || !user) {
    const input = "w-full rounded-xl border border-line bg-card px-4 py-3 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 p-3 text-white"><UserRound size={24} /></div>
          <div>
            <h2 className="text-xl font-bold">{dict.loginHeader}</h2>
            <p className="text-sm text-ink-muted">{dict.portalIntro}</p>
          </div>
        </div>
        <form onSubmit={login} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{dict.username}</span>
            <input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{dict.password}</span>
            <input className={input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
          </label>
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">{dict.loginButton}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <aside className="min-w-0 rounded-2xl border border-line bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{dict.yourInfo}</h2>
        <p className="text-lg font-bold">{user.full_name || user.username}</p>
        <p className="text-sm text-ink-muted">@{user.username}</p>
        <p className="mt-3 text-sm"><span className="text-ink-muted">{dict.yourGroup}:</span> <span className="font-semibold">{user.group_name}</span></p>
        <button onClick={logout} className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-surface-2">
          <LogOut size={15} /> {dict.logout}
        </button>
      </aside>
      <section className="min-w-0 lg:col-span-2">
        <h2 className="mb-4 text-xl font-bold">{dict.sentGuides}</h2>
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center text-ink-muted">
            <p>{dict.filesEmpty}</p>
            <p className="mt-1">{dict.filesEmpty2}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-soft">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">{dict.fileName}</th>
                  <th className="px-4 py-3">{dict.fileNote}</th>
                  <th className="px-4 py-3">{dict.date}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {files.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><FileText size={16} className="text-brand-500" /> {f.original_name || f.file.split("/").pop()}</span></td>
                    <td className="px-4 py-3 text-ink-muted">{f.note}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(f.created_at, locale)}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={f.file_url} download className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-600"><Download size={13} /> {dict.download}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
