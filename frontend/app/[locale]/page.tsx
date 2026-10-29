import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, GraduationCap, Mail } from "lucide-react";
import BannerSlot from "@/components/site/BannerSlot";
import HeroSlider from "@/components/site/HeroSlider";
import StatsBand from "@/components/site/StatsBand";
import { EmptyState, NewsCard, PageCard, SectionHeading } from "@/components/site/ui";
import { safeGet } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteData, menuHref, pickAbout, pickSpecialties } from "@/lib/site";
import type { ExternalNews, NewsItem, Page, Slide } from "@/lib/types";
import { stripHtml, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const { settings, menus } = await getSiteData(locale);
  const specialties = pickSpecialties(menus);
  const aboutItem = pickAbout(menus);

  const [slides, latest, external, about] = await Promise.all([
    safeGet<Slide[]>("/slides", [], { lang: locale }),
    safeGet<NewsItem[]>("/news/latest", [], { lang: locale, query: { limit: 6 } }),
    settings.external_news_enabled ? safeGet<ExternalNews[]>("/external-news", [], { lang: locale, query: { limit: 8 } }) : Promise.resolve([] as ExternalNews[]),
    aboutItem ? safeGet<Page | null>(`/pages/${aboutItem.slug}`, null, { lang: locale }) : Promise.resolve(null),
  ]);

  return (
    <>
      <HeroSlider slides={slides} locale={locale} dict={dict} siteTitle={settings.site_title} specialtiesHref={specialties ? menuHref(locale, specialties) : null} />
      <StatsBand stats={settings.stats} dict={dict} />

      {about && about.content && (
        <section className="container-x py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-full w-full rounded-3xl bg-gradient-to-br from-brand-500/10 to-accent-500/10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={about.image_url || slides[0]?.image_url || "/images/page-header.jpg"} alt="" className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
            </div>
            <div>
              <p className="eyebrow mb-3">{dict.aboutUs}</p>
              <SectionHeading title={about.title} />
              <p className="text-lg leading-relaxed text-ink-muted">{truncate(stripHtml(about.content), 520)}</p>
              <Link href={menuHref(locale, about)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">
                {dict.aboutCta} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {specialties && specialties.children.length > 0 && (
        <section className="bg-surface-2 py-16">
          <div className="container-x">
            <SectionHeading title={dict.ourSpecialties} subtitle={dict.specialtiesIntro} action={{ href: menuHref(locale, specialties), label: dict.all }} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {specialties.children.map((c) => (
                <PageCard key={c.id} item={c} href={menuHref(locale, c)} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-x py-16">
        <SectionHeading title={dict.newsFromSchool} action={{ href: `/${locale}/news`, label: dict.allNews }} />
        {latest.length === 0 ? (
          <EmptyState text={dict.noNews} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((n) => <NewsCard key={n.id} item={n} locale={locale} dict={dict} />)}
          </div>
        )}
      </section>

      {external.length > 0 && (
        <section className="bg-gradient-to-b from-brand-500/10 to-transparent py-16">
          <div className="container-x">
            <SectionHeading title={dict.externalNews} subtitle="merkez.bilim.tm" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {external.map((e) => (
                <Link key={e.id} href={e.url} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
                  <div className="aspect-[16/10] overflow-hidden bg-surface-2">
                    {e.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold leading-snug line-clamp-3 group-hover:text-brand-600 dark:group-hover:text-brand-300">{e.title}</h3>
                    {e.short_description && <p className="mt-2 text-xs text-ink-muted line-clamp-2">{e.short_description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Banners chosen in the admin panel (position: home) */}
      <BannerSlot position="home" locale={locale} layout="row" className="container-x pb-4 pt-6" />

      <section className="container-x pb-4 pt-8">
        <div className="gradient-brand overflow-hidden rounded-3xl px-6 py-12 text-white shadow-card sm:px-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{dict.moodle}</h2>
              <p className="mt-3 max-w-2xl text-white/85">{dict.moodleText}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {settings.moodle_url && (
                <a href={settings.moodle_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-700 shadow transition hover:bg-brand-50">
                  <GraduationCap size={18} /> {dict.goToPortal} <ExternalLink size={14} />
                </a>
              )}
              <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full border border-white/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                <Mail size={18} /> {dict.contactUs}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
