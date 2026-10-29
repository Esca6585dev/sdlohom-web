"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, Table, Td, Th, Toggle } from "@/components/admin/ui";
import type { Admin, AdminRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type Form = { id?: number; name: string; surname: string; username: string; password: string; role: AdminRole; is_active: boolean };

export default function AdminsPage() {
  const { get, send, admin: me } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => get<Admin[]>("/admin/admins"), []);
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<Admin | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!edit) return;
    if (!edit.username.trim()) return toast.error("Ulanyjy ady hökmany");
    if (!edit.id && edit.password.length < 6) return toast.error("Parol azyndan 6 belgi");
    setBusy(true);
    try {
      const body = { name: edit.name, surname: edit.surname, username: edit.username, role: edit.role, is_active: edit.is_active, ...(edit.password ? { password: edit.password } : {}) };
      if (edit.id) await send("PUT", `/admin/admins/${edit.id}`, body);
      else await send("POST", "/admin/admins", body);
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
      await send("DELETE", `/admin/admins/${del.id}`);
      toast.success("Admin pozuldy");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const roleTone = (r: AdminRole) => (r === "superadmin" ? "danger" : r === "admin" ? "brand" : "neutral");

  return (
    <>
      <PageHeader title="Adminler" subtitle="superadmin – hemme zat · admin – adminlerden başga hemme zat · editor – diňe mazmun" actions={<Button onClick={() => setEdit({ name: "", surname: "", username: "", password: "", role: "editor", is_active: true })}><Plus size={16} /> Täze admin</Button>} />
      {loading && <Spinner />}
      {data && !loading && (data.length === 0 ? <EmptyState text="Admin ýok" /> : (
        <Table>
          <thead><tr><Th>Admin</Th><Th>Rol</Th><Th>Ýagdaý</Th><Th>Soňky giriş</Th><Th className="w-24" /></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="hover:bg-surface-2/60">
                <Td><p className="font-semibold">{a.name} {a.surname}</p><p className="text-xs text-ink-muted">@{a.username}</p></Td>
                <Td><Badge tone={roleTone(a.role)}>{a.role}</Badge></Td>
                <Td><Badge tone={a.is_active ? "success" : "danger"}>{a.is_active ? "işjeň" : "ýapyk"}</Badge></Td>
                <Td className="text-ink-muted">{a.last_login_at ? formatDateTime(a.last_login_at) : "—"}</Td>
                <Td><div className="flex justify-end gap-1"><IconButton label="Üýtget" onClick={() => setEdit({ id: a.id, name: a.name, surname: a.surname, username: a.username, password: "", role: a.role, is_active: a.is_active })}><Pencil size={16} /></IconButton>{a.id !== me?.id && <IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(a)}><Trash2 size={16} /></IconButton>}</div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Admini üýtgetmek" : "Täze admin"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ady"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Familiýasy"><Input value={edit.surname} onChange={(e) => setEdit({ ...edit, surname: e.target.value })} /></Field>
            </div>
            <Field label="Ulanyjy ady"><Input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} autoComplete="off" /></Field>
            <Field label={edit.id ? "Täze parol (boş goýsaňyz üýtgemeýär)" : "Parol"}><Input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Field>
            <Field label="Rol"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as AdminRole })}><option value="editor">editor</option><option value="admin">admin</option><option value="superadmin">superadmin</option></Select></Field>
            <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Işjeň" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.username}" adminini pozmak isleýärsiňizmi?`} />
    </>
  );
}
