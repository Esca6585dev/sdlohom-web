"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Button, Card, Field, Input, PageHeader, Spinner, Textarea, Toggle } from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/Uploader";
import type { SettingsMap } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = { key: string; label: string; fields: { key: string; label: string; type?: "text" | "textarea" | "number" | "toggle" | "url"; hint?: string }[] };

const TABS: Tab[] = [
  { key: "general", label: "Umumy", fields: [
    { key: "site_title_tm", label: "Saýt ady (TM)" }, { key: "site_title_en", label: "Saýt ady (EN)" }, { key: "site_title_ru", label: "Saýt ady (RU)" },
    { key: "site_short_title_tm", label: "Gysga ady (TM)" }, { key: "site_short_title_en", label: "Gysga ady (EN)" }, { key: "site_short_title_ru", label: "Gysga ady (RU)" },
    { key: "moodle_url", label: "Moodle / sanly bilim portaly salgysy", type: "url" },
  ] },
  { key: "contact", label: "Habarlaşmak", fields: [
    { key: "phone", label: "Telefon" }, { key: "email", label: "E-poçta" },
    { key: "address_tm", label: "Salgy (TM)", type: "textarea" }, { key: "address_en", label: "Salgy (EN)", type: "textarea" }, { key: "address_ru", label: "Salgy (RU)", type: "textarea" },
    { key: "map_url", label: "Karta (Google Maps embed URL)", type: "url", hint: "Google Maps → Paýlaş → Kartany goşmak → src salgysy" },
  ] },
  { key: "stats", label: "Sanaýjylar", fields: [
    { key: "stat_books", label: "Kitaplaryň sany", type: "number" }, { key: "stat_specialties", label: "Hünär sany", type: "number" }, { key: "stat_teachers", label: "Mugallym sany", type: "number" }, { key: "stat_students", label: "Talyp sany", type: "number" },
  ] },
  { key: "social", label: "Sosial ulgamlar", fields: [
    { key: "facebook", label: "Facebook", type: "url" }, { key: "instagram", label: "Instagram", type: "url" }, { key: "youtube", label: "YouTube", type: "url" }, { key: "telegram", label: "Telegram", type: "url" },
  ] },
  { key: "seo", label: "SEO", fields: [
    { key: "meta_description_tm", label: "Meta description (TM)", type: "textarea" }, { key: "meta_description_en", label: "Meta description (EN)", type: "textarea" }, { key: "meta_description_ru", label: "Meta description (RU)", type: "textarea" },
  ] },
  { key: "integrations", label: "Integrasiýalar", fields: [
    { key: "external_news_enabled", label: "merkez.bilim.tm täzeliklerini görkez", type: "toggle" },
    { key: "external_news_url", label: "Merkezleşdirilen API salgysy", type: "url" },
    { key: "external_news_token", label: "API tokeni", hint: "Diňe serwerde saklanýar, brauzere çykmaýar" },
  ] },
];

export default function SettingsPage() {
  const { get, send } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState<SettingsMap | null>(null);
  const [tab, setTab] = useState("general");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<SettingsMap>("/admin/settings").then(setValues).catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!values) return;
    setBusy(true);
    try {
      setValues(await send<SettingsMap>("PUT", "/admin/settings", values));
      toast.success("Sazlamalar ýatda saklandy");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (!values) return <Spinner />;
  const set = (k: string, v: string) => setValues((s) => ({ ...(s ?? {}), [k]: v }));
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <PageHeader title="Sazlamalar" actions={<Button onClick={save} loading={busy}><Save size={16} /> Ýatda sakla</Button>} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings tabs">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition", tab === t.key ? "bg-brand-600 text-white shadow-soft" : "bg-card text-ink-muted hover:bg-surface-2 hover:text-ink")}>{t.label}</button>
          ))}
        </nav>
        <Card title={current.label}>
          <div className="space-y-4">
            {tab === "general" && <ImageUploader value={values.logo || null} onChange={(p) => set("logo", p ?? "")} folder="logo" label="Logo (boş bolsa standart logo ulanylýar)" />}
            {current.fields.map((f) =>
              f.type === "toggle" ? (
                <Toggle key={f.key} checked={values[f.key] === "1"} onChange={(v) => set(f.key, v ? "1" : "0")} label={f.label} />
              ) : (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  {f.type === "textarea" ? (
                    <Textarea value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} rows={2} />
                  ) : (
                    <Input type={f.type === "number" ? "number" : "text"} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                </Field>
              ),
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
