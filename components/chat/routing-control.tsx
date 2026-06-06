"use client";

import { useEffect, useRef, useState } from "react";
import { Lightning, CaretDown, Check } from "@phosphor-icons/react";
import type { Agent } from "./chat-view";

/**
 * Routing control: "Auto" (Onit picks the right role) by default, or pin
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
        title="Who handles this"
      >
        {pinned.length === 0 ? (
          <>
            <Lightning size={13} weight="fill" className="text-amber-400" />
            Auto
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
            {pinnedAgents.length === 1 ? pinnedAgents[0].handle : `${pinnedAgents.length} roles`}
          </>
        )}
        <CaretDown size={11} className="text-muted-foreground" />
      </button>

      {open ? (
        <div
          className={`absolute left-0 z-30 w-72 overflow-hidden rounded-xl border border-white/10 bg-popover/95 p-1 shadow-xl backdrop-blur-xl ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
              pinned.length === 0 ? "bg-white/10" : "hover:bg-white/5"
            }`}
          >
            <Lightning size={14} weight="fill" className="shrink-0 text-amber-400" />
            <span className="flex-1">
              <span className="font-medium">Auto</span>
              <span className="text-muted-foreground">
                {" "}
                · Onit reads it, asks if unclear, then routes
              </span>
            </span>
            {pinned.length === 0 ? <Check size={13} className="shrink-0" /> : null}
          </button>

          <div className="my-1 h-px bg-white/10" />
          <div className="px-2.5 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            or pin roles
          </div>

          {agents.map((a) => {
            const on = pinned.includes(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggle(a.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  on ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--agent-${a.color})` }}
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.handle}</span>
                  {a.description ? (
                    <span className="text-muted-foreground"> · {a.description}</span>
                  ) : null}
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
