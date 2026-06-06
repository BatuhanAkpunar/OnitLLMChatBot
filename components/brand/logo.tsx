/**
 * Onit brand mark: six role-colored arc segments forming a ring around a center
 * dot — the team, gathered and "on it". Rendered as inline SVG so it is immune
 * to CSS pipeline quirks and adapts to the theme via CSS custom properties.
 */
const SEGMENTS = [
  "var(--agent-analyst)",
  "var(--agent-product-manager)",
  "var(--agent-developer)",
  "var(--agent-project-manager)",
  "var(--agent-product-designer)",
  "var(--agent-qa)",
];

const C = 50; // center
const R_OUT = 46;
const R_IN = 30;
const GAP = 5; // degrees of breathing room between segments

function polar(r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

function segmentPath(start: number, end: number) {
  const p1 = polar(R_OUT, start);
  const p2 = polar(R_OUT, end);
  const p3 = polar(R_IN, end);
  const p4 = polar(R_IN, start);
  const large = end - start > 180 ? 1 : 0;
  return `M${p1.x.toFixed(2)},${p1.y.toFixed(2)} A${R_OUT},${R_OUT} 0 ${large} 1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)} L${p3.x.toFixed(2)},${p3.y.toFixed(2)} A${R_IN},${R_IN} 0 ${large} 0 ${p4.x.toFixed(2)},${p4.y.toFixed(2)} Z`;
}

export function Logo({ size = 56 }: { size?: number }) {
  const step = 360 / SEGMENTS.length;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {SEGMENTS.map((color, i) => (
        <path
          key={i}
          d={segmentPath(i * step + GAP / 2, (i + 1) * step - GAP / 2)}
          fill={color}
        />
      ))}
      <circle cx={C} cy={C} r={9} fill="var(--foreground)" />
    </svg>
  );
}
