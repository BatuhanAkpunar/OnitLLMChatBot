"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { RoleAvatar } from "@/components/chat/role-visual";
import { OrbMark } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

/**
 * Dynamic Island - the signature status core (Apple-inspired). A single black
 * capsule pinned top-center that morphs its width/height as the team's state
 * changes: routing → thinking → streaming → done. Never a dead spinner; it
 * narrates who is doing what. Lives above the chat, controlled by chat state.
 */

export type IslandState =
  | "hidden"
  | "ready"
  | "routing"
  | "thinking"
  | "streaming"
  | "done"
  | "error";

export type IslandAgent = {
  key: string;
  color: string;
  name: string;
};

export function DynamicIsland({
  state,
  label,
  agent,
  className,
}: {
  state: IslandState;
  label: string;
  agent?: IslandAgent | null;
  className?: string;
}) {
  const visible = state !== "hidden";
  const working =
    state === "routing" || state === "thinking" || state === "streaming";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4",
        className,
      )}
      aria-live="polite"
    >
      <AnimatePresence>
        {visible ? (
          <motion.div
            layout
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            className="dyn-island pointer-events-auto flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
          >
            {/* leading glyph: role avatar while working, else brand / status */}
            <motion.span layout className="relative grid place-items-center">
              {agent && working ? (
                <RoleAvatar
                  roleKey={agent.key}
                  color={agent.color}
                  size={28}
                  rounded="rounded-full"
                  state="speaking"
                />
              ) : state === "done" ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckCircle size={18} weight="fill" />
                </span>
              ) : state === "error" ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-red-500/20 text-red-300">
                  <Warning size={16} weight="fill" />
                </span>
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10">
                  <OrbMark size={18} />
                </span>
              )}
            </motion.span>

            <motion.div layout className="flex min-w-0 items-center gap-2">
              <span className="font-pixel whitespace-nowrap text-[12px] leading-none tracking-wide">
                {label}
              </span>
              {working ? (
                <span className="flex items-end gap-[2px] text-white/80" style={{ height: 12 }}>
                  <span className="eq-bar" style={{ width: 2.5, animationDelay: "0s" }} />
                  <span className="eq-bar" style={{ width: 2.5, animationDelay: "0.15s" }} />
                  <span className="eq-bar" style={{ width: 2.5, animationDelay: "0.3s" }} />
                </span>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
