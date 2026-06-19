"use client";

import { useRef, type ReactNode } from "react";

/**
 * A clickable card with a soft, cursor-following radial glow (reactbits-style
 * "spotlight"). The accent color is per-instance; the glow only shows on hover
 * and is disabled under prefers-reduced-motion (see .spotlight-card in globals).
 */
export function SpotlightCard({
  children,
  onClick,
  color = "var(--primary)",
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerMove={onMove}
      aria-label={ariaLabel}
      style={{ ["--spot-color" as string]: color }}
      className={`spotlight-card ${className}`}
    >
      {children}
    </button>
  );
}
