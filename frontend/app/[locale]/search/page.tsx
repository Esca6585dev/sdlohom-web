import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { EmptyState, NewsCard, PageHeader } from "@/components/site/ui";
import { safeGet } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { menuHref } from "@/lib/site";
import type { MenuItem, NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getDictionary(locale).search : "Search", robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const q = ((await searchParams).q || "").trim();
  const res = q ? await safeGet<{ news: NewsItem[]; pages: MenuItem[] }>("/search", { news: [], pages: [] }, { lang: locale, query: { q } }) : { news: [], pages: [] };
  const total = res.news.length + res.pages.length;

  return (
    <>
      <PageHeader title={dict.search} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.search, slug: "search" }]} />
      <div className="container-x py-12">
        <form className="mx-auto mb-10 flex max-w-2xl gap-2" action={`/${locale}/search`} method="get">
          <label className="relative flex-1">
            <span className="sr-only">{dict.search}</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={q} placeholder={dict.searchHint} autoFocus className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25" />
          </label>
          <button className="rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">{dict.search}</button>
        </form>
        {q && <p className="mb-6 text-sm text-ink-muted">{dict.searchResults}: <strong>{q}</strong> ({total})</p>}
        {q && total === 0 && <EmptyState text={dict.noResults} />}
        {res.pages.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold">{dict.pages}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {res.pages.map((p) => (
                <li key={p.id}>
                  <Link href={menuHref(locale, p)} className="flex gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft transition hover:border-brand-300 hover:shadow-card">
                    <FileText size={20} className="shrink-0 text-brand-500" />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{p.title}</p>
                      {p.excerpt && <p className="mt-1 text-sm text-ink-muted line-clamp-2">{p.excerpt}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {res.news.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">{dict.news}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {res.news.map((n) => <NewsCard key={n.id} item={n} locale={locale} dict={dict} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
