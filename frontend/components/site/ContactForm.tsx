"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { ApiError, apiSend } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function ContactForm({ dict }: { dict: Dictionary }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await apiSend("POST", "/contact", form);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields ?? {});
        setError(err.status === 429 ? dict.tooManyRequests : err.message || dict.messageError);
      } else setError(dict.messageError);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-accent-200 bg-accent-500/10 p-10 text-center">
        <CheckCircle2 size={48} className="text-accent-600" />
        <p className="mt-4 text-lg font-semibold text-accent-700 dark:text-accent-300">{dict.messageOk}</p>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-line bg-card px-4 py-3 text-ink placeholder:text-ink-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.yourName} error={fields.name}>
          <input className={input} value={form.name} onChange={set("name")} required autoComplete="name" />
        </Field>
        <Field label={dict.yourEmail} error={fields.email}>
          <input className={input} type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
        </Field>
      </div>
      <Field label={dict.yourPhone} error={fields.phone}>
        <input className={input} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
      </Field>
      <Field label={dict.yourMessage} error={fields.message}>
        <textarea className={input} rows={6} value={form.message} onChange={set("message")} required />
      </Field>
      <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          {dict.honeypot}
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </label>
      </div>
      {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-60">
        <Send size={16} /> {busy ? dict.sending : dict.send}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
