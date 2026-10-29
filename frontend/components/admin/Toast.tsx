"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; message: string }
interface ToastApi {
  push: (kind: Kind, message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);
let seq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, message: string) => {
    const id = seq++;
    setItems((l) => [...l, { id, kind, message }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  const api = useMemo<ToastApi>(() => ({ push, success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m) }), [push]);
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-card animate-fade-up",
                t.kind === "success" && "border-accent-200 bg-accent-500/10 text-accent-800 dark:text-accent-200",
                t.kind === "error" && "border-red-200 bg-red-500/10 text-red-900",
                t.kind === "info" && "border-brand-500/30 bg-brand-500/10 text-brand-900 dark:text-brand-100",
              )}
              role="status"
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="close" className="opacity-60 hover:opacity-100"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}
