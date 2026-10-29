"use client";

import { useRef, useState } from "react";
import { Check, Copy, FileText, FileVideo, Search, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, Select, Spinner } from "@/components/admin/ui";
import type { Media } from "@/lib/types";
import { formatBytes, formatDateShort } from "@/lib/utils";

const FOLDERS = ["habarlar", "docs", "slides", "wideo_habarlar", "wideo_menu", "gollanma", "files", "logo"];

export default function MediaPage() {
  const { list, send, upload } = useAuth();
  const toast = useToast();
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useAsync(() => list<Media>("/admin/media", { kind, q, page, limit: 24 }), [kind, q, page]);
  const [del, setDel] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<{ kind: "image" | "video" | "document"; folder: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function doUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!up || files.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const f of files) {
      try {
        await upload(f, up.kind, up.folder);
        ok++;
      } catch (err) {
        toast.error(`${f.name}: ${errMsg(err)}`);
      }
    }
    if (ok) toast.success(`${ok} faýl ýüklendi`);
    setBusy(false);
    setUp(null);
    reload();
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await send("DELETE", `/admin/media/${del.id}`);
      toast.success("Faýl pozuldy");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(m: Media) {
    navigator.clipboard?.writeText(m.url).then(() => {
      setCopied(m.id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <>
      <PageHeader title="Media kitaphanasy" subtitle={data ? `Jemi ${data.meta.total} faýl` : undefined} actions={<Button onClick={() => setUp({ kind: "image", folder: "habarlar" })}><Upload size={16} /> Ýükle</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-40" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}>
          <option value="">Ähli görnüş</option><option value="image">Surat</option><option value="video">Wideo</option><option value="document">Resminama</option>
        </Select>
        <form onSubmit={(e) => { e.preventDefault(); setQ(qInput); setPage(1); }} className="flex gap-2">
          <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><Input className="w-56 pl-9" placeholder="Faýl ady..." value={qInput} onChange={(e) => setQInput(e.target.value)} /></div>
          <Button variant="secondary" type="submit">Gözle</Button>
        </form>
      </div>
      {loading && <Spinner />}
      {data && !loading && (data.data.length === 0 ? <EmptyState text="Faýl ýok" /> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {data.data.map((m) => (
            <div key={m.id} className="group overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex aspect-square items-center justify-center bg-surface-2">
                {m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : m.kind === "video" ? <FileVideo size={36} className="text-brand-400" /> : <FileText size={36} className="text-brand-400" />}
              </a>
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold" title={m.original_name || m.path}>{m.original_name || m.path.split("/").pop()}</p>
                <p className="text-[11px] text-ink-muted">{formatBytes(m.size)} · {formatDateShort(m.created_at)}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <Badge tone="neutral">{m.path.split("/")[0]}</Badge>
                  <div className="flex">
                    <IconButton label="URL göçür" onClick={() => copy(m)}>{copied === m.id ? <Check size={14} className="text-accent-600" /> : <Copy size={14} />}</IconButton>
                    <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(m)}><Trash2 size={14} /></IconButton>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} total={data.meta.total} onChange={setPage} />}

      <Modal open={!!up} onClose={() => !busy && setUp(null)} title="Faýl ýüklemek" footer={<><Button variant="secondary" onClick={() => setUp(null)} disabled={busy}>Ýatyr</Button><Button onClick={() => fileRef.current?.click()} loading={busy}><Upload size={16} /> Faýl saýla</Button></>}>
        {up && (
          <div className="space-y-4">
            <Field label="Görnüşi"><Select value={up.kind} onChange={(e) => setUp({ ...up, kind: e.target.value as typeof up.kind })}><option value="image">Surat</option><option value="video">Wideo</option><option value="document">Resminama</option></Select></Field>
            <Field label="Papka"><Select value={up.folder} onChange={(e) => setUp({ ...up, folder: e.target.value })}>{FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}</Select></Field>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={doUpload} accept={up.kind === "image" ? "image/*" : up.kind === "video" ? "video/*" : undefined} />
            <p className="text-xs text-ink-muted">Birnäçe faýl saýlap bolýar. Surat 15 MB, beýlekiler 64 MB çenli.</p>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.original_name || del?.path}" faýlyny pozmak isleýärsiňizmi? Faýl diskden hem aýrylar.`} />
    </>
  );
}
