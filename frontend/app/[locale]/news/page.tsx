import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { EmptyState, NewsCard, PageHeader, Pagination } from "@/components/site/ui";
import { safeList } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string; q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).news };
}

export default async function NewsListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q = (sp.q || "").trim();
  const { data, meta } = await safeList<NewsItem>("/news", { lang: locale, query: { page, limit: 12, q } });

  return (
    <>
      <PageHeader title={dict.pageHeaderNews} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.news, slug: "news" }]} />
      <div className="container-x py-12">
        <form className="mb-8 flex max-w-xl gap-2" action={`/${locale}/news`} method="get">
          <label className="relative flex-1">
            <span className="sr-only">{dict.search}</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={q} placeholder={dict.searchPlaceholder} className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25" />
          </label>
          <button className="rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">{dict.search}</button>
        </form>
        {q && <p className="mb-6 text-sm text-ink-muted">{dict.searchResults}: <strong>{q}</strong> ({meta.total})</p>}
        {data.length === 0 ? (
          <EmptyState text={q ? dict.noResults : dict.noNews} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((n) => <NewsCard key={n.id} item={n} locale={locale} dict={dict} />)}
          </div>
        )}
        <Pagination page={meta.page} totalPages={meta.total_pages} dict={dict} href={(p) => `/${locale}/news?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
      </div>
    </>
  );
}
