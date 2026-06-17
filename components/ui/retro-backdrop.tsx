"use client";

import { cn } from "@/lib/utils";

/**
 * Theme-aware neo-retro backdrop: a soft role-colored aurora, a faint dot-grid,
 * and a perspective retro-grid horizon. Light = "Arcade Daylight" (sunlit
 * paper), dark = "CRT Midnight" (glowing cabinet). Pure CSS, motion-safe.
 */
export function RetroBackdrop({
  className,
  grid = true,
  scanlines = false,
}: {
  className?: string;
  grid?: boolean;
  scanlines?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        scanlines && "scanlines",
        className,
      )}
      aria-hidden
    >
      {/* role-colored aurora wash (a touch stronger in light mode) */}
      <div className="onit-aurora absolute inset-0 opacity-[0.8] dark:opacity-70" />
      {/* paper / CRT dot grid */}
      <div className="dot-grid absolute inset-0 opacity-[0.5] dark:opacity-[0.35]" />
      {/* perspective horizon */}
      {grid ? <div className="retro-grid" /> : null}
    </div>
  );
}
