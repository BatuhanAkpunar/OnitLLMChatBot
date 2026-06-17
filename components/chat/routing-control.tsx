"use client";

import { useEffect, useRef, useState } from "react";
import { Lightning, CaretDown, Check } from "@phosphor-icons/react";
import { RoleAvatar, rolePersona } from "./role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { Agent } from "./chat-view";

/**
 * Agent picker: "Agent: Auto" (Onit picks the right role) by default, or pin
 * specific roles to override. Used by both the landing and chat composers.
 */
export function RoutingControl({
  agents,
  pinned,
  onChange,
  up = true,
}: {
  agents: Agent[];
  pinned: string[];
  onChange: (keys: string[]) => void;
  up?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pinnedAgents = agents.filter((a) => pinned.includes(a.key));
  function toggle(key: string) {
    onChange(
      pinned.includes(key) ? pinned.filter((k) => k !== key) : [...pinned, key],
    );
  }

  // No `relative` here on purpose: the dropdown then anchors to the composer
  // card (the nearest positioned ancestor, .pixel-panel), so `left-0 right-0`
  // makes it span the full composer width and sit flush against it.
  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
        <CaretDown size={11} className="text-muted-foreground" />
      </button>

      {open ? (
        <div
          className={`pixel-panel absolute inset-x-0 z-30 overflow-hidden bg-popover p-1 ${
            up ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
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

          <div className="my-1 h-px bg-border" />
          <div className="px-2.5 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
      ) : null}
    </div>
  );
}
