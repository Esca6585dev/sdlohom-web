import Link from "next/link";
import { ExternalLink, Mail, MapPin, Phone, Send } from "lucide-react";

type IconProps = { size?: number };
const Facebook = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4V14h2.8v8h3.3z" /></svg>
);
const Instagram = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);
const Youtube = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.2zM9.8 15.1V8.9l6 3.1-6 3.1z" /></svg>
);
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang, MenuItem, PublicSettings } from "@/lib/types";
import { menuHref } from "@/lib/site";

interface Props {
  locale: Lang;
  dict: Dictionary;
  settings: PublicSettings;
  menus: MenuItem[];
}

export default function Footer({ locale, dict, settings, menus }: Props) {
  const socials = [
    { href: settings.social.facebook, icon: Facebook, label: "Facebook" },
    { href: settings.social.instagram, icon: Instagram, label: "Instagram" },
    { href: settings.social.youtube, icon: Youtube, label: "YouTube" },
    { href: settings.social.telegram, icon: Send, label: "Telegram" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-16 bg-brand-900 text-white">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500" />
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logo_url || "/images/logo-white.png"} alt="" className="h-14 w-14 object-contain" />
            <p className="text-sm font-bold uppercase leading-snug">{settings.site_title}</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{settings.meta_description || dict.specialtiesIntro}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="rounded-full bg-white/10 p-2.5 transition hover:bg-accent-500">
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-accent-300">{dict.quickLinks}</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`/${locale}`} className="text-white/80 hover:text-white">{dict.home}</Link>
            </li>
            {menus.map((m) => (
              <li key={m.id}>
                {m.external_url ? (
                  <a href={m.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-white/80 hover:text-white">
                    {m.title} <ExternalLink size={12} />
                  </a>
                ) : (
                  <Link href={menuHref(locale, m)} className="text-white/80 hover:text-white">{m.title}</Link>
                )}
              </li>
            ))}
            <li><Link href={`/${locale}/news`} className="text-white/80 hover:text-white">{dict.news}</Link></li>
            <li><Link href={`/${locale}/contact`} className="text-white/80 hover:text-white">{dict.contactUs}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-accent-300">{dict.contactUs}</h3>
          <ul className="space-y-3 text-sm text-white/80">
            {settings.address && (
              <li className="flex gap-3"><MapPin size={18} className="shrink-0 text-accent-300" /><span>{settings.address}</span></li>
            )}
            {settings.phone && (
              <li className="flex gap-3"><Phone size={18} className="shrink-0 text-accent-300" /><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="hover:text-white">{settings.phone}</a></li>
            )}
            {settings.email && (
              <li className="flex gap-3"><Mail size={18} className="shrink-0 text-accent-300" /><a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a></li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-accent-300">{dict.moodle}</h3>
          <p className="text-sm text-white/70">{dict.moodleText}</p>
          {settings.moodle_url && (
            <a href={settings.moodle_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600">
              {dict.goToPortal} <ExternalLink size={14} />
            </a>
          )}
          <Link href={`/${locale}/portal`} className="mt-3 block text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
            {dict.login}
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.site_title}. {dict.copyright}.</p>
          <p>sdlohom.edu.tm</p>
        </div>
      </div>
    </footer>
  );
}
