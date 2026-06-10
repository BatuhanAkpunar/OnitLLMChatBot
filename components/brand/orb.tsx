/**
 * Static mini version of the Onit core orb, for small brand spots (login,
 * empty states). Pure CSS, matches the FluidOrb palette.
 */
export function OrbMark({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 50% 42%, #eafcff 0%, #7dd3fc 26%, #38bdf8 46%, #6366f1 78%, transparent 100%)",
        boxShadow:
          "0 0 18px rgba(56, 189, 248, 0.45), inset 0 0 8px rgba(255, 255, 255, 0.35)",
      }}
    />
  );
}
