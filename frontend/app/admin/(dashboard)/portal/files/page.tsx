"use client";

import { useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg, useAsync } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, Select, Spinner, Table, Td, Th } from "@/components/admin/ui";
import { FileUploader } from "@/components/admin/Uploader";
import type { UserFile, UserGroup } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type Form = { id?: number; group_id: number; file: string | null; original_name: string; note: string };

export default function PortalFilesPage() {
  const { get, list, send } = useAuth();
  const toast = useToast();
  const [groupId, setGroupId] = useState(0);
  const [page, setPage] = useState(1);
  const { data: groups } = useAsync(() => get<UserGroup[]>("/admin/user-groups"), []);
  const { data, loading, reload } = useAsync(() => list<UserFile>("/admin/user-files", { group_id: groupId || "", page, limit: 20 }), [groupId, page]);
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<UserFile | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!edit) return;
    if (!edit.file || !edit.group_id) return toast.error("Faýl we topar hökmany");
    setBusy(true);
    try {
      if (edit.id) await send("PUT", `/admin/user-files/${edit.id}`, edit);
      else await send("POST", "/admin/user-files", edit);
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
      await send("DELETE", `/admin/user-files/${del.id}`);
      toast.success("Pozuldy");
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
      <PageHeader title="Okuw gollanmalary" subtitle="Topara ugradylan faýllar portalda şol toparyň ulanyjylaryna görünýär" actions={<Button onClick={() => setEdit({ group_id: groups?.[0]?.id ?? 0, file: null, original_name: "", note: "" })}><Plus size={16} /> Täze faýl</Button>} />
      <div className="mb-4"><Select className="w-56" value={groupId} onChange={(e) => { setGroupId(Number(e.target.value)); setPage(1); }}><option value={0}>Ähli toparlar</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
      {loading && <Spinner />}
      {data && !loading && (data.data.length === 0 ? <EmptyState text="Faýl ýok" /> : (
        <Table>
          <thead><tr><Th>Faýl</Th><Th>Topar</Th><Th>Bellik</Th><Th>Senesi</Th><Th className="w-28" /></tr></thead>
          <tbody>
            {data.data.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2/60">
                <Td className="font-semibold">{f.original_name || f.file.split("/").pop()}</Td>
                <Td>{f.group_name}</Td>
                <Td className="text-ink-muted">{f.note}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(f.created_at)}</Td>
                <Td><div className="flex justify-end gap-1"><a href={f.file_url} target="_blank" rel="noopener noreferrer"><IconButton label="Göçür"><Download size={16} /></IconButton></a><IconButton label="Üýtget" onClick={() => setEdit({ id: f.id, group_id: f.group_id, file: f.file, original_name: f.original_name, note: f.note })}><Pencil size={16} /></IconButton><IconButton label="Poz" className="hover:text-red-600" onClick={() => setDel(f)}><Trash2 size={16} /></IconButton></div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ))}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} total={data.meta.total} onChange={setPage} />}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Faýly üýtgetmek" : "Täze gollanma"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Ýatyr</Button><Button onClick={save} loading={busy}>Ýatda sakla</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Topar"><Select value={edit.group_id} onChange={(e) => setEdit({ ...edit, group_id: Number(e.target.value) })}><option value={0}>— saýlaň —</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
            <FileUploader value={edit.file} onChange={(p) => setEdit({ ...edit, file: p })} onUploaded={(name) => setEdit((e) => (e ? { ...e, original_name: e.original_name || name } : e))} folder="gollanma" kind="document" label="Faýl (PDF, DOCX, ZIP, surat...)" />
            <Field label="Görkeziljek ady"><Input value={edit.original_name} onChange={(e) => setEdit({ ...edit, original_name: e.target.value })} /></Field>
            <Field label="Bellik"><Input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy} text="Bu gollanmany pozmak isleýärsiňizmi?" />
    </>
  );
}
