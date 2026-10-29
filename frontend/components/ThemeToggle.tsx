"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "sdlohom_theme";
type Theme = "light" | "dark";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

export function setTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

/** Current theme, kept in sync with <html data-theme> (set before paint by the inline script in app/layout.tsx). */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [theme, setTheme];
}

export default function ThemeToggle({ className, labels = { light: "Açyk tema", dark: "Garaňky tema" } }: { className?: string; labels?: { light: string; dark: string } }) {
  const [theme, set] = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => set(next)}
      aria-label={theme === "dark" ? labels.light : labels.dark}
      title={theme === "dark" ? labels.light : labels.dark}
      className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/15", className)}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
