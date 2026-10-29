"use client";

import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, Select, Spinner, Table, Td, Th, Toggle } from "@/components/admin/ui";
import type { PortalUser, UserGroup } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type Form = { id?: number; group_id: number; username: string; full_name: string; password: string; is_active: boolean };

export default function PortalUsersPage() {
  const { get, list, send } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [groupId, setGroupId] = useState(0);
  const [page, setPage] = useState(1);
  const { data: groups } = useAsync(() => get<UserGroup[]>("/admin/user-groups"), []);
  const { data, loading, reload } = useAsync(() => list<PortalUser>("/admin/users", { q, group_id: groupId || "", page, limit: 20 }), [q, groupId, page]);
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<PortalUser | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!edit) return;
    if (!edit.username.trim() || !edit.group_id) return toast.error("Ulanyjy ady we topar hökmany");
    if (!edit.id && edit.password.length < 4) return toast.error("Parol azyndan 4 belgi");
    setBusy(true);
    try {
      const body = { group_id: edit.group_id, username: edit.username, full_name: edit.full_name, is_active: edit.is_active, ...(edit.password ? { password: edit.password } : {}) };
      if (edit.id) await send("PUT", `/admin/users/${edit.id}`, body);
      else await send("POST", "/admin/users", body);
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
      await send("DELETE", `/admin/users/${del.id}`);
      toast.success("Ulanyjy pozuldy");
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
      <PageHeader title="Portal ulanyjylary" subtitle="Saýtdaky 'Ulgama gir' bölümine girýän talyplar/mugallymlar" actions={<Button onClick={() => setEdit({ group_id: groups?.[0]?.id ?? 0, username: "", full_name: "", password: "", is_active: true })}><Plus size={16} /> Täze ulanyjy</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-56" value={groupId} onChange={(e) => { setGroupId(Number(e.target.value)); setPage(1); }}><option value={0}>Ähli toparlar</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
        <form onSubmit={(e) => { e.preventDefault(); setQ(qInput); setPage(1); }} className="flex gap-2">
          <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><Input className="w-56 pl-9" placeholder="Gözleg..." value={qInput} onChange={(e) => setQInput(e.target.value)} /></div>
          <Button variant="secondary" type="submit">Gözle</Button>
        </form>
      </div>
      {loading && <Spinner />}
      {data && !loading && (data.data.length === 0 ? <EmptyState text="Ulanyjy ýok" /> : (
        <Table>
          <thead><tr><Th>Ulanyjy</Th><Th>Topar</Th><Th>Ýagdaý</Th><Th>Soňky giriş</Th><Th className="w-24" /></tr></thead>
          <tbody>
            {data.data.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2/60">
                <Td><p className="font-semibold">{u.full_name || u.username}</p><p className="text-xs text-ink-muted">@{u.username}</p></Td>
                <Td>{u.group_name}</Td>
                <Td><Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "işjeň" : "ýapyk"}</Badge></Td>
                <Td className="text-ink-muted">{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}</Td>
                <Td><div className="flex justify-end gap-1"><IconButton label="Üýtget" onClick={() => setEdit({ id: u.id, group_id: u.group_id, username: u.username, full_name: u.full_name, password: "", is_active: u.is_active })}><Pencil size={16} /></IconButton><IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(u)}><Trash2 size={16} /></IconButton></div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} total={data.meta.total} onChange={setPage} />}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Ulanyjyny üýtgetmek" : "Täze ulanyjy"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Topar"><Select value={edit.group_id} onChange={(e) => setEdit({ ...edit, group_id: Number(e.target.value) })}><option value={0}>— saýlaň —</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
            <Field label="Ady we familiýasy"><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Ulanyjy ady"><Input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} autoComplete="off" /></Field>
            <Field label={edit.id ? "Täze parol (boş goýsaňyz üýtgemeýär)" : "Parol"}><Input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Field>
            <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Işjeň" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.username}" ulanyjysyny pozmak isleýärsiňizmi?`} />
    </>
  );
}
