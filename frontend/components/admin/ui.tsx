"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------- Buttons ---------- */
type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm" };
  const variants: Record<Variant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-soft",
    success: "bg-accent-600 text-white hover:bg-accent-700 shadow-soft",
    secondary: "border border-line bg-card text-ink hover:bg-surface-2",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn("rounded-lg p-2 text-ink-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */
export const inputCls = "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface-2";

export function Field({ label, hint, error, children, className }: { label?: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

/** inputCls is w-full by default; a caller passing its own width utility (w-40, w-56…) wins. */
function base(className?: string) {
  return className && /(^|\s)w-/.test(className) ? inputCls.replace("w-full ", "") : inputCls;
}
export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base(className), className)} {...rest} />;
}
export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base(className), "min-h-[96px]", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base(className), "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23475569%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-3">
      <span className={cn("relative inline-block h-6 w-11 rounded-full transition", checked ? "bg-accent-500" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </button>
  );
}

export function LangTabs({ value, onChange, allowAll = true }: { value: Lang | ""; onChange: (v: Lang | "") => void; allowAll?: boolean }) {
  const opts: { v: Lang | ""; l: string }[] = [...(allowAll ? [{ v: "" as const, l: "Ählisi" }] : []), { v: "tm", l: "TM" }, { v: "en", l: "EN" }, { v: "ru", l: "RU" }];
  return (
    <div className="inline-flex rounded-xl border border-line bg-card p-1">
      {opts.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition", value === o.v ? "bg-brand-600 text-white" : "text-ink-muted hover:text-ink")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ---------- Layout ---------- */
export function Card({ className, children, title, actions }: { className?: string; children: React.ReactNode; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-line bg-card shadow-soft", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "brand" }) {
  const tones = {
    neutral: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    success: "bg-accent-500/15 text-accent-700 dark:text-accent-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    danger: "bg-red-500/15 text-red-700 dark:text-red-300",
    brand: "bg-brand-500/15 text-brand-800 dark:text-brand-200",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-2 p-10 text-center text-sm text-ink-muted">
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16 text-brand-500", className)}>
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-card shadow-soft", className)}>
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("bg-surface-2 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-muted", className)}>{children}</th>;
}
export function Td({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-t border-line px-4 py-3 align-middle", className)} {...rest}>{children}</td>;
}

export function Pagination({ page, totalPages, onChange, total }: { page: number; totalPages: number; onChange: (p: number) => void; total?: number }) {
  if (totalPages <= 1 && !total) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
      <span>{total !== undefined ? `Jemi: ${total}` : ""}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton label="prev" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></IconButton>
          <span className="px-2 font-semibold text-ink">{page} / {totalPages}</span>
          <IconButton label="next" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></IconButton>
        </div>
      )}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-card shadow-card sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <IconButton label="close" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = "Tassyklaň", text, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title?: string; text: string; busy?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Ýatyr</Button><Button variant="danger" onClick={onConfirm} loading={busy}>Poz</Button></>}>
      <p className="text-sm text-ink">{text}</p>
    </Modal>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "brand", hint }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ size?: number }>; tone?: "brand" | "accent" | "amber" | "rose"; hint?: string }) {
  const tones = { brand: "from-brand-500 to-brand-700", accent: "from-accent-500 to-accent-700", amber: "from-amber-400 to-amber-600", rose: "from-rose-400 to-rose-600" };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-soft">
      <div className={cn("rounded-2xl bg-gradient-to-br p-3 text-white", tones[tone])}><Icon size={24} /></div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-ink">{value}</p>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}
