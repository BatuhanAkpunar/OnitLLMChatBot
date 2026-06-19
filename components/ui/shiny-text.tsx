/**
 * Text with a slow highlight sweeping across it (reactbits-style "shiny text").
 * Used for live "working" labels so a wait reads as motion, not a frozen screen.
 * Falls back to a solid muted color under prefers-reduced-motion (see globals).
 */
export function ShinyText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`shiny-text ${className}`}>{children}</span>;
}
