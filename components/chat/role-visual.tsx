"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  MagnifyingGlass,
  ChartLineUp,
  Kanban,
  PenNib,
  Bug,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, Icon> = {
  analyst: MagnifyingGlass,
  product_manager: ChartLineUp,
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

export type SpriteState = "static" | "idle" | "speaking";

/**
 * RoleAvatar - a character's Street Fighter II-style framed portrait. The
 * source is a high-resolution 16-bit pixel-art bust with a baked role-colored
 * backdrop, rendered SMOOTH so it stays crisp at every size (the old "blurry
 * when small" culprit was forced pixelation on low-res art).
 *
 * Two frames per character: `<key>.webp` (neutral) and `<key>_wave.webp` (a
 * hand gesture). The ONLY motion is the character doing its own gesture - on
 * hover, and on a slow interval while idle or speaking. No bobbing, no
 * equalizer (that read like "dancing to music"). Falls back to a role-tinted
 * icon disc if the asset is missing.
 */
export function RoleAvatar({
  roleKey,
  color,
  size = 40,
  rounded = "rounded-xl",
  state = "static",
  className,
}: {
  roleKey: string;
  color: string;
  size?: number;
  rounded?: string;
  state?: SpriteState;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [gesturing, setGesturing] = useState(false);
  const hovering = useRef(false);
  const waveOk = useRef(true);

  // Warm the gesture frame so the first hover doesn't flicker.
  useEffect(() => {
    const img = new Image();
    img.src = `/avatars/${roleKey}_wave.webp`;
  }, [roleKey]);

  // While idle (home party) or speaking (chat), the character throws its own
  // gesture every few seconds - speaking does it a bit more often.
  useEffect(() => {
    if (state === "static") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const period = state === "speaking" ? 2600 : 4600;
    const iv = setInterval(() => {
      if (hovering.current || !waveOk.current) return;
      setGesturing(true);
      setTimeout(() => setGesturing(false), 1100);
    }, period);
    return () => clearInterval(iv);
  }, [state, roleKey]);

  if (failed) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center",
          rounded,
          className,
        )}
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

  const showWave = gesturing && waveOk.current;

  return (
    <span
      className={cn("relative inline-block shrink-0", rounded, className)}
      style={{ width: size, height: size }}
      onMouseEnter={() => {
        hovering.current = true;
        if (waveOk.current) setGesturing(true);
      }}
      onMouseLeave={() => {
        hovering.current = false;
        setGesturing(false);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/avatars/${roleKey}${showWave ? "_wave" : ""}.webp`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => {
          // A missing gesture frame just disables the wave; base failing hides.
          if (showWave) {
            waveOk.current = false;
            setGesturing(false);
          } else {
            setFailed(true);
          }
        }}
        className={cn(
          "h-full w-full select-none object-cover",
          rounded,
          "ring-1 ring-inset ring-black/10 dark:ring-white/10",
        )}
        style={{ width: size, height: size }}
        aria-hidden
      />
    </span>
  );
}
