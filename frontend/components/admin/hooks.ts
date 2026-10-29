"use client";

import { useCallback, useEffect, useState } from "react";

interface Result<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Runs an async loader whenever deps change. `loading` is derived (requested key != resolved key),
 * so no state is set synchronously inside the effect; previous data stays visible while reloading.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps) + "|" + tick;
  const [res, setRes] = useState<Result<T>>({ key: null, data: null, error: null });
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    loader()
      .then((d) => alive && setRes({ key, data: d, error: null }))
      .catch((e) => alive && setRes((r) => ({ key, data: r.data, error: e instanceof Error ? e.message : String(e) })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setData = useCallback((v: T | null | ((prev: T | null) => T | null)) => {
    setRes((r) => ({ ...r, data: typeof v === "function" ? (v as (p: T | null) => T | null)(r.data) : v }));
  }, []);

  return { data: res.data, loading: res.key !== key, error: res.key === key ? res.error : null, reload, setData };
}

export function errMsg(e: unknown, fallback = "Ýalňyşlyk ýüze çykdy"): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
