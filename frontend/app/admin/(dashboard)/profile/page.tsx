"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { errMsg } from "@/components/admin/hooks";
import { useToast } from "@/components/admin/Toast";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export default function ProfilePage() {
  const { admin, send } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.new_password.length < 6) return toast.error("Täze parol azyndan 6 belgi");
    if (form.new_password !== form.confirm) return toast.error("Parollar gabat gelmeýär");
    setBusy(true);
    try {
      await send("POST", "/auth/admin/change-password", { current_password: form.current_password, new_password: form.new_password });
      toast.success("Parol üýtgedildi");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Profil" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Hasabym">
          {admin && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Ady</dt><dd className="font-semibold">{admin.name} {admin.surname}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Ulanyjy ady</dt><dd className="font-semibold">@{admin.username}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Rol</dt><dd><Badge tone="brand">{admin.role}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Soňky giriş</dt><dd>{admin.last_login_at ? formatDateTime(admin.last_login_at) : "—"}</dd></div>
            </dl>
          )}
        </Card>
        <Card title="Paroly üýtgetmek">
          <form onSubmit={save} className="space-y-4">
            <Field label="Häzirki parol"><Input type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} autoComplete="current-password" required /></Field>
            <Field label="Täze parol"><Input type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} autoComplete="new-password" required /></Field>
            <Field label="Täze paroly gaýtala"><Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" required /></Field>
            <Button type="submit" loading={busy}><KeyRound size={16} /> Üýtget</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
