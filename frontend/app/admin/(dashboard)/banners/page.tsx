"use client";

import { useState } from "react";
import { ExternalLink, MousePointerClick, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, Toggle } from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/Uploader";
import type { Banner, BannerPosition } from "@/lib/types";
import { cn, formatDateShort, toDatetimeLocal } from "@/lib/utils";

const POSITIONS: { key: BannerPosition; label: string; hint: string }[] = [
  { key: "news_sidebar", label: "Habar sahypasy (gapdal)", hint: "Habaryň sag tarapynda, meňzeş habarlaryň aşagynda" },
  { key: "page_sidebar", label: "Sahypalar (gapdal)", hint: "Hünär/resminama sahypalarynyň sag tarapynda" },
  { key: "home", label: "Baş sahypa", hint: "Baş sahypada Moodle blogunyň ýokarsynda, 3 sütün" },
];

type Form = { id?: number; position: BannerPosition; lang: string; title: string; image: string | null; link: string; open_new_tab: boolean; sort: number; is_active: boolean; starts_at: string; ends_at: string };
const empty: Form = { position: "news_sidebar", lang: "", title: "", image: null, link: "", open_new_tab: true, sort: 0, is_active: true, starts_at: "", ends_at: "" };

export default function BannersPage() {
  const { get, send } = useAuth();
  const toast = useToast();
  const [pos, setPos] = useState<BannerPosition | "">("");
  const { data, loading, reload } = useAsync(() => get<{ items: Banner[]; positions: string[] }>("/admin/banners", { position: pos }), [pos]);
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);

  function openEdit(b: Banner) {
    setEdit({ id: b.id, position: b.position, lang: b.lang, title: b.title, image: b.image, link: b.link ?? "", open_new_tab: b.open_new_tab, sort: b.sort, is_active: b.is_active, starts_at: toDatetimeLocal(b.starts_at), ends_at: toDatetimeLocal(b.ends_at) });
  }

  async function save() {
    if (!edit) return;
    if (!edit.image) return toast.error("Banner suraty hökmany");
    setBusy(true);
    try {
      const body = {
        position: edit.position, lang: edit.lang, title: edit.title, image: edit.image, link: edit.link || null, open_new_tab: edit.open_new_tab, sort: edit.sort, is_active: edit.is_active,
        starts_at: edit.starts_at ? new Date(edit.starts_at).toISOString() : undefined,
        ends_at: edit.ends_at ? new Date(edit.ends_at).toISOString() : undefined,
        clear_dates: !edit.starts_at && !edit.ends_at,
      };
      if (edit.id) await send("PUT", `/admin/banners/${edit.id}`, body);
      else await send("POST", "/admin/banners", body);
      toast.success("Banner ýatda saklandy");
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await send("DELETE", `/admin/banners/${del.id}`);
      toast.success("Banner pozuldy");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const f = edit;
  const setF = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, [k]: v } : e));
  const items = data?.items ?? [];
  const groups = POSITIONS.filter((p) => !pos || p.key === pos);

  return (
    <>
      <PageHeader title="Bannerlar / reklama" subtitle="Saýtyň gapdal panellerinde we baş sahypada görkezilýän surat bloklary" actions={<Button onClick={() => setEdit({ ...empty, position: pos || "news_sidebar" })}><Plus size={16} /> Täze banner</Button>} />
      <div className="mb-5 inline-flex flex-wrap rounded-xl border border-line bg-card p-1">
        <button onClick={() => setPos("")} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", pos === "" ? "bg-brand-600 text-white" : "text-ink-muted hover:text-ink")}>Ählisi</button>
        {POSITIONS.map((p) => (
          <button key={p.key} onClick={() => setPos(p.key)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", pos === p.key ? "bg-brand-600 text-white" : "text-ink-muted hover:text-ink")}>{p.label}</button>
        ))}
      </div>
      {loading && <Spinner />}
      {data && !loading && items.length === 0 && <EmptyState text="Banner ýok" action={<Button onClick={() => setEdit({ ...empty, position: pos || "news_sidebar" })}>Goş</Button>} />}
      {data && !loading && groups.map((g) => {
        const list = items.filter((b) => b.position === g.key);
        if (list.length === 0) return null;
        return (
          <section key={g.key} className="mb-8">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">{g.label}</h2>
            <p className="mb-3 text-xs text-ink-muted">{g.hint}</p>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => (
                <article key={b.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
                  <div className="relative bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt="" className="max-h-56 w-full object-cover" />
                    <div className="absolute left-3 top-3 flex gap-1">
                      <Badge tone={b.is_active ? "success" : "danger"}>{b.is_active ? "işjeň" : "ýapyk"}</Badge>
                      <Badge tone="brand">{b.lang ? b.lang.toUpperCase() : "Ähli dil"}</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{b.title || "—"}</p>
                    {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-xs text-brand-600 dark:text-brand-300"><ExternalLink size={11} /> {b.link}</a>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span>Tertip: {b.sort}</span>
                      <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {b.clicks} basylma</span>
                      {(b.starts_at || b.ends_at) && <span>{b.starts_at ? formatDateShort(b.starts_at) : "…"} – {b.ends_at ? formatDateShort(b.ends_at) : "…"}</span>}
                    </div>
                    <div className="mt-3 flex justify-end gap-1">
                      <IconButton label="Üýtget" onClick={() => openEdit(b)}><Pencil size={16} /></IconButton>
                      <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(b)}><Trash2 size={16} /></IconButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Banneri üýtgetmek" : "Täze banner"} wide footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {f && (
          <div className="space-y-4">
            <ImageUploader value={f.image} onChange={(p) => setF("image", p)} folder="banners" label="Banner suraty (gapdal üçin 340×280 ýa-da 340×600, baş sahypa üçin 1200×400 maslahat berilýär)" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ýerleşjek ýeri">
                <Select value={f.position} onChange={(e) => setF("position", e.target.value as BannerPosition)}>
                  {POSITIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </Select>
              </Field>
              <Field label="Dil">
                <Select value={f.lang} onChange={(e) => setF("lang", e.target.value)}>
                  <option value="">Ähli diller</option><option value="tm">Türkmençe</option><option value="en">English</option><option value="ru">Русский</option>
                </Select>
              </Field>
            </div>
            <Field label="Ady (islege görä, suratyň aşagynda görkezilýär)"><Input value={f.title} onChange={(e) => setF("title", e.target.value)} /></Field>
            <Field label="Salgy (basylanda açylýar)"><Input value={f.link} onChange={(e) => setF("link", e.target.value)} placeholder="https://" /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tertip"><Input type="number" value={f.sort} onChange={(e) => setF("sort", Number(e.target.value))} /></Field>
              <Field label="Başlanýar (islege görä)"><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF("starts_at", e.target.value)} /></Field>
              <Field label="Tamamlanýar (islege görä)"><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF("ends_at", e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap gap-6">
              <Toggle checked={f.is_active} onChange={(v) => setF("is_active", v)} label="Işjeň" />
              <Toggle checked={f.open_new_tab} onChange={(v) => setF("open_new_tab", v)} label="Täze penjirede aç" />
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text="Bu banneri pozmak isleýärsiňizmi?" />
    </>
  );
}
