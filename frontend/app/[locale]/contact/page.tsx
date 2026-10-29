import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/site/ContactForm";
import { PageHeader } from "@/components/site/ui";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteData } from "@/lib/site";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getDictionary(locale).contactUs : "Contact" };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const { settings } = await getSiteData(locale);
  const cards = [
    { icon: MapPin, label: dict.address, value: settings.address, href: settings.map_url || undefined },
    { icon: Phone, label: dict.phone, value: settings.phone, href: settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, "")}` : undefined },
    { icon: Mail, label: dict.email, value: settings.email, href: settings.email ? `mailto:${settings.email}` : undefined },
  ].filter((c) => c.value);

  return (
    <>
      <PageHeader title={dict.contactUs} locale={locale} dict={dict} crumbs={[{ id: 0, title: dict.contactUs, slug: "contact" }]} image="/images/contact-header.jpg" />
      <div className="container-x py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <a key={c.label} href={c.href} className="flex min-w-0 items-start gap-4 rounded-2xl border border-line bg-card p-5 shadow-soft transition hover:shadow-card">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 p-3 text-white"><c.icon size={22} /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{c.label}</p>
                <p className="mt-1 font-semibold text-ink [overflow-wrap:anywhere]">{c.value}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="relative rounded-2xl border border-line bg-card p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-black text-brand-900 dark:text-brand-100">{dict.writeUs}</h2>
            <p className="mb-6 mt-2 text-ink-muted">{dict.contactIntro}</p>
            <ContactForm dict={dict} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-soft">
            {settings.map_url ? (
              <iframe src={settings.map_url} title={dict.mapTitle} className="h-full min-h-[420px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/contact-header.jpg" alt="" className="h-full min-h-[320px] w-full object-cover" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
