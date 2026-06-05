"use client";

import { useEffect, useRef } from "react";

/**
 * The signature Onit motif: the 6 AI roles as colored orbs that gently orbit
 * behind the composer, drift toward the cursor, breathe, and brighten when their
 * role is @mentioned. Canvas + rAF; respects prefers-reduced-motion; pauses when
 * the tab is hidden. Purely decorative (pointer-events-none, aria-hidden).
 */
const ROLE_KEYS = [
  "analyst",
  "product-manager",
  "developer",
  "project-manager",
  "product-designer",
  "qa",
] as const;

type Orb = {
  key: string;
  color: string;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  x: number;
  y: number;
  glow: number;
};

function readColors(): Record<string, string> {
  const root = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const k of ROLE_KEYS) {
    out[k] = root.getPropertyValue(`--agent-${k}`).trim() || "#888888";
  }
  return out;
}

function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith("#")) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  return c;
}

export function TeamConstellation({
  activeKeys,
  className = "",
}: {
  activeKeys?: string[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<Set<string>>(new Set());
  activeRef.current = new Set(activeKeys ?? []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let colors = readColors();

    const orbs: Orb[] = ROLE_KEYS.map((key, i) => ({
      key,
      color: colors[key],
      angle: (i / ROLE_KEYS.length) * Math.PI * 2,
      radius: 0.5 + ((i % 3) - 1) * 0.14,
      speed: (i % 2 === 0 ? 1 : -1) * (0.05 + (i % 3) * 0.02),
      size: 5 + (i % 3),
      x: 0,
      y: 0,
      glow: 0.5,
    }));

    let w = 0;
    let h = 0;
    const pointer = { x: 0, y: 0, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer.x = x;
      pointer.y = y;
      pointer.active = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    }
    window.addEventListener("pointermove", onMove);

    const mo = new MutationObserver(() => {
      colors = readColors();
      for (const o of orbs) o.color = colors[o.key];
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let raf = 0;
    let t = 0;

    const frame = () => {
      if (!reduce) t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.52;

      for (const o of orbs) {
        const a = o.angle + (reduce ? 0 : t * o.speed);
        const breathe = reduce ? 1 : 1 + Math.sin(t * 0.7 + o.angle) * 0.06;
        let ox = cx + Math.cos(a) * base * o.radius * breathe;
        let oy = cy + Math.sin(a) * base * o.radius * breathe * 0.74;
        if (pointer.active && !reduce) {
          ox += (pointer.x - ox) * 0.05;
          oy += (pointer.y - oy) * 0.05;
        }
        o.x = ox;
        o.y = oy;
        const target = activeRef.current.has(o.key) ? 1 : 0.45;
        o.glow += (target - o.glow) * 0.08;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const dx = orbs[i].x - orbs[j].x;
          const dy = orbs[i].y - orbs[j].y;
          const d = Math.hypot(dx, dy);
          const maxD = base * 0.95;
          if (d < maxD) {
            const alpha =
              (1 - d / maxD) * 0.1 * Math.max(orbs[i].glow, orbs[j].glow);
            ctx.strokeStyle = withAlpha(orbs[i].color, alpha);
            ctx.beginPath();
            ctx.moveTo(orbs[i].x, orbs[i].y);
            ctx.lineTo(orbs[j].x, orbs[j].y);
            ctx.stroke();
          }
        }
      }

      for (const o of orbs) {
        const glowR = o.size * (4 + o.glow * 7);
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, glowR);
        g.addColorStop(0, withAlpha(o.color, 0.5 * (0.6 + o.glow)));
        g.addColorStop(1, withAlpha(o.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = withAlpha(o.color, 0.9);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size * (0.7 + o.glow * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
