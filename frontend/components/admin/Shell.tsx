"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, FileText, FolderOpen, Images, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, Newspaper,
  ScrollText, Settings, ShieldCheck, UserCog, Users, X, GalleryHorizontal, ExternalLink, FileDown, Megaphone,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "./AuthProvider";
import { Spinner } from "./ui";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/types";

interface NavItem { href: string; label: string; icon: React.ComponentType<{ size?: number }>; roles?: AdminRole[]; group?: string }

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/admin/news", label: "Habarlar", icon: Newspaper, group: "Mazmun" },
  { href: "/admin/pages", label: "Sahypalar / Menýu", icon: FileText },
  { href: "/admin/slides", label: "Slaýdlar", icon: GalleryHorizontal },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/banners", label: "Bannerlar / reklama", icon: Megaphone },
  { href: "/admin/contacts", label: "Hatlar", icon: MessageSquare },
  { href: "/admin/portal/groups", label: "Toparlar", icon: FolderOpen, roles: ["superadmin", "admin"], group: "Portal" },
  { href: "/admin/portal/users", label: "Ulanyjylar", icon: Users, roles: ["superadmin", "admin"] },
  { href: "/admin/portal/files", label: "Gollanmalar", icon: FileDown, roles: ["superadmin", "admin"] },
  { href: "/admin/admins", label: "Adminler", icon: UserCog, roles: ["superadmin"], group: "Ulgam" },
  { href: "/admin/settings", label: "Sazlamalar", icon: Settings, roles: ["superadmin", "admin"] },
  { href: "/admin/logs", label: "Loglar", icon: ScrollText, roles: ["superadmin", "admin"] },
  { href: "/admin/profile", label: "Profil", icon: KeyRound },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The drawer is "open for a pathname": navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean) => setOpenFor(v ? pathname : null);

  useEffect(() => {
    if (!loading && !admin) router.replace("/admin/login");
  }, [loading, admin, router]);

  if (loading || !admin) return <div className="flex min-h-screen items-center justify-center bg-surface-2"><Spinner /></div>;

  const items = NAV.filter((n) => !n.roles || can(...n.roles));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Admin">
      {items.map((it) => (
        <div key={it.href}>
          {it.group && <p className="mb-1 mt-4 px-3 text-[11px] font-bold uppercase tracking-widest text-white/40">{it.group}</p>}
          <Link href={it.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(it.href) ? "bg-white/15 text-white shadow-inner" : "text-white/75 hover:bg-white/10 hover:text-white")}>
            <it.icon size={18} /> {it.label}
          </Link>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-surface-2">
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-brand-900 to-brand-800 text-white lg:flex">
        <Brand />
        {nav}
        <SidebarFooter />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-brand-900 to-brand-800 text-white shadow-card">
            <div className="flex items-center justify-between pr-2"><Brand /><button onClick={() => setOpen(false)} aria-label="close" className="p-2 text-white/70"><X size={20} /></button></div>
            {nav}
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="menu" className="rounded-lg border border-line p-2 lg:hidden"><Menu size={18} /></button>
            <span className="hidden text-sm font-semibold text-ink-muted sm:block">SDLOHOM admin paneli</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-ink-muted hover:bg-surface-2 hover:text-ink" />
            <Link href="/tm" target="_blank" className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 sm:inline-flex"><ExternalLink size={14} /> Saýt</Link>
            <span className="inline-flex max-w-[55vw] items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-800 dark:text-brand-200" title={`${admin.name} ${admin.surname} · ${admin.role}`}>
              <ShieldCheck size={14} className="shrink-0" /> <span className="truncate">{admin.name} {admin.surname}</span> <span className="hidden rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] uppercase text-white md:inline">{admin.role}</span>
            </span>
            <button onClick={logout} aria-label="Çyk" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 hover:text-red-600 sm:px-3"><LogOut size={14} /> <span className="hidden sm:inline">Çyk</span></button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-5 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-white.png" alt="" className="h-10 w-10 object-contain" />
      <div>
        <p className="text-sm font-black tracking-wide">SDLOHOM</p>
        <p className="text-[11px] text-white/60">Admin panel</p>
      </div>
    </Link>
  );
}

function SidebarFooter() {
  return <p className="px-5 py-4 text-[11px] text-white/40">Go Fiber + Next.js · v2</p>;
}
