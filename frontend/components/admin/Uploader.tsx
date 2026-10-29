"use client";

import { useRef, useState } from "react";
import { FileVideo, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { apiBase } from "@/lib/api";

function toUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return apiBase().replace(/\/api\/v1\/?$/, "") + "/uploads/" + path.replace(/^\//, "");
}

export function ImageUploader({ value, onChange, folder, label = "Surat" }: { value: string | null; onChange: (path: string | null) => void; folder: string; label?: string }) {
  const { upload } = useAuth();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = toUrl(value);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const m = await upload(f, "image", folder);
      onChange(m.path);
      toast.success("Surat ýüklendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ýükläp bolmady");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-start gap-4">
        <div className="relative flex h-32 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={28} className="text-ink-muted/60" />
          )}
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-card/70"><Loader2 className="animate-spin text-brand-600 dark:text-brand-300" /></div>}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-surface-2">
            <Upload size={15} /> {url ? "Çalyş" : "Ýükle"}
          </button>
          {url && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10">
              <Trash2 size={15} /> Aýyr
            </button>
          )}
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={pick} />
          <p className="text-xs text-ink-muted">JPG, PNG, WEBP · iň köp 15 MB</p>
        </div>
      </div>
    </div>
  );
}

export function FileUploader({ value, onChange, folder, kind, label, accept, onUploaded }: { value: string | null; onChange: (path: string | null) => void; folder: string; kind: "video" | "document"; label: string; accept?: string; onUploaded?: (originalName: string) => void }) {
  const { upload } = useAuth();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = toUrl(value);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const m = await upload(f, kind, folder);
      onChange(m.path);
      onUploaded?.(f.name);
      toast.success("Faýl ýüklendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ýükläp bolmady");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2 p-3">
        <FileVideo size={20} className="text-ink-muted" />
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="max-w-[260px] truncate text-sm font-medium text-brand-700 dark:text-brand-300 underline">{value}</a>
        ) : (
          <span className="text-sm text-ink-muted">Faýl saýlanmady</span>
        )}
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Ýükle
        </button>
        {url && <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-500/10" aria-label="remove"><Trash2 size={15} /></button>}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={pick} />
      </div>
    </div>
  );
}
