"use client";

import { useEffect } from "react";

/**
 * Dev-only React render profiler (react-scan). Opt-in so normal dev sessions
 * stay visually clean: run `localStorage.onitScan = "1"` and reload to enable,
 * remove the key to disable. Never runs in production: the dynamic import is
 * guarded by NODE_ENV.
 */
export function ReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let enabled = false;
    try {
      enabled = localStorage.getItem("onitScan") === "1";
    } catch {}
    if (!enabled) return;
    let cancelled = false;
    import("react-scan")
      .then(({ scan }) => {
        if (!cancelled) scan({ enabled: true, log: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
