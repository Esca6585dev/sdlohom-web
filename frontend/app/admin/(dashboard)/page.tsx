"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, FileText, Images, MessageSquare, Newspaper, Users, Activity, CalendarDays } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useAsync } from "@/components/admin/hooks";
import { Badge, Card, EmptyState, PageHeader, Spinner, StatCard } from "@/components/admin/ui";
import type { Dashboard } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { get, admin } = useAuth();
  const { data, loading, error } = useAsync(() => get<Dashboard>("/admin/dashboard"), []);

  if (loading) return <Spinner />;
  if (error || !data) return <EmptyState text={error || "Maglumat ýok"} />;
  const d = data;
  const daily = d.daily.map((p) => ({ ...p, label: p.date.slice(5) }));

  return (
    <>
      <PageHeader title={`Salam, ${admin?.name || admin?.username}!`} subtitle="Saýtyň umumy ýagdaýy" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Şu gün görülme" value={d.visits.today} hint={`Düýn: ${d.visits.yesterday} · unikal: ${d.visits.unique_today}`} icon={Eye} tone="brand" />
        <StatCard label="7 gün / 30 gün" value={`${d.visits.last7} / ${d.visits.last30}`} icon={Activity} tone="accent" />
        <StatCard label="Habarlar" value={d.counts.news} icon={Newspaper} tone="brand" />
        <StatCard label="Sahypalar" value={d.counts.pages} icon={FileText} tone="accent" />
        <StatCard label="Okalmadyk hatlar" value={d.counts.contacts_unread} hint={`Jemi: ${d.counts.contacts_total}`} icon={MessageSquare} tone={d.counts.contacts_unread ? "amber" : "brand"} />
        <StatCard label="Portal ulanyjylary" value={d.counts.users} icon={Users} tone="accent" />
        <StatCard label="Media faýllar" value={d.counts.media} icon={Images} tone="brand" />
        <StatCard label="Slaýdlar / Adminler" value={`${d.counts.slides} / ${d.counts.admins}`} icon={CalendarDays} tone="accent" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Soňky 14 günüň traffigi" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d7fd1" stopOpacity={0.4} /><stop offset="100%" stopColor="#1d7fd1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="views" name="Görülme" stroke="#0b5fa5" fill="url(#gv)" strokeWidth={2} />
                <Area type="monotone" dataKey="unique" name="Unikal" stroke="#16a34a" fill="url(#gu)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Soňky girişler">
          <ul className="divide-y divide-line text-sm">
            {d.recent_logins.length === 0 && <li className="py-2 text-ink-muted">Ýok</li>}
            {d.recent_logins.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.username} <span className="text-xs font-normal text-ink-muted">({l.actor_type})</span></p>
                  <p className="text-xs text-ink-muted">{formatDateTime(l.created_at)} · {l.ip}</p>
                </div>
                <Badge tone={l.event === "login" ? "success" : l.event === "failed" ? "danger" : "neutral"}>{l.event}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Soňky hatlar" actions={<Link href="/admin/contacts" className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Ählisi</Link>}>
          {d.recent_contacts.length === 0 ? <p className="text-sm text-ink-muted">Hat ýok.</p> : (
            <ul className="divide-y divide-line text-sm">
              {d.recent_contacts.map((c) => (
                <li key={c.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{c.name} <span className="text-xs font-normal text-ink-muted">{c.email}</span></p>
                    {!c.is_read && <Badge tone="warning">täze</Badge>}
                  </div>
                  <p className="mt-0.5 text-ink-muted line-clamp-2">{c.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Soňky habarlar" actions={<Link href="/admin/news" className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Ählisi</Link>}>
          <ul className="divide-y divide-line text-sm">
            {d.recent_news.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2">
                <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {n.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/news/${n.id}`} className="block truncate font-semibold hover:text-brand-700 dark:hover:text-brand-300">{n.title}</Link>
                  <p className="text-xs text-ink-muted">{formatDateTime(n.published_at)} · {n.views} görülme</p>
                </div>
                <Badge tone={n.is_published ? "success" : "neutral"}>{n.is_published ? "çap" : "garalama"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
