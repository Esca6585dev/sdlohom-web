"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, LangTabs, PageHeader, Pagination, Select, Spinner, Table, Td, Th } from "@/components/admin/ui";
import type { Lang, NewsItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function AdminNewsListPage() {
  const { list, send } = useAuth();
  const toast = useToast();
  const [lang, setLang] = useState<Lang | "">("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [published, setPublished] = useState("");
  const [page, setPage] = useState(1);
  const [del, setDel] = useState<NewsItem | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useAsync(() => list<NewsItem>("/admin/news", { lang, q, published, page, limit: 20 }), [lang, q, published, page]);

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await send("DELETE", `/admin/news/${del.id}`);
      toast.success("Habar pozuldy");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Habarlar" subtitle={data ? `Jemi ${data.meta.total} habar` : undefined} actions={<Link href="/admin/news/new"><Button><Plus size={16} /> Täze habar</Button></Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <LangTabs value={lang} onChange={(v) => { setLang(v); setPage(1); }} />
        <form onSubmit={(e) => { e.preventDefault(); setQ(qInput); setPage(1); }} className="flex gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input className="w-56 pl-9" placeholder="Gözleg..." value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>
          <Button variant="secondary" type="submit">Gözle</Button>
        </form>
        <Select className="w-40" value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }}>
          <option value="">Ähli ýagdaý</option>
          <option value="1">Çap edilen</option>
          <option value="0">Garalama</option>
        </Select>
      </div>
      {loading && <Spinner />}
      {data && !loading && (data.data.length === 0 ? <EmptyState text="Habar tapylmady" /> : (
        <Table>
          <thead><tr><Th className="w-20">Surat</Th><Th>Ady</Th><Th>Dil</Th><Th>Senesi</Th><Th>Ýagdaý</Th><Th className="text-right">Görülme</Th><Th className="w-24" /></tr></thead>
          <tbody>
            {data.data.map((n) => (
              <tr key={n.id} className="hover:bg-surface-2/60">
                <Td><div className="h-12 w-16 overflow-hidden rounded-lg bg-surface-2">{n.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image_url} alt="" className="h-full w-full object-cover" />
                )}</div></Td>
                <Td><Link href={`/admin/news/${n.id}`} className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">{n.title}</Link><p className="mt-0.5 text-xs text-ink-muted line-clamp-1">{n.excerpt}</p></Td>
                <Td><Badge tone="brand">{n.lang.toUpperCase()}</Badge></Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(n.published_at)}</Td>
                <Td><Badge tone={n.is_published ? "success" : "neutral"}>{n.is_published ? "Çap" : "Garalama"}</Badge></Td>
                <Td className="text-right"><span className="inline-flex items-center gap-1 text-ink-muted"><Eye size={13} /> {n.views}</span></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/news/${n.id}`}><IconButton label="Üýtget"><Pencil size={16} /></IconButton></Link>
                    <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(n)}><Trash2 size={16} /></IconButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} total={data.meta.total} onChange={setPage} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.title}" habaryny pozmak isleýärsiňizmi?`} />
    </>
  );
}
