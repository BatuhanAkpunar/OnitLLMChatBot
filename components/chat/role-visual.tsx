"use client";

import { createElement, useState } from "react";
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
 * RoleAvatar — a character's framed portrait. The source is a single
 * high-resolution (1024px) illustration with a baked role-colored backdrop, so
 * it stays crisp at every size (16px chip → 200px stage); we render it SMOOTH
 * (no forced pixelation, which was the old "blurry when small" culprit).
 *
 * Motion is CSS-driven, no per-frame sprite swaps:
 *   idle     → gentle breathing bob
 *   speaking → livelier bounce + a small equalizer at the chin
 * Falls back to a role-tinted icon disc if the asset is missing.
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

  const motionClass =
    state === "speaking"
      ? "sprite-speaking"
      : state === "idle"
        ? "sprite-idle"
        : "";

  if (failed) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center",
          rounded,
          motionClass,
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

  const eqSize = Math.max(2, Math.round(size * 0.05));

  return (
    <span
      className={cn("relative inline-block shrink-0", rounded, motionClass, className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/avatars/${roleKey}.webp`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full select-none object-cover",
          rounded,
          "ring-1 ring-inset ring-black/10 dark:ring-white/10",
        )}
        style={{ width: size, height: size }}
        aria-hidden
      />
      {state === "speaking" && size >= 40 ? (
        <span
          className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-[2px] text-white/90"
          style={{ height: eqSize * 3 }}
          aria-hidden
        >
          <span className="eq-bar" style={{ width: eqSize, animationDelay: "0s" }} />
          <span className="eq-bar" style={{ width: eqSize, animationDelay: "0.15s" }} />
          <span className="eq-bar" style={{ width: eqSize, animationDelay: "0.3s" }} />
        </span>
      ) : null}
    </span>
  );
}
