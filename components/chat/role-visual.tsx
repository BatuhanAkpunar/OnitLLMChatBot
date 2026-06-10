"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  MagnifyingGlass,
  ChartLineUp,
  Code,
  Kanban,
  PenNib,
  Bug,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

const ICONS: Record<string, Icon> = {
  analyst: MagnifyingGlass,
  product_manager: ChartLineUp,
  developer: Code,
  project_manager: Kanban,
  product_designer: PenNib,
  qa: Bug,
};

// First-person personas: accurate to what each role actually does on a team.
const PERSONAS: Record<string, string> = {
  analyst:
    "I gather requirements and write user stories with clear acceptance criteria.",
  product_manager:
    "I own the roadmap and prioritize what we build next, and why.",
  developer:
    "I design the architecture, write the code, and review every change.",
  project_manager:
    "I plan sprints, track progress, and remove blockers so we ship on time.",
  product_designer:
    "I research users, map the flows, and design the interfaces we build.",
  qa: "I write test plans, automate checks, and catch bugs before release.",
};

export function roleIcon(key: string): Icon {
  return ICONS[key] ?? UsersThree;
}

export function rolePersona(key: string, fallback?: string | null): string {
  return PERSONAS[key] ?? fallback ?? "";
}

// Idle animation: which frame to show at each ~250ms step (0 base, 1 blink,
// 2 alt). Runs for at most 3 seconds per hover, then settles back to base.
const FRAME_SEQ = [1, 0, 0, 2, 2, 0, 1, 0, 2, 0, 1, 0];
const FRAME_MS = 250;
const ANIM_MAX_MS = 3000;

/**
 * Pixel-art portrait for a role. Plays a short sprite animation (blink and a
 * warm smile frame) while hovered, GIF style. Falls back to the role icon in
 * a colored disc when the image asset is missing or fails to load.
 */
export function RoleAvatar({
  roleKey,
  color,
  size = 40,
  rounded = "rounded-xl",
}: {
  roleKey: string;
  color: string;
  size?: number;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState(0);
  // Optimistic: assume animation frames exist, demote one on load error.
  const frameOk = useRef<[boolean, boolean]>([true, true]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Warm the browser cache so the first hover does not flicker.
  useEffect(() => {
    (["_blink", "_alt"] as const).forEach((suffix) => {
      const img = new Image();
      img.src = `/avatars/${roleKey}${suffix}.png`;
    });
  }, [roleKey]);

  function stopAnim() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setFrame(0);
  }

  function startAnim() {
    if (timer.current) return;
    const stopAt = Date.now() + ANIM_MAX_MS;
    let step = 0;
    timer.current = setInterval(() => {
      if (Date.now() >= stopAt) {
        stopAnim();
        return;
      }
      const f = FRAME_SEQ[step % FRAME_SEQ.length];
      step++;
      const usable = f === 0 || frameOk.current[f - 1];
      setFrame(usable ? f : 0);
    }, FRAME_MS);
  }

  // Native listeners: hover starts the sprite loop, leaving resets it.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    el.addEventListener("mouseenter", startAnim);
    el.addEventListener("mouseleave", stopAnim);
    return () => {
      el.removeEventListener("mouseenter", startAnim);
      el.removeEventListener("mouseleave", stopAnim);
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, roleKey]);

  if (failed) {
    return (
      <span
        className={`grid shrink-0 place-items-center ${rounded} ring-1 ring-inset ring-white/10`}
        style={{
          width: size,
          height: size,
          backgroundColor: `color-mix(in srgb, var(--agent-${color}) 16%, transparent)`,
        }}
        aria-hidden
      >
        {createElement(roleIcon(roleKey), {
          size: Math.round(size * 0.45),
          weight: "bold",
          style: { color: `var(--agent-${color})` },
        })}
      </span>
    );
  }

  const src =
    frame === 1
      ? `/avatars/${roleKey}_blink.png`
      : frame === 2
        ? `/avatars/${roleKey}_alt.png`
        : `/avatars/${roleKey}.png`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      onError={() => {
        if (frame === 0) {
          setFailed(true);
        } else {
          // A missing animation frame only disables that frame.
          frameOk.current[frame - 1] = false;
          setFrame(0);
        }
      }}
      className={`shrink-0 select-none ${rounded} object-cover ring-1 ring-inset ring-white/10`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
