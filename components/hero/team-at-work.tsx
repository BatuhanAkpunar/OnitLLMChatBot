"use client";

import { OrbMark } from "@/components/brand/orb";
import { RoleAvatar } from "@/components/chat/role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { Agent } from "@/components/chat/chat-view";

/**
 * Landing showcase: the six roles around the Onit orb, each streaming its
 * artifact (PRD, spec, test matrix...) into the center. Pure CSS animation;
 * static under prefers-reduced-motion (handled in globals.css).
 */

// Ellipse positions (percent), one node per role, starting at the top and
// going clockwise. Computed from 60-degree steps on a r=40 circle.
const NODES: { x: number; y: number }[] = [
  { x: 50, y: 8 },
  { x: 86, y: 29 },
  { x: 86, y: 71 },
  { x: 50, y: 92 },
  { x: 14, y: 71 },
  { x: 14, y: 29 },
];

// What each role hands back to the team, shown as a traveling chip.
const ARTIFACTS: Record<string, string> = {
  analyst: "Spec",
  product_manager: "PRD",
  developer: "Code plan",
  project_manager: "Sprint",
  product_designer: "User flow",
  qa: "Test matrix",
};

export function TeamAtWork({ agents }: { agents: Agent[] }) {
  const { t } = useI18n();
  const roles = agents.slice(0, 6);
  if (roles.length < 3) return null;

  return (
    <section className="mx-auto mt-20 w-full max-w-2xl pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {t("workTitle")}
        </h2>
        <p className="mt-1.5 text-sm font-medium text-foreground/70">
          {t("workSub")}
        </p>
      </div>

      <div className="relative aspect-[16/11] w-full">
        {/* connection lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {roles.map((a, i) => {
            const n = NODES[i % NODES.length];
            return (
              <line
                key={a.key}
                x1={n.x}
                y1={n.y}
                x2={50}
                y2={50}
                className="onit-work-line"
                style={{ animationDelay: `${i * -0.7}s` }}
                stroke={`var(--agent-${a.color})`}
                strokeOpacity="0.35"
                strokeDasharray="0.6 2.4"
                vectorEffect="non-scaling-stroke"
                strokeWidth="1.4"
              />
            );
          })}
        </svg>

        {/* center: Onit */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="onit-work-core grid place-items-center rounded-full border border-border bg-card p-4 shadow-[0_8px_30px_-12px_rgba(99,102,241,0.45)]">
            <OrbMark size={34} />
          </div>
        </div>

        {/* role nodes */}
        {roles.map((a, i) => {
          const n = NODES[i % NODES.length];
          return (
            <div
              key={a.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span className="rounded-2xl ring-[3px] ring-background">
                  <RoleAvatar
                    roleKey={a.key}
                    color={a.color}
                    size={52}
                    rounded="rounded-2xl"
                  />
                </span>
                <span
                  className="hidden text-[11px] font-semibold sm:block"
                  style={{ color: `var(--agent-${a.color})` }}
                >
                  {a.handle}
                </span>
              </div>
            </div>
          );
        })}

        {/* traveling artifact chips, one at a time */}
        {roles.map((a, i) => {
          const n = NODES[i % NODES.length];
          return (
            <span
              key={`chip-${a.key}`}
              className="onit-work-chip absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-card px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide shadow-sm"
              style={
                {
                  "--sx": `${n.x}%`,
                  "--sy": `${n.y}%`,
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  borderColor: `color-mix(in oklab, var(--agent-${a.color}) 45%, transparent)`,
                  color: `var(--agent-${a.color})`,
                  animationDelay: `${i * 1.5}s`,
                } as React.CSSProperties
              }
              aria-hidden
            >
              {ARTIFACTS[a.key] ?? "Notes"}
            </span>
          );
        })}
      </div>
    </section>
  );
}
