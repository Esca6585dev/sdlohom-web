import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink } from "lucide-react";
import { HtmlContent, PageHeader } from "@/components/site/ui";
import { safeGet } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; id: string }> };
type Raw = Record<string, unknown>;

function str(o: Raw | null, ...keys: string[]): string {
  if (!o) return "";
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const item = await safeGet<Raw | null>(`/external-news/${encodeURIComponent(id)}`, null, { lang: locale });
  return { title: str(item, "title") || getDictionary(locale).externalNews, robots: { index: false } };
}

export default async function ExternalNewsPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^\d+$/.test(id)) notFound();
  const dict = getDictionary(locale);
  const item = await safeGet<Raw | null>(`/external-news/${id}`, null, { lang: locale });
  if (!item) {
    // The central news service is temporarily unavailable: show a friendly fallback instead of a 404.
    return (
      <>
        <PageHeader title={dict.externalNews} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.externalNews, slug: "external-news" }]} />
        <div className="container-x py-16 text-center">
          <p className="mx-auto max-w-xl text-lg text-ink-muted">{dict.externalUnavailable}</p>
          <a href={`https://merkez.bilim.tm/`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            merkez.bilim.tm <ExternalLink size={16} />
          </a>
        </div>
      </>
    );
  }
  const title = str(item, "title");
  const image = str(item, "image", "image_thumbnail");
  const body = str(item, "content", "description", "text", "body", "short_description");
  const date = str(item, "published_at", "created_at", "date");
  const isHtml = /<[a-z][\s\S]*>/i.test(body);

  return (
    <>
      <PageHeader title={title} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.externalNews, slug: "external-news" }]} image={image || undefined} />
      <article className="container-x max-w-4xl py-12">
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
          {date && <span className="inline-flex items-center gap-1.5"><Calendar size={15} className="text-brand-500" /> {formatDate(date, locale)}</span>}
          <a href="https://merkez.bilim.tm" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:hover:text-brand-300">merkez.bilim.tm <ExternalLink size={13} /></a>
        </div>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="mb-8 max-h-[560px] w-full rounded-2xl object-cover shadow-card" />
        )}
        {isHtml ? <HtmlContent html={body} /> : <p className="whitespace-pre-line text-lg leading-relaxed">{body}</p>}
      </article>
    </>
  );
}
