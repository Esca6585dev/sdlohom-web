"use client";

import { useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useAsync } from "@/components/admin/hooks";
import { Badge, EmptyState, PageHeader, Pagination, Select, Spinner, Table, Td, Th } from "@/components/admin/ui";
import type { AuditLog, LoginLog } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export default function LogsPage() {
  const { list } = useAuth();
  const [tab, setTab] = useState<"login" | "audit">("login");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);
  const loginQ = useAsync(() => (tab === "login" ? list<LoginLog>("/admin/logs/login", { actor_type: actor, page, limit: 30 }) : Promise.resolve(null)), [tab, actor, page]);
  const auditQ = useAsync(() => (tab === "audit" ? list<AuditLog>("/admin/logs/audit", { page, limit: 30 }) : Promise.resolve(null)), [tab, page]);

  const tabBtn = (k: typeof tab, l: string) => (
    <button onClick={() => { setTab(k); setPage(1); }} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", tab === k ? "bg-brand-600 text-white" : "text-ink-muted hover:text-ink")}>{l}</button>
  );

  return (
    <>
      <PageHeader title="Loglar" actions={<div className="inline-flex rounded-xl border border-line bg-card p-1">{tabBtn("login", "Girişler")}{tabBtn("audit", "Admin hereketleri")}</div>} />
      {tab === "login" && (
        <>
          <div className="mb-4"><Select className="w-48" value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }}><option value="">Ählisi</option><option value="admin">Admin panel</option><option value="portal">Portal</option></Select></div>
          {loginQ.loading && <Spinner />}
          {loginQ.data && !loginQ.loading && (loginQ.data.data.length === 0 ? <EmptyState text="Ýazgy ýok" /> : (
            <Table>
              <thead><tr><Th>Wagty</Th><Th>Ulanyjy</Th><Th>Nirede</Th><Th>Waka</Th><Th>IP</Th><Th>Brauzer</Th></tr></thead>
              <tbody>
                {loginQ.data.data.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-2/60">
                    <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(l.created_at)}</Td>
                    <Td className="font-semibold">{l.username}</Td>
                    <Td>{l.actor_type}</Td>
                    <Td><Badge tone={l.event === "login" ? "success" : l.event === "failed" ? "danger" : "neutral"}>{l.event}</Badge></Td>
                    <Td className="font-mono text-xs">{l.ip || "—"}</Td>
                    <Td className="max-w-[280px] truncate text-xs text-ink-muted" title={l.user_agent}>{l.user_agent}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ))}
          {loginQ.data && <Pagination page={loginQ.data.meta.page} totalPages={loginQ.data.meta.total_pages} total={loginQ.data.meta.total} onChange={setPage} />}
        </>
      )}
      {tab === "audit" && (
        <>
          {auditQ.loading && <Spinner />}
          {auditQ.data && !auditQ.loading && (auditQ.data.data.length === 0 ? <EmptyState text="Ýazgy ýok" /> : (
            <Table>
              <thead><tr><Th>Wagty</Th><Th>Admin</Th><Th>Hereket</Th><Th>Obýekt</Th><Th>Jikme-jik</Th><Th>IP</Th></tr></thead>
              <tbody>
                {auditQ.data.data.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2/60">
                    <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(a.created_at)}</Td>
                    <Td className="font-semibold">{a.admin_username}</Td>
                    <Td><Badge tone={a.action === "delete" ? "danger" : a.action === "create" ? "success" : "brand"}>{a.action}</Badge></Td>
                    <Td>{a.entity}{a.entity_id ? ` #${a.entity_id}` : ""}</Td>
                    <Td className="max-w-[320px] truncate text-ink-muted" title={a.details}>{a.details}</Td>
                    <Td className="font-mono text-xs">{a.ip}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ))}
          {auditQ.data && <Pagination page={auditQ.data.meta.page} totalPages={auditQ.data.meta.total_pages} total={auditQ.data.meta.total} onChange={setPage} />}
        </>
      )}
    </>
  );
}
