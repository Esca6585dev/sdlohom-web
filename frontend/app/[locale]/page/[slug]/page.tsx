import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import BannerSlot from "@/components/site/BannerSlot";
import { EmptyState, HtmlContent, NewsCard, PageCard, PageHeader } from "@/components/site/ui";
import { safeGet } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { menuHref } from "@/lib/site";
import type { NewsItem, Page } from "@/lib/types";
import { formatDate, stripHtml, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await safeGet<Page | null>(`/pages/${encodeURIComponent(slug)}`, null, { lang: locale });
  if (!p) return { title: getDictionary(locale).pageNotFound };
  return { title: p.full_title || p.title, description: truncate(stripHtml(p.content), 160) || p.title, openGraph: { images: p.image_url ? [p.image_url] : undefined } };
}

export default async function ContentPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const p = await safeGet<Page | null>(`/pages/${encodeURIComponent(slug)}`, null, { lang: locale });
  if (!p) notFound();
  const latest = await safeGet<NewsItem[]>("/news/latest", [], { lang: locale, query: { limit: 3 } });
  const sideList = p.children.length > 0 ? p.children : p.siblings;
  const sideTitle = p.children.length > 0 ? dict.categories : dict.relatedPages;
  const crumbs = p.breadcrumbs.map((b) => ({ ...b, href: `/${locale}/page/${b.slug}` }));

  return (
    <>
      <PageHeader title={p.full_title || p.title} locale={locale} dict={dict} crumbs={crumbs} />
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {p.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" className="mb-8 max-h-[520px] w-full rounded-2xl object-cover shadow-card" />
          )}
          {p.video_url && (
            <video controls preload="metadata" className="mb-8 w-full rounded-2xl bg-black shadow-card">
              <source src={p.video_url} type="video/mp4" />
            </video>
          )}
          {p.has_content ? <HtmlContent html={p.content} /> : p.children.length === 0 && <EmptyState text={dict.noContent} />}
          {p.children.length > 0 && (
            <section className={p.has_content ? "mt-12" : ""}>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {p.children.map((c) => <PageCard key={c.id} item={c} href={menuHref(locale, c)} dict={dict} />)}
              </div>
            </section>
          )}
          <p className="mt-10 inline-flex items-center gap-1.5 text-xs text-ink-muted"><Clock size={13} /> {dict.updated}: {formatDate(p.updated_at, locale)}</p>
        </div>
        <aside className="space-y-6">
          {sideList.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
              <h2 className="bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">{sideTitle}</h2>
              <ul className="divide-y divide-line">
                {sideList.map((s) => (
                  <li key={s.id}>
                    <Link href={menuHref(locale, s)} className="flex items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-ink transition hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300">
                      <span>{s.title.replace(/^"|"$/g, "")}</span> <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <BannerSlot position="page_sidebar" locale={locale} />
          {latest.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{dict.recentNews}</h2>
              <div className="space-y-4">{latest.map((n) => <NewsCard key={n.id} item={n} locale={locale} dict={dict} compact />)}</div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
