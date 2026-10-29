"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, GraduationCap, Stethoscope, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PublicSettings } from "@/lib/types";

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1400;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return <span ref={ref}>{n.toLocaleString("ru-RU")}</span>;
}

export default function StatsBand({ stats, dict }: { stats: PublicSettings["stats"]; dict: Dictionary }) {
  const items = [
    { icon: BookOpen, label: dict.books, value: stats.books },
    { icon: Stethoscope, label: dict.specialtiesCount, value: stats.specialties },
    { icon: Users, label: dict.teachers, value: stats.teachers },
    { icon: GraduationCap, label: dict.students, value: stats.students },
  ];
  return (
    <section className="relative z-10 -mt-10">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line shadow-card lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-4 bg-card p-5 sm:p-6">
              <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 p-3 text-white shadow-soft">
                <it.icon size={26} />
              </div>
              <div>
                <p className="text-2xl font-black text-brand-800 dark:text-brand-200 sm:text-3xl"><Counter value={it.value} /></p>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted sm:text-sm">{it.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
