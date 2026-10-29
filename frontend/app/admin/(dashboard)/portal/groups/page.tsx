"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Spinner, Table, Td, Textarea, Th } from "@/components/admin/ui";
import type { UserGroup } from "@/lib/types";

export default function GroupsPage() {
  const { get, send } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => get<UserGroup[]>("/admin/user-groups"), []);
  const [edit, setEdit] = useState<{ id?: number; name: string; note: string } | null>(null);
  const [del, setDel] = useState<UserGroup | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!edit || !edit.name.trim()) return toast.error("Ady hökmany");
    setBusy(true);
    try {
      if (edit.id) await send("PUT", `/admin/user-groups/${edit.id}`, { name: edit.name, note: edit.note });
      else await send("POST", "/admin/user-groups", { name: edit.name, note: edit.note });
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
      await send("DELETE", `/admin/user-groups/${del.id}`);
      toast.success("Topar pozuldy");
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
      <PageHeader title="Portal toparlary" subtitle="Ulanyjylar toparlara bölünýär; gollanmalar topara ugradylýar" actions={<Button onClick={() => setEdit({ name: "", note: "" })}><Plus size={16} /> Täze topar</Button>} />
      {loading && <Spinner />}
      {data && !loading && (data.length === 0 ? <EmptyState text="Topar ýok" /> : (
        <Table>
          <thead><tr><Th>Ady</Th><Th>Bellik</Th><Th className="text-right">Ulanyjy</Th><Th className="text-right">Faýl</Th><Th className="w-24" /></tr></thead>
          <tbody>
            {data.map((g) => (
              <tr key={g.id} className="hover:bg-surface-2/60">
                <Td className="font-semibold">{g.name}</Td>
                <Td className="text-ink-muted">{g.note}</Td>
                <Td className="text-right">{g.users_count}</Td>
                <Td className="text-right">{g.files_count}</Td>
                <Td><div className="flex justify-end gap-1"><IconButton label="Üýtget" onClick={() => setEdit({ id: g.id, name: g.name, note: g.note })}><Pencil size={16} /></IconButton><IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(g)}><Trash2 size={16} /></IconButton></div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Topary üýtgetmek" : "Täze topar"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Ady"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <Field label="Bellik"><Textarea value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text={`"${del?.name}" toparyny, onuň ulanyjylaryny we faýllaryny pozmak isleýärsiňizmi?`} />
    </>
  );
}
