"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CornerDownRight, ExternalLink, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, LangTabs, PageHeader, Spinner, Table, Td, Th } from "@/components/admin/ui";
import type { Lang, MenuItem } from "@/lib/types";

function orderTree(flat: MenuItem[]): MenuItem[] {
  const byParent = new Map<number | null, MenuItem[]>();
  for (const m of flat) {
    const k = m.parent_id ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(m);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort - b.sort || a.id - b.id);
  const out: MenuItem[] = [];
  const walk = (parent: number | null) => {
    for (const m of byParent.get(parent) ?? []) {
      out.push(m);
      walk(m.id);
    }
  };
  walk(null);
  // orphans (parent inactive / missing)
  const seen = new Set(out.map((m) => m.id));
  for (const m of flat) if (!seen.has(m.id)) out.push(m);
  return out;
}

export default function AdminPagesPage() {
  const { get, send } = useAuth();
  const toast = useToast();
  const [lang, setLang] = useState<Lang | "">("tm");
  const [del, setDel] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useAsync(() => get<MenuItem[]>("/admin/menus", { lang }), [lang]);
  const rows = useMemo(() => (data ? orderTree(data) : []), [data]);

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await send("DELETE", `/admin/menus/${del.id}`);
      toast.success("Sahypa pozuldy");
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
      <PageHeader title="Sahypalar / Menýu" subtitle="3 derejeli menýu agajy: ýokarky menýu → bölümler → kiçi bölümler" actions={<Link href={`/admin/pages/new?lang=${lang || "tm"}`}><Button><Plus size={16} /> Täze sahypa</Button></Link>} />
      <div className="mb-4"><LangTabs value={lang} onChange={setLang} /></div>
      {loading && <Spinner />}
      {data && !loading && (rows.length === 0 ? <EmptyState text="Sahypa ýok" /> : (
        <Table>
          <thead><tr><Th>Ady</Th><Th>Slug</Th><Th className="w-16">Tertip</Th><Th>Ýagdaý</Th><Th className="w-32" /></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="hover:bg-surface-2/60">
                <Td>
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${(m.depth - 1) * 22}px` }}>
                    {m.depth > 1 && <CornerDownRight size={14} className="text-ink-muted" />}
                    {m.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt="" className="h-8 w-10 rounded object-cover" />
                    )}
                    <Link href={`/admin/pages/${m.id}`} className={m.depth === 1 ? "font-bold hover:text-brand-700 dark:hover:text-brand-300" : "font-medium hover:text-brand-700 dark:hover:text-brand-300"}>{m.title}</Link>
                    {m.external_url && <ExternalLink size={13} className="text-ink-muted" />}
                    <Badge tone="neutral">{m.lang.toUpperCase()}</Badge>
                  </div>
                </Td>
                <Td className="font-mono text-xs text-ink-muted">{m.slug}</Td>
                <Td className="text-ink-muted">{m.sort}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Badge tone={m.is_active ? "success" : "danger"}>{m.is_active ? "işjeň" : "ýapyk"}</Badge>
                    {!m.show_in_menu && <Badge tone="warning"><EyeOff size={11} /></Badge>}
                    {!m.has_content && m.depth > 1 && <Badge tone="neutral">boş</Badge>}
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {m.depth < 3 && <Link href={`/admin/pages/new?parent=${m.id}&lang=${m.lang}`}><IconButton label="Çaga sahypa goş"><Plus size={16} /></IconButton></Link>}
                    <Link href={`/admin/pages/${m.id}`}><IconButton label="Üýtget"><Pencil size={16} /></IconButton></Link>
                    <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(m)}><Trash2 size={16} /></IconButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.title}" sahypasyny we onuň ähli çaga sahypalaryny pozmak isleýärsiňizmi?`} />
    </>
  );
}
