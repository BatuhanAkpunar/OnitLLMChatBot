"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, PencilSimpleLine } from "@phosphor-icons/react";
import { OrbMark } from "@/components/brand/orb";
import { RoleAvatar } from "@/components/chat/role-visual";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";
import type { Agent } from "@/components/chat/chat-view";

/**
 * Retro-RPG team introduction: one big character on stage, a chunky dialog
 * box with typewriter text, and the party lined up below. No popups; the
 * story advances on its own, on click, or by picking a character.
 */

const STORY_KEYS: Record<string, I18nKey> = {
  analyst: "storyAnalyst",
  product_manager: "storyProductManager",
  developer: "storyDeveloper",
  project_manager: "storyProjectManager",
  product_designer: "storyProductDesigner",
  qa: "storyQa",
};

type Line = {
  /** "onit" for the narrator, otherwise an agent key. */
  speaker: string;
  text: string;
  /** Show the "write your brief" CTA under this line. */
  cta?: boolean;
};

const TYPE_MS = 18;
const ADVANCE_MS = 4500;

export function TeamStory({
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
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const line = script[idx] ?? script[0];
  const complete = chars >= line.text.length;

  // Typewriter: reveal one character per tick; reduced motion gets full text.
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

  // Auto-advance a finished line unless the visitor is hovering the scene.
  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(() => {
      if (!hoverRef.current && !document.hidden) goto(idx + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [complete, idx, goto]);

  function onBoxClick() {
    if (!complete) {
      setChars(line.text.length);
    } else {
      goto(idx + 1);
    }
  }

  const speakerAgent = roles.find((a) => a.key === line.speaker);
  const plateColor = speakerAgent
    ? `var(--agent-${speakerAgent.color})`
    : "#a78bfa";
  const plateName = speakerAgent ? speakerAgent.handle : "onit";

  if (roles.length < 3) return null;

  return (
    <section
      className="mt-16 pb-10"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <p className="mb-7 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        ─ {t("storyKicker")} ─
      </p>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:gap-6">
        {/* stage: the active speaker, big enough that the dialog reads as theirs */}
        <div className="shrink-0">
          <div
            className="onit-story-sprite grid place-items-center overflow-hidden rounded-3xl ring-1 ring-inset ring-border"
            style={{
              width: 176,
              height: 176,
              background: speakerAgent
                ? `linear-gradient(160deg, color-mix(in srgb, ${plateColor} 30%, transparent), color-mix(in srgb, ${plateColor} 8%, transparent))`
                : "linear-gradient(160deg, rgba(167,139,250,0.28), rgba(99,102,241,0.08))",
            }}
          >
            {speakerAgent ? (
              <RoleAvatar
                key={speakerAgent.key}
                roleKey={speakerAgent.key}
                color={speakerAgent.color}
                size={176}
                rounded="rounded-none"
              />
            ) : (
              <OrbMark size={84} />
            )}
          </div>
        </div>

        {/* dialog box */}
        <div className="w-full min-w-0 flex-1">
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
            className="relative cursor-pointer select-none rounded-2xl border-2 border-foreground/15 bg-card p-5 pt-6 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.35)] transition-colors hover:border-foreground/25"
          >
            <span
              className="absolute -top-3 left-5 rounded-md border-2 bg-background px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
              style={{ borderColor: plateColor, color: plateColor }}
            >
              {plateName}
            </span>

            <p className="min-h-[72px] font-mono text-[15px] leading-relaxed text-foreground/90">
              {line.text.slice(0, chars)}
              {!complete ? (
                <span className="onit-story-caret text-foreground/60">▌</span>
              ) : null}
            </p>

            {complete && line.cta ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCta();
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <PencilSimpleLine size={15} weight="bold" />
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
          <p className="mt-2 pl-1 text-[11px] text-muted-foreground">
            {t("storyTapHint")}
          </p>
        </div>
      </div>

      {/* the party: pick who speaks */}
      <div className="mt-7 flex items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => goto(0)}
          aria-label="onit"
          className={`grid h-11 w-11 place-items-center rounded-xl border border-border bg-card transition-all ${
            !speakerAgent ? "scale-110 ring-2 ring-violet-400/70" : "opacity-50 hover:opacity-100"
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
              className={`overflow-hidden rounded-xl transition-all ${
                active ? "scale-110" : "opacity-50 saturate-50 hover:opacity-100 hover:saturate-100"
              }`}
              style={
                active
                  ? { boxShadow: `0 0 0 2px var(--agent-${a.color})` }
                  : undefined
              }
            >
              <RoleAvatar roleKey={a.key} color={a.color} size={44} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
