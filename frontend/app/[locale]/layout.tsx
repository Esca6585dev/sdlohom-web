import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import VisitTracker from "@/components/site/VisitTracker";
import { isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteData } from "@/lib/site";
import { SITE_URL } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { settings } = await getSiteData(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.site_title, template: `%s | ${settings.site_title}` },
    description: settings.meta_description || settings.site_title,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l === "tm" ? "tk" : l, `/${l}`])),
    },
    openGraph: { siteName: settings.site_title, type: "website", locale },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const { settings, menus } = await getSiteData(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">{dict.skipToContent}</a>
      <Header locale={locale} dict={dict} settings={settings} menus={menus} />
      <main id="main" className="flex-1">{children}</main>
      <Footer locale={locale} dict={dict} settings={settings} menus={menus} />
      <VisitTracker locale={locale} />
    </div>
  );
}
