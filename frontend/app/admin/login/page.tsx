"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, UserRound } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { Button, Field, Input } from "@/components/admin/ui";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const { admin, loading, login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && admin) router.replace("/admin");
  }, [loading, admin, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username.trim(), form.password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 429 ? "Köp synanyşyk. Biraz garaşyň." : err.message) : "Baglanyşyk ýalňyşlygy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-accent-700 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo_doly.png" alt="" className="h-20 w-20 object-contain" />
          <h1 className="mt-4 text-2xl font-black text-brand-900 dark:text-brand-100">Admin panel</h1>
          <p className="mt-1 text-sm text-ink-muted">Saçly Dursunowa adyndaky lukmançylyk mekdebi</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Ulanyjy ady">
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input className="pl-9" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required autoFocus />
            </div>
          </Field>
          <Field label="Parol">
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input className="pl-9" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
            </div>
          </Field>
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
          <Button type="submit" className="w-full" loading={busy}><LogIn size={16} /> Gir</Button>
        </form>
      </div>
    </div>
  );
}
