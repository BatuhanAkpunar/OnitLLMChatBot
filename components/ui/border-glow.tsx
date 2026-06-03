import type { CSSProperties, ReactNode } from "react";

/**
 * Subtle, always-on animated border glow (adapted from the React Bits
 * BorderGlow). A faint highlight continuously sweeps around the border;
 * respects prefers-reduced-motion. Style the inner surface via `innerClassName`.
 */
export function BorderGlow({
  children,
  className = "",
  innerClassName = "",
  radius = 16,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  radius?: number;
}) {
  return (
    <div
      className={`onit-border-glow ${className}`}
      style={{ "--obg-radius": `${radius}px` } as CSSProperties}
    >
      <div className={`onit-border-glow__inner ${innerClassName}`}>{children}</div>
    </div>
  );
}
