"use client";

import { useState } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Modal, PageHeader, Pagination, Spinner, Table, Td, Th, Toggle } from "@/components/admin/ui";
import type { Contact } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ContactsPage() {
  const { list, send, can } = useAuth();
  const toast = useToast();
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const { data, loading, reload, setData } = useAsync(() => list<Contact>("/admin/contacts", { unread: unread ? 1 : "", page, limit: 20 }), [unread, page]);
  const [view, setView] = useState<Contact | null>(null);
  const [del, setDel] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);

  async function setRead(c: Contact, is_read: boolean) {
    try {
      const updated = await send<Contact>("PATCH", `/admin/contacts/${c.id}`, { is_read });
      setData((d) => (d ? { ...d, data: d.data.map((x) => (x.id === c.id ? updated : x)) } : d));
      if (view?.id === c.id) setView(updated);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function open(c: Contact) {
    setView(c);
    if (!c.is_read) setRead(c, true);
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await send("DELETE", `/admin/contacts/${del.id}`);
      toast.success("Hat pozuldy");
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
      <PageHeader title="Gelen hatlar" subtitle={data ? `Jemi ${data.meta.total}` : undefined} actions={<Toggle checked={unread} onChange={(v) => { setUnread(v); setPage(1); }} label="Diňe okalmadyklar" />} />
      {loading && <Spinner />}
      {data && !loading && (data.data.length === 0 ? <EmptyState text="Hat ýok" /> : (
        <Table>
          <thead><tr><Th className="w-10" /><Th>Kimden</Th><Th>Hat</Th><Th>Senesi</Th><Th className="w-24" /></tr></thead>
          <tbody>
            {data.data.map((c) => (
              <tr key={c.id} className={c.is_read ? "hover:bg-surface-2/60" : "bg-brand-500/10/40 font-medium hover:bg-brand-500/10/70"}>
                <Td>{c.is_read ? <MailOpen size={16} className="text-ink-muted" /> : <Mail size={16} className="text-brand-600 dark:text-brand-300" />}</Td>
                <Td><button onClick={() => open(c)} className="text-left"><p className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">{c.name}</p><p className="text-xs text-ink-muted">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p></button></Td>
                <Td><button onClick={() => open(c)} className="text-left text-ink-muted line-clamp-2">{c.message}</button></Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(c.created_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <IconButton label={c.is_read ? "Okalmadyk et" : "Okaldy et"} onClick={() => setRead(c, !c.is_read)}>{c.is_read ? <Mail size={16} /> : <MailOpen size={16} />}</IconButton>
                    {can("superadmin", "admin") && <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(c)}><Trash2 size={16} /></IconButton>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} total={data.meta.total} onChange={setPage} />}

      <Modal open={!!view} onClose={() => setView(null)} title="Hat" footer={<>{view && <a href={`mailto:${view.email}`}><Button variant="secondary">Jogap ýaz</Button></a>}<Button onClick={() => setView(null)}>Ýap</Button></>}>
        {view && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-bold">{view.name}</span><Badge tone={view.is_read ? "neutral" : "warning"}>{view.is_read ? "okaldy" : "täze"}</Badge></div>
            <p className="text-ink-muted">{view.email}{view.phone ? ` · ${view.phone}` : ""} · {formatDateTime(view.created_at)} · IP {view.ip}</p>
            <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-4 leading-relaxed">{view.message}</p>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text="Bu haty pozmak isleýärsiňizmi?" />
    </>
  );
}
