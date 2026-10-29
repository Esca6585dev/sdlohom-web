import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Eye, Mail } from "lucide-react";
import BannerSlot from "@/components/site/BannerSlot";
import { HtmlContent, PageHeader } from "@/components/site/ui";
import { safeGet } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { News } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const n = await safeGet<News | null>(`/news/${encodeURIComponent(slug)}`, null, { lang: locale });
  if (!n) return { title: getDictionary(locale).pageNotFound };
  return {
    title: n.title,
    description: n.excerpt,
    openGraph: { title: n.title, description: n.excerpt, images: n.image_url ? [n.image_url] : undefined, type: "article", publishedTime: n.published_at },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const n = await safeGet<News | null>(`/news/${encodeURIComponent(slug)}`, null, { lang: locale });
  if (!n) notFound();

  return (
    <>
      <PageHeader title={n.title} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.news, slug: "news", href: `/${locale}/news` }, { id: n.id, title: n.title, slug: n.slug }]} image={n.image_url || undefined} />
      <article className="container-x grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><Calendar size={15} className="text-brand-500" /> {formatDate(n.published_at, locale, true)}</span>
            <span className="inline-flex items-center gap-1.5"><Eye size={15} className="text-brand-500" /> {n.views} {dict.views.toLowerCase()}</span>
          </div>
          {n.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.image_url} alt="" className="mb-8 max-h-[560px] w-full rounded-2xl object-cover shadow-card" />
          )}
          {n.video_url && (
            <video controls preload="metadata" className="mb-8 w-full rounded-2xl bg-black shadow-card">
              <source src={n.video_url} type="video/mp4" />
            </video>
          )}
          <HtmlContent html={n.content || `<p>${n.excerpt}</p>`} />
          <nav className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="News navigation">
            {n.prev ? (
              <Link href={`/${locale}/news/${n.prev.slug}`} className="group rounded-2xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-500/10">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-ink-muted"><ChevronLeft size={14} /> {dict.prevNews}</span>
                <p className="mt-1 font-semibold line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-300">{n.prev.title}</p>
              </Link>
            ) : <span />}
            {n.next && (
              <Link href={`/${locale}/news/${n.next.slug}`} className="group rounded-2xl border border-line p-4 text-right transition hover:border-brand-300 hover:bg-brand-500/10">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-ink-muted">{dict.nextNews} <ChevronRight size={14} /></span>
                <p className="mt-1 font-semibold line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-300">{n.next.title}</p>
              </Link>
            )}
          </nav>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          {/* Related news: compact list */}
          <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
            <h2 className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">
              {dict.relatedNews}
            </h2>
            {n.related.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">{dict.noNews}</p>
            ) : (
              <ul className="divide-y divide-line">
                {n.related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/${locale}/news/${r.slug}`} className="group flex gap-3 px-4 py-3 transition hover:bg-brand-500/10">
                      <span className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {r.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-snug text-ink line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-300">{r.title}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><Calendar size={11} /> {formatDate(r.published_at, locale)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/${locale}/news`} className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300">
              {dict.allNews} <ArrowRight size={15} />
            </Link>
          </section>

          {/* Banners / ads chosen in the admin panel (position: news_sidebar) */}
          <BannerSlot position="news_sidebar" locale={locale} label={dict.news} />

          <Link href={`/${locale}/contact`} className="gradient-brand flex items-center gap-3 rounded-2xl p-5 text-white shadow-card transition hover:opacity-95">
            <span className="rounded-xl bg-white/15 p-2.5"><Mail size={20} /></span>
            <span>
              <span className="block text-sm font-bold">{dict.contactUs}</span>
              <span className="block text-xs text-white/80">{dict.contactIntro}</span>
            </span>
          </Link>
        </aside>
      </article>
    </>
  );
}
