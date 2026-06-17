"use client";

import { Lightning, CaretDown, Check } from "@phosphor-icons/react";
import { RoleAvatar, rolePersona } from "./role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { Agent } from "./chat-view";

/**
 * Agent picker, split into two parts so it reads as ONE piece with the
 * composer (no separate floating box):
 *   - RoutingControl: the "Agent: Auto" pill (a controlled toggle).
 *   - AgentMenu: the list, rendered INLINE inside the composer so the composer
 *     itself grows to contain it (a hairline divider, never its own box).
 * "Agent: Auto" lets Onit pick the right role; pin specific roles to override.
 */

export function RoutingControl({
  agents,
  pinned,
  open,
  onToggle,
}: {
  agents: Agent[];
  pinned: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const pinnedAgents = agents.filter((a) => pinned.includes(a.key));

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="pressable inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-foreground/70 bg-card px-2.5 py-1.5 text-[13px] font-semibold transition-colors hover:bg-accent dark:border-border"
      title={t("whoHandles")}
    >
      {pinned.length === 0 ? (
        <>
          <Lightning size={13} weight="fill" className="text-amber-400" />
          {t("routingAuto")}
        </>
      ) : (
        <>
          <span className="flex -space-x-1">
            {pinnedAgents.slice(0, 3).map((a) => (
              <span
                key={a.key}
                className="h-2.5 w-2.5 rounded-full ring-1 ring-background"
                style={{ backgroundColor: `var(--agent-${a.color})` }}
              />
            ))}
          </span>
          {pinnedAgents.length === 1
            ? pinnedAgents[0].handle
            : t("nRoles", { n: pinnedAgents.length })}
        </>
      )}
      <CaretDown
        size={11}
        className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/**
 * The agent list, rendered inline inside the composer. No box chrome: just a
 * top divider so it reads as part of the composer surface.
 */
export function AgentMenu({
  agents,
  pinned,
  onChange,
}: {
  agents: Agent[];
  pinned: string[];
  onChange: (keys: string[]) => void;
}) {
  const { t } = useI18n();
  function toggle(key: string) {
    onChange(
      pinned.includes(key) ? pinned.filter((k) => k !== key) : [...pinned, key],
    );
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
          pinned.length === 0 ? "bg-accent" : "hover:bg-accent/60"
        }`}
      >
        <Lightning size={14} weight="fill" className="shrink-0 text-amber-400" />
        <span className="flex-1">
          <span className="font-medium">{t("routingAuto")}</span>
          <span className="text-muted-foreground"> · {t("routingAutoDesc")}</span>
        </span>
        {pinned.length === 0 ? <Check size={13} className="shrink-0" /> : null}
      </button>

      <div className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("orPinRoles")}
      </div>

      {agents.map((a) => {
        const on = pinned.includes(a.key);
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => toggle(a.key)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
              on ? "bg-accent" : "hover:bg-accent/60"
            }`}
          >
            <RoleAvatar roleKey={a.key} color={a.color} size={28} rounded="rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{a.handle}</span>
              <span className="block truncate text-muted-foreground">
                {rolePersona(a.key, a.description)}
              </span>
            </span>
            {on ? <Check size={13} className="shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}
