import Link from "next/link";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Eye, Home } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang, MenuItem, NewsItem, PageRef } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-brand-900 dark:text-brand-100 sm:text-3xl">{title}</h2>
        <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
        {subtitle && <p className="mt-3 max-w-2xl text-ink-muted">{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 transition hover:bg-brand-500/10">
          {action.label} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function NewsCard({ item, locale, dict, compact = false }: { item: NewsItem; locale: Lang; dict: Dictionary; compact?: boolean }) {
  const href = `/${locale}/news/${item.slug}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <Link href={href} className={cn("relative block overflow-hidden bg-brand-500/10", compact ? "aspect-[16/9]" : "aspect-[16/10]")}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_doly.png" alt="" className="h-20 w-20 opacity-40" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 shadow">
          <Calendar size={12} /> {formatDate(item.published_at, locale)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className={cn("font-bold leading-snug text-ink group-hover:text-brand-700 dark:hover:text-brand-300", compact ? "text-base line-clamp-2" : "text-lg line-clamp-2")}>
          <Link href={href}>{item.title}</Link>
        </h3>
        {!compact && <p className="mt-2 text-sm text-ink-muted line-clamp-3">{item.excerpt}</p>}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <Link href={href} className="inline-flex items-center gap-1 font-semibold text-accent-600 hover:text-accent-700">
            {dict.readMore} <ArrowRight size={15} />
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted"><Eye size={13} /> {item.views}</span>
        </div>
      </div>
    </article>
  );
}

export function PageCard({ item, href, dict }: { item: MenuItem; href: string; dict: Dictionary }) {
  const external = !!item.external_url;
  const Wrapper = external ? "a" : Link;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <Wrapper href={href} className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-500/10 to-accent-500/10" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_doly.png" alt="" className="h-24 w-24 opacity-30" />
          </div>
        )}
      </Wrapper>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-brand-700 dark:hover:text-brand-300">
          <Wrapper href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{item.title.replace(/^"|"$/g, "")}</Wrapper>
        </h3>
        {item.excerpt && <p className="mt-2 text-sm text-ink-muted line-clamp-3">{item.excerpt}</p>}
        <div className="mt-auto pt-4">
          <Wrapper href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {dict.readMore} <ArrowRight size={15} />
          </Wrapper>
        </div>
      </div>
    </article>
  );
}

export function PageHeader({ title, locale, dict, crumbs = [], image }: { title: string; locale: Lang; dict: Dictionary; crumbs?: (PageRef & { href?: string })[]; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-900 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image || "/images/page-header.jpg"} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-800/80 to-accent-700/60" />
      <div className="container-x relative py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-white/80">
          <Link href={`/${locale}`} className="inline-flex items-center gap-1 hover:text-white"><Home size={14} /> {dict.home}</Link>
          {crumbs.map((c, idx) => (
            <span key={`${c.id}-${idx}`} className="inline-flex items-center gap-1">
              <ChevronRight size={14} className="text-white/50" />
              {idx < crumbs.length - 1 && c.href ? <Link href={c.href} className="hover:text-white">{c.title}</Link> : <span className="text-white">{c.title}</span>}
            </span>
          ))}
        </nav>
        <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
      </div>
    </section>
  );
}

export function Pagination({ page, totalPages, href, dict }: { page: number; totalPages: number; href: (p: number) => string; dict: Dictionary }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      <PLink disabled={page <= 1} href={href(page - 1)} label={dict.prev}><ChevronLeft size={16} /></PLink>
      {pages[0] > 1 && <><PLink href={href(1)} label="1">1</PLink><span className="px-1 text-ink-muted">…</span></>}
      {pages.map((p) => (
        <PLink key={p} href={href(p)} active={p === page} label={String(p)}>{p}</PLink>
      ))}
      {pages[pages.length - 1] < totalPages && <><span className="px-1 text-ink-muted">…</span><PLink href={href(totalPages)} label={String(totalPages)}>{totalPages}</PLink></>}
      <PLink disabled={page >= totalPages} href={href(page + 1)} label={dict.next}><ChevronRight size={16} /></PLink>
    </nav>
  );
}

function PLink({ href, children, active, disabled, label }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean; label: string }) {
  const cls = cn(
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition",
    active ? "bg-brand-600 text-white" : "border border-line bg-card text-ink hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300",
    disabled && "pointer-events-none opacity-40",
  );
  return <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>{children}</Link>;
}

export function HtmlContent({ html, className }: { html: string; className?: string }) {
  return <div className={cn("prose-legacy", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-10 text-center text-ink-muted">{text}</div>;
}
