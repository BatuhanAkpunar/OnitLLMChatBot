"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, PlayCircle } from "@phosphor-icons/react";
import { OrbMark } from "@/components/brand/orb";
import { RoleAvatar } from "@/components/chat/role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";
import type { Agent } from "@/components/chat/chat-view";

/**
 * "Meet the party" — a JRPG character-select. One big framed portrait on stage,
 * a pixel dialog box that types the character's line, and the party lined up
 * below as pressable cards. Auto-advances, click a card to hear anyone, ends on
 * a call to action. Uses the new high-res role portraits.
 */

const STORY_KEYS: Record<string, I18nKey> = {
  analyst: "storyAnalyst",
  product_manager: "storyProductManager",
  project_manager: "storyProjectManager",
  product_designer: "storyProductDesigner",
  qa: "storyQa",
};

type Line = { speaker: string; text: string; cta?: boolean };

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
    () => agents.filter((a) => STORY_KEYS[a.key]).slice(0, 6),
    [agents],
  );

  const script: Line[] = useMemo(
    () => [
      { speaker: "onit", text: t("storyIntro1") },
      { speaker: "onit", text: t("storyIntro2") },
      ...roles.map((a) => ({ speaker: a.key, text: t(STORY_KEYS[a.key]) })),
      { speaker: "onit", text: t("storyOutro"), cta: true },
    ],
    [roles, t],
  );

  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const hoverRef = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const line = script[idx] ?? script[0];
  const complete = chars >= line.text.length;

  useEffect(() => {
    setChars(reduced.current ? line.text.length : 0);
    if (reduced.current) return;
    const timer = setInterval(() => {
      setChars((c) => {
        if (c >= line.text.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(timer);
  }, [idx, line.text]);

  const goto = useCallback(
    (next: number) => setIdx(((next % script.length) + script.length) % script.length),
    [script.length],
  );

  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(() => {
      if (!hoverRef.current && !document.hidden) goto(idx + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [complete, idx, goto]);

  function onBoxClick() {
    if (!complete) setChars(line.text.length);
    else goto(idx + 1);
  }

  const speaker = roles.find((a) => a.key === line.speaker);
  const plateColor = speaker ? `var(--agent-${speaker.color})` : "#a78bfa";
  const plateName = speaker ? speaker.handle : "Onit";

  if (roles.length < 3) return null;

  return (
    <section
      className="mt-20 pb-10"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <p className="mb-7 text-center font-pixel text-[13px] uppercase tracking-[0.25em] text-muted-foreground">
        ▸ {t("storyKicker")}
      </p>

      <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:gap-6">
        {/* stage portrait */}
        <div className="mx-auto shrink-0 sm:mx-0">
          <div
            className="pixel-panel scanlines relative overflow-hidden p-0"
            style={{ width: 188, height: 188 }}
          >
            {speaker ? (
              <RoleAvatar
                key={speaker.key}
                roleKey={speaker.key}
                color={speaker.color}
                size={188}
                rounded="rounded-[12px]"
                state="speaking"
              />
            ) : (
              <span className="grid h-full w-full place-items-center bg-gradient-to-b from-violet-500/25 to-indigo-500/10">
                <OrbMark size={90} />
              </span>
            )}
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
              {plateName}
            </span>

            <p className="min-h-[68px] font-mono text-[14.5px] leading-relaxed text-foreground/90">
              {line.text.slice(0, chars)}
              {!complete ? <span className="onit-story-caret text-foreground/50">▌</span> : null}
            </p>

            {complete && line.cta ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCta();
                }}
                className="pressable is-shadowed mt-2 inline-flex items-center gap-2 rounded-xl border-[1.5px] border-foreground bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                style={{ boxShadow: "3px 3px 0 0 var(--foreground)" }}
              >
                <PlayCircle size={16} weight="fill" />
                {t("storyCta")}
              </button>
            ) : null}

            {complete && !line.cta ? (
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

      {/* party row */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => goto(0)}
          aria-label="Onit"
          className={`pressable grid h-12 w-12 place-items-center rounded-xl border-[1.5px] transition-all ${
            !speaker
              ? "scale-110 border-violet-400 bg-violet-500/10"
              : "border-border opacity-55 hover:opacity-100"
          }`}
        >
          <OrbMark size={24} />
        </button>
        {roles.map((a, i) => {
          const active = line.speaker === a.key;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => goto(2 + i)}
              aria-label={a.handle}
              aria-pressed={active}
              className={`pressable overflow-hidden rounded-xl border-[1.5px] transition-all ${
                active
                  ? "scale-110"
                  : "border-border opacity-55 saturate-[0.7] hover:opacity-100 hover:saturate-100"
              }`}
              style={active ? { borderColor: `var(--agent-${a.color})` } : undefined}
            >
              <RoleAvatar roleKey={a.key} color={a.color} size={46} rounded="rounded-[10px]" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
