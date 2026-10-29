"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Eye, Users } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useAsync } from "@/components/admin/hooks";
import { Card, EmptyState, PageHeader, Spinner, StatCard, Table, Td, Th } from "@/components/admin/ui";
import type { Analytics } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = ["#0b5fa5", "#16a34a", "#1d7fd1", "#0f9d6b", "#74ade6", "#6ee7b7", "#094c84", "#0b7a53"];

export default function AnalyticsPage() {
  const { get } = useAuth();
  const [days, setDays] = useState(30);
  const { data, loading, error } = useAsync(() => get<Analytics>("/admin/analytics", { days }), [days]);

  return (
    <>
      <PageHeader
        title="Analitika"
        subtitle="Saýtyň traffigi (botlar hasaba alynmaýar)"
        actions={
          <div className="inline-flex rounded-xl border border-line bg-card p-1">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", days === d ? "bg-brand-600 text-white" : "text-ink-muted hover:text-ink")}>{d} gün</button>
            ))}
          </div>
        }
      />
      {loading && <Spinner />}
      {error && <EmptyState text={error} />}
      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Şu gün" value={data.summary.today} hint={`Düýn: ${data.summary.yesterday}`} icon={Eye} />
            <StatCard label={`${days} günde görülme`} value={days === 7 ? data.summary.last7 : data.summary.last30} icon={Activity} tone="accent" />
            <StatCard label={`${days} günde unikal`} value={data.summary.unique_period} hint={`Şu gün: ${data.summary.unique_today}`} icon={Users} />
            <StatCard label="Jemi görülme" value={data.summary.total} icon={Eye} tone="accent" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card title="Gündelik görülme" className="xl:col-span-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily.map((p) => ({ ...p, label: p.date.slice(5) }))} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="views" name="Görülme" stroke="#0b5fa5" fill="#1d7fd1" fillOpacity={0.25} strokeWidth={2} />
                    <Area type="monotone" dataKey="unique" name="Unikal" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Enjamlar">
              <div className="h-72">
                {data.devices.length === 0 ? <EmptyState text="Maglumat ýok" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.devices} dataKey="views" nameKey="device" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {data.devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card title="Sagat boýunça">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourly} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="views" name="Görülme" fill="#1d7fd1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Brauzerler we OS">
              <div className="grid grid-cols-2 gap-4">
                <BarList title="Brauzer" items={data.browsers.map((b) => ({ k: b.browser, v: b.views }))} />
                <BarList title="OS" items={data.os.map((b) => ({ k: b.os, v: b.views }))} />
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card title="Iň köp görülen sahypalar" className="xl:col-span-1">
              <Table className="shadow-none"><thead><tr><Th>Ýol</Th><Th className="text-right">Görülme</Th></tr></thead><tbody>
                {data.top_pages.map((p) => <tr key={p.path}><Td className="max-w-[240px] truncate font-mono text-xs">{p.path}</Td><Td className="text-right font-semibold">{p.views}</Td></tr>)}
                {data.top_pages.length === 0 && <tr><Td>—</Td><Td /></tr>}
              </tbody></Table>
            </Card>
            <Card title="Nireden geldiler (referer)">
              <Table className="shadow-none"><thead><tr><Th>Çeşme</Th><Th className="text-right">Görülme</Th></tr></thead><tbody>
                {data.referrers.map((r) => <tr key={r.referrer}><Td className="truncate">{r.referrer}</Td><Td className="text-right font-semibold">{r.views}</Td></tr>)}
                {data.referrers.length === 0 && <tr><Td>—</Td><Td /></tr>}
              </tbody></Table>
            </Card>
            <Card title="Iň köp okalan habarlar">
              <Table className="shadow-none"><thead><tr><Th>Habar</Th><Th className="text-right">Okalma</Th></tr></thead><tbody>
                {data.top_news.map((n) => <tr key={n.id}><Td className="max-w-[260px] truncate">{n.title}</Td><Td className="text-right font-semibold">{n.views}</Td></tr>)}
              </tbody></Table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function BarList({ title, items }: { title: string; items: { k: string; v: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.v));
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</p>
      {items.length === 0 && <p className="text-sm text-ink-muted">—</p>}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.k}>
            <div className="flex justify-between text-xs"><span className="font-semibold">{it.k || "Other"}</span><span className="text-ink-muted">{it.v}</span></div>
            <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(it.v / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
