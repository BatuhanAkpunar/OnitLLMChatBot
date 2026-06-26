"use client";

import { useEffect } from "react";

/**
 * Dev-only React render profiler (react-scan). Highlights components that
 * re-render and logs unnecessary renders to the console. Never runs in
 * production: the dynamic import is guarded by NODE_ENV.
 */
export function ReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
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
