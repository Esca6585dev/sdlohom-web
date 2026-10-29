"use client";

import { useSyncExternalStore } from "react";

export const STORAGE_EVENT = "sdlohom-storage";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(STORAGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(STORAGE_EVENT, cb);
  };
}

/** Reactive localStorage token: null during SSR/hydration, then the stored value. Updates when setStoredToken() runs. */
export function useStoredToken(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
