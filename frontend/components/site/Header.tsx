"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, LogIn, Mail, Menu, Phone, Search, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang, MenuItem, PublicSettings } from "@/lib/types";
import { menuHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import LangSwitcher from "./LangSwitcher";

interface Props {
  locale: Lang;
  dict: Dictionary;
  settings: PublicSettings;
  menus: MenuItem[];
}

export default function Header({ locale, dict, settings, menus }: Props) {
  const pathname = usePathname();
  // The mobile drawer is "open for a pathname": navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean) => setOpenFor(v ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const staticLinks = [
    { href: `/${locale}/news`, label: dict.news },
    { href: `/${locale}/contact`, label: dict.contactUs },
  ];
  const logoUrl = settings.logo_url;
  const tel = settings.phone.replace(/[^+\d]/g, "");

  return (
    <header className={cn("sticky top-0 z-50 transition-shadow", scrolled && "shadow-soft")}>
      {/* utility bar */}
      <div className="bg-brand-950 text-white/85">
        <div className="container-x flex h-9 items-center justify-between gap-3 text-[12.5px]">
          <div className="flex min-w-0 items-center gap-5">
            {settings.phone && (
              <a href={`tel:${tel}`} className="flex items-center gap-1.5 transition hover:text-white">
                <Phone size={13} className="text-accent-400" /> <span className="truncate">{settings.phone}</span>
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="hidden items-center gap-1.5 transition hover:text-white sm:flex">
                <Mail size={13} className="text-accent-400" /> <span className="truncate">{settings.email}</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher locale={locale} />
            <span className="mx-1 hidden h-4 w-px bg-white/20 sm:block" />
            <ThemeToggle className="text-white/85 hover:text-white" />
            <Link href={`/${locale}/portal`} className="hidden items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-accent-600 sm:flex">
              <LogIn size={13} /> {dict.login}
            </Link>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="container-x flex h-[76px] items-center justify-between gap-6">
          <Link href={`/${locale}`} className="flex min-w-0 shrink-0 items-center gap-3" aria-label={dict.home}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl || "/images/logo_doly.png"} alt="" className="h-12 w-12 shrink-0 object-contain" />
            {!logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/2025-logo.png" alt="" className="hidden h-11 w-auto shrink-0 object-contain sm:block" />
            )}
            <span className="hidden max-w-[300px] 2xl:block">
              <span className="line-clamp-2 text-[12.5px] font-bold leading-[1.3] text-brand-800 dark:text-brand-200">{settings.site_title}</span>
            </span>
          </Link>

          <nav className="hidden items-center lg:flex" aria-label="Main">
            <Link href={`/${locale}`} className={cn("nav-link", pathname === `/${locale}` && "is-active")}>
              {dict.home}
            </Link>
            {menus.map((m) => (
              <div key={m.id} className="group relative">
                <NavLink item={m} locale={locale} active={isActive(`/${locale}/page/${m.slug}`)} />
                {m.children.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-40 min-w-[270px] translate-y-1 rounded-2xl border border-line bg-card p-2 opacity-0 shadow-card transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {m.children.map((c) => (
                      <div key={c.id} className="group/sub relative">
                        <Link href={menuHref(locale, c)} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300 dark:hover:text-brand-300">
                          <span>{c.title.replace(/^"|"$/g, "")}</span>
                          {c.children.length > 0 && <ChevronRight size={14} className="text-ink-muted" />}
                        </Link>
                        {c.children.length > 0 && (
                          <div className="invisible absolute left-full top-0 z-40 ml-1 min-w-[240px] rounded-2xl border border-line bg-card p-2 opacity-0 shadow-card transition group-hover/sub:visible group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:opacity-100">
                            {c.children.map((g) => (
                              <Link key={g.id} href={menuHref(locale, g)} className="block rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300 dark:hover:text-brand-300">
                                {g.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {staticLinks.map((l) => (
              <Link key={l.href} href={l.href} className={cn("nav-link", isActive(l.href) && "is-active")}>
                {l.label}
              </Link>
            ))}
            <Link href={`/${locale}/search`} aria-label={dict.search} className="ml-2 rounded-full border border-line p-2 text-ink-muted transition hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-300">
              <Search size={17} />
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-xl border border-line p-2 text-ink lg:hidden"
            aria-label={open ? dict.closeMenu : dict.openMenu}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 top-[112px] z-40 overflow-y-auto bg-surface lg:hidden">
          <nav className="container-x flex flex-col py-4" aria-label="Mobile">
            <Link href={`/${locale}`} className="border-b border-line py-3 text-base font-semibold text-ink">{dict.home}</Link>
            {menus.map((m) => (
              <div key={m.id} className="border-b border-line">
                <div className="flex items-center">
                  <Link href={menuHref(locale, m)} className="flex-1 py-3 text-base font-semibold text-ink" target={m.external_url ? "_blank" : undefined}>
                    {m.title}
                  </Link>
                  {m.children.length > 0 && (
                    <button type="button" className="p-3 text-ink-muted" aria-label={expanded[m.id] ? dict.closeMenu : dict.openMenu} aria-expanded={!!expanded[m.id]} onClick={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}>
                      <ChevronDown size={18} className={cn("transition", expanded[m.id] && "rotate-180")} />
                    </button>
                  )}
                </div>
                {m.children.length > 0 && expanded[m.id] && (
                  <div className="mb-2 ml-3 border-l-2 border-brand-500/30 pl-3">
                    {m.children.map((c) => (
                      <div key={c.id}>
                        <Link href={menuHref(locale, c)} className="block py-2 text-sm text-ink-muted hover:text-brand-600 dark:hover:text-brand-300">{c.title}</Link>
                        {c.children.map((g) => (
                          <Link key={g.id} href={menuHref(locale, g)} className="block py-1.5 pl-4 text-sm text-ink-muted hover:text-brand-600 dark:hover:text-brand-300">– {g.title}</Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {staticLinks.map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-line py-3 text-base font-semibold text-ink">{l.label}</Link>
            ))}
            <Link href={`/${locale}/search`} className="border-b border-line py-3 text-base font-semibold text-ink">{dict.search}</Link>
            <Link href={`/${locale}/portal`} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-accent-500 px-4 py-3 font-semibold text-white">
              <LogIn size={16} /> {dict.login}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ item, locale, active }: { item: MenuItem; locale: Lang; active: boolean }) {
  const cls = cn("nav-link", active && "is-active");
  const label = item.title.length > 24 ? item.full_title || item.title : item.title;
  if (item.external_url) {
    return (
      <a href={item.external_url} target="_blank" rel="noopener noreferrer" className={cls}>
        {label} <ExternalLink size={12} className="text-ink-muted" />
      </a>
    );
  }
  return (
    <Link href={menuHref(locale, item)} className={cls} aria-haspopup={item.children.length > 0 ? "true" : undefined}>
      {label}
      {item.children.length > 0 && <ChevronDown size={14} className="text-ink-muted transition group-hover:rotate-180" />}
    </Link>
  );
}
