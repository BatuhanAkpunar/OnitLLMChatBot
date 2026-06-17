/**
 * The Onit core — a small living orb that anchors the brand. Micro-animated
 * (gentle float, a glow that breathes, and an occasional shine "blink") so it
 * feels alive next to the arcade crew. Pure CSS; set `animated={false}` for
 * fully static spots. Matches the FluidOrb plasma palette.
 */
export function OrbMark({
  size = 44,
  animated = true,
}: {
  size?: number;
  animated?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 ${animated ? "onit-orb" : ""}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, #eafcff 0%, #7dd3fc 24%, #38bdf8 45%, #6366f1 78%, #4338ca 100%)",
          boxShadow:
            "0 0 14px rgba(56,189,248,0.5), inset 0 -2px 6px rgba(67,56,202,0.55), inset 0 2px 5px rgba(255,255,255,0.45)",
        }}
      />
      {/* specular highlight that sweeps — the "blink" */}
      <span
        className={`absolute rounded-full bg-white/85 ${animated ? "onit-orb-spark" : ""}`}
        style={{ width: size * 0.18, height: size * 0.18, left: "26%", top: "24%" }}
      />
    </span>
  );
}
