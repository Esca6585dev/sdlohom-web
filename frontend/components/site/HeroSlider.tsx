"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  slides: Slide[];
  locale: Lang;
  dict: Dictionary;
  siteTitle: string;
  specialtiesHref: string | null;
}

const INTERVAL = 7000;

export default function HeroSlider({ slides, locale, dict, siteTitle, specialtiesHref }: Props) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const next = useCallback(() => setI((v) => (n ? (v + 1) % n : 0)), [n]);
  const prev = useCallback(() => setI((v) => (n ? (v - 1 + n) % n : 0)), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [n, next, paused, i]);

  const s = slides[i];
  return (
    <section
      className="relative isolate min-h-[540px] overflow-hidden bg-brand-950 text-white lg:min-h-[640px]"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((sl, idx) => (
        <div key={sl.id} className={cn("absolute inset-0 transition-opacity duration-1000", idx === i ? "opacity-100" : "opacity-0")} aria-hidden={idx !== i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sl.image_url} alt="" className={cn("h-full w-full object-cover", idx === i && "animate-ken-burns")} loading={idx === 0 ? "eager" : "lazy"} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/70 to-brand-900/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-transparent to-brand-950/20" />

      <div className="container-x relative flex min-h-[540px] flex-col justify-center py-20 lg:min-h-[640px]">
        <div key={s?.id ?? "static"} className="max-w-3xl">
          {s?.caption && (
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> {s.caption}
            </p>
          )}
          <h1 className="animate-fade-up delay-100 mt-5 text-[1.75rem] font-bold leading-[1.15] tracking-tight drop-shadow-sm sm:text-4xl lg:text-[2.75rem]">
            {s?.title || siteTitle}
          </h1>
          {s?.subtitle && <p className="animate-fade-up delay-200 mt-4 text-lg font-semibold text-accent-300 sm:text-2xl">{s.subtitle}</p>}
          <div className="animate-fade-up delay-300 mt-9 flex flex-wrap gap-3">
            {specialtiesHref && (
              <Link href={specialtiesHref} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-900/30 transition hover:bg-accent-600">
                {dict.heroCta} <ArrowRight size={17} />
              </Link>
            )}
            <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15">
              {dict.heroCta2}
            </Link>
          </div>
        </div>
      </div>

      {n > 1 && (
        <>
          <div className="container-x absolute inset-x-0 bottom-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs tracking-widest text-white/70">
                {String(i + 1).padStart(2, "0")} <span className="text-white/40">/ {String(n).padStart(2, "0")}</span>
              </span>
              <div className="flex gap-1.5">
                {slides.map((sl, idx) => (
                  <button key={sl.id} type="button" aria-label={`${idx + 1}`} aria-current={idx === i} onClick={() => setI(idx)} className="relative h-1 w-10 overflow-hidden rounded-full bg-white/25">
                    {idx === i && <span key={`${sl.id}-${paused}`} className="absolute inset-y-0 left-0 bg-accent-400 animate-progress" style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }} />}
                    {idx < i && <span className="absolute inset-0 bg-white/60" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button type="button" onClick={prev} aria-label={dict.prev} className="rounded-full border border-white/25 bg-white/5 p-2.5 backdrop-blur transition hover:bg-white/20"><ChevronLeft size={18} /></button>
              <button type="button" onClick={next} aria-label={dict.next} className="rounded-full border border-white/25 bg-white/5 p-2.5 backdrop-blur transition hover:bg-white/20"><ChevronRight size={18} /></button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
