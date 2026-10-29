import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalClient from "@/components/site/PortalClient";
import { PageHeader } from "@/components/site/ui";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getDictionary(locale).login : "Login", robots: { index: false } };
}

export default async function PortalPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.login} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.login, slug: "portal" }]} />
      <div className="container-x py-12">
        <PortalClient dict={dict} locale={locale} />
      </div>
    </>
  );
}
