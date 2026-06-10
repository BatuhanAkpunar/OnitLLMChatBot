"use client";

import { createElement, useState } from "react";
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

/**
 * Pixel-art portrait for a role. Falls back to the role icon in a colored
 * disc when the image asset is missing or fails to load.
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

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/avatars/${roleKey}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 ${rounded} object-cover ring-1 ring-inset ring-white/10`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
