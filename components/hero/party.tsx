"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, PlayCircle } from "@phosphor-icons/react";
import { RoleAvatar } from "@/components/chat/role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";
import type { Agent } from "@/components/chat/chat-view";

/**
 * "Meet the team": a JRPG character select. One big framed portrait on stage,
 * a pixel dialog box that types the character's line, and the crew lined up
 * below as pressable cards. Auto advances, click a card to hear anyone. Onit
 * itself is the coordinator, never shown here as a selectable team member.
 */

const STORY_KEYS: Record<string, I18nKey> = {
  analyst: "storyAnalyst",
  product_manager: "storyProductManager",
  project_manager: "storyProjectManager",
  product_designer: "storyProductDesigner",
  qa: "storyQa",
  growth: "storyGrowth",
  red_team: "storyRedTeam",
};

const TYPE_MS = 18;
const ADVANCE_MS = 4200;

export function Party({
  agents,
  onCta,
}: {
  agents: Agent[];
  onCta: () => void;
}) {
  const { t } = useI18n();

  const roles = useMemo(
    () => agents.filter((a) => STORY_KEYS[a.key]).slice(0, 8),
    [agents],
  );

  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const hoverRef = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const active = roles[idx] ?? roles[0];
  const text = active ? t(STORY_KEYS[active.key]) : "";
  const complete = chars >= text.length;

  useEffect(() => {
    setChars(reduced.current ? text.length : 0);
    if (reduced.current) return;
    const timer = setInterval(() => {
      setChars((c) => {
        if (c >= text.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(timer);
  }, [idx, text]);

  const goto = useCallback(
    (next: number) => setIdx(((next % roles.length) + roles.length) % roles.length),
    [roles.length],
  );

  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(() => {
      if (!hoverRef.current && !document.hidden) goto(idx + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [complete, idx, goto]);

  function onBoxClick() {
    if (!complete) setChars(text.length);
    else goto(idx + 1);
  }

  if (roles.length < 3 || !active) return null;
  const plateColor = `var(--agent-${active.color})`;

  return (
    <section
      className="mt-20 pb-10"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <h2 className="mb-8 text-center font-pixel text-2xl tracking-tight text-foreground sm:text-3xl">
        {t("storyKicker")}
      </h2>

      <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:gap-6">
        {/* stage portrait */}
        <div className="mx-auto shrink-0 sm:mx-0">
          <div
            className="pixel-panel scanlines relative overflow-hidden p-0"
            style={{ width: 188, height: 188 }}
          >
            <RoleAvatar
              key={active.key}
              roleKey={active.key}
              color={active.color}
              size={188}
              rounded="rounded-[12px]"
              state="idle"
            />
          </div>
        </div>

        {/* dialog box */}
        <div className="min-w-0 flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={onBoxClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onBoxClick();
              }
            }}
            aria-label={t("storyNext")}
            className="pixel-panel pressable relative cursor-pointer select-none p-5 pt-6"
          >
            <span
              className="absolute -top-3 left-5 rounded-md border-[1.5px] bg-background px-2 py-0.5 font-pixel text-[12px] uppercase tracking-wide"
              style={{ borderColor: plateColor, color: plateColor }}
            >
              {active.handle}
            </span>

            <p className="min-h-[68px] font-mono text-[14.5px] leading-relaxed text-foreground/90">
              {text.slice(0, chars)}
              {!complete ? <span className="onit-story-caret text-foreground/50">▌</span> : null}
            </p>

            {complete ? (
              <CaretDown
                size={15}
                weight="bold"
                className="onit-story-advance absolute bottom-3 right-3.5 text-foreground/40"
              />
            ) : null}
          </div>
          <p className="mt-2 pl-1 text-[11px] text-muted-foreground">{t("storyTapHint")}</p>
        </div>
      </div>

      {/* the crew row (Onit is the coordinator, not listed here) */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        {roles.map((a, i) => {
          const isActive = active.key === a.key;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => goto(i)}
              aria-label={a.handle}
              aria-pressed={isActive}
              className={`pressable overflow-hidden rounded-xl border-[1.5px] transition-all ${
                isActive
                  ? "scale-110"
                  : "border-border opacity-55 saturate-[0.7] hover:opacity-100 hover:saturate-100"
              }`}
              style={isActive ? { borderColor: `var(--agent-${a.color})` } : undefined}
            >
              <RoleAvatar roleKey={a.key} color={a.color} size={46} rounded="rounded-[10px]" />
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onCta}
          className="pressable is-shadowed inline-flex items-center gap-2 rounded-xl border-[1.5px] border-foreground bg-primary px-5 py-2.5 font-pixel text-sm text-primary-foreground"
          style={{ boxShadow: "3px 3px 0 0 var(--foreground)" }}
        >
          <PlayCircle size={16} weight="fill" />
          {t("storyCta")}
        </button>
      </div>
    </section>
  );
}
