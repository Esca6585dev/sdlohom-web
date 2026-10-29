"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, LangTabs, Modal, PageHeader, Select, Spinner, Toggle } from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/Uploader";
import type { Lang, Slide } from "@/lib/types";

type FormState = { lang: Lang; design: number; title: string; subtitle: string; caption: string; image: string | null; link: string; sort: number; is_active: boolean };
const empty: FormState = { lang: "tm", design: 1, title: "", subtitle: "", caption: "", image: null, link: "", sort: 0, is_active: true };

export default function SlidesPage() {
  const { get, send } = useAuth();
  const toast = useToast();
  const [lang, setLang] = useState<Lang | "">("");
  const { data, loading, reload } = useAsync(() => get<Slide[]>("/admin/slides", { lang }), [lang]);
  const [edit, setEdit] = useState<{ id?: number; form: FormState } | null>(null);
  const [del, setDel] = useState<Slide | null>(null);
  const [busy, setBusy] = useState(false);

  function openNew() { setEdit({ form: { ...empty, lang: lang || "tm" } }); }
  function openEdit(s: Slide) { setEdit({ id: s.id, form: { lang: s.lang, design: s.design, title: s.title, subtitle: s.subtitle, caption: s.caption, image: s.image, link: s.link ?? "", sort: s.sort, is_active: s.is_active } }); }

  async function save() {
    if (!edit) return;
    if (!edit.form.image) return toast.error("Surat hökmany");
    setBusy(true);
    try {
      const body = { ...edit.form, link: edit.form.link || null };
      if (edit.id) await send("PUT", `/admin/slides/${edit.id}`, body);
      else await send("POST", "/admin/slides", body);
      toast.success("Ýatda saklandy");
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
      await send("DELETE", `/admin/slides/${del.id}`);
      toast.success("Slaýd pozuldy");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const f = edit?.form;
  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setEdit((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  return (
    <>
      <PageHeader title="Slaýdlar" subtitle="Baş sahypadaky hero slaýder" actions={<Button onClick={openNew}><Plus size={16} /> Täze slaýd</Button>} />
      <div className="mb-4"><LangTabs value={lang} onChange={setLang} /></div>
      {loading && <Spinner />}
      {data && !loading && (data.length === 0 ? <EmptyState text="Slaýd ýok" action={<Button onClick={openNew}>Goş</Button>} /> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <article key={s.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
              <div className="relative aspect-video bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 to-transparent p-4 text-white">
                  <p className="absolute bottom-4 left-4 right-4 text-sm font-bold line-clamp-2">{s.title}</p>
                </div>
                <div className="absolute left-3 top-3 flex gap-1"><Badge tone="brand">{s.lang.toUpperCase()}</Badge><Badge tone={s.is_active ? "success" : "danger"}>{s.is_active ? "işjeň" : "ýapyk"}</Badge></div>
              </div>
              <div className="flex items-center justify-between p-3">
                <p className="text-xs text-ink-muted">Tertip: {s.sort} · Dizaýn: {s.design}</p>
                <div className="flex gap-1">
                  <IconButton label="Üýtget" onClick={() => openEdit(s)}><Pencil size={16} /></IconButton>
                  <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(s)}><Trash2 size={16} /></IconButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      ))}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Slaýdy üýtgetmek" : "Täze slaýd"} wide footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {f && (
          <div className="space-y-4">
            <ImageUploader value={f.image} onChange={(p) => setF("image", p)} folder="slides" label="Fon suraty (1920×800 maslahat berilýär)" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Dil"><Select value={f.lang} onChange={(e) => setF("lang", e.target.value as Lang)}><option value="tm">TM</option><option value="en">EN</option><option value="ru">RU</option></Select></Field>
              <Field label="Dizaýn"><Select value={f.design} onChange={(e) => setF("design", Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></Select></Field>
              <Field label="Tertip"><Input type="number" value={f.sort} onChange={(e) => setF("sort", Number(e.target.value))} /></Field>
            </div>
            <Field label="Esasy ýazgy"><Input value={f.title} onChange={(e) => setF("title", e.target.value)} /></Field>
            <Field label="Kiçi ýazgy"><Input value={f.subtitle} onChange={(e) => setF("subtitle", e.target.value)} /></Field>
            <Field label="Bellik (ýokarky kiçi tekst)"><Input value={f.caption} onChange={(e) => setF("caption", e.target.value)} /></Field>
            <Field label="Salgy (islege görä)"><Input value={f.link} onChange={(e) => setF("link", e.target.value)} placeholder="https://" /></Field>
            <Toggle checked={f.is_active} onChange={(v) => setF("is_active", v)} label="Işjeň" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text="Bu slaýdy pozmak isleýärsiňizmi?" />
    </>
  );
}
