"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { getStarters } from "./starters";
import { STARTER_META } from "./starter-meta";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { RetroBackdrop } from "@/components/ui/retro-backdrop";
import { Party } from "@/components/hero/party";
import { RoutingControl, AgentMenu } from "./routing-control";
import { OrbMark } from "@/components/brand/orb";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";
import type { Agent } from "./chat-view";

type Mode = "build" | "plan" | "discuss";
type Panel = "agents" | "modes" | null;

const MODE_DEFS: { key: Mode; label: I18nKey; tip: I18nKey }[] = [
  { key: "build", label: "modeBuild", tip: "tipBuild" },
  { key: "plan", label: "modePlan", tip: "tipPlan" },
  { key: "discuss", label: "modeDiscuss", tip: "tipDiscuss" },
];

const HOW_STEPS: { n: number; title: I18nKey; body: I18nKey }[] = [
  { n: 1, title: "how1Title", body: "how1Body" },
  { n: 2, title: "how2Title", body: "how2Body" },
  { n: 3, title: "how3Title", body: "how3Body" },
];

function stripAt(handle: string) {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

export function HomeComposer({
  authed,
  agents,
}: {
  authed: boolean;
  agents: Agent[];
  defaultAgentKey?: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [agentOpen, setAgentOpen] = useState(false);
  // Full-screen handoff overlay: sign-in redirect, post-login resume, or
  // project creation. Without it those gaps look like a broken, dead page.
  const [transition, setTransition] = useState<{
    kind: "signin" | "resume" | "open";
    text?: string;
  } | null>(null);

  // Inline command panel (@ agents, / modes), like a command palette.
  const [panel, setPanel] = useState<Panel>(null);
  const [panelSource, setPanelSource] = useState<"typed" | "chip">("chip");
  const [filter, setFilter] = useState("");
  const [tokenStart, setTokenStart] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);


  const filteredAgents = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        stripAt(a.handle).toLowerCase().startsWith(q) ||
        a.display_name.toLowerCase().includes(q),
    );
  }, [agents, filter]);

  const filteredModes = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return MODE_DEFS;
    return MODE_DEFS.filter(
      (m) => m.key.startsWith(q) || t(m.label).toLowerCase().startsWith(q),
    );
  }, [filter, t]);

  const items = panel === "agents" ? filteredAgents.length : filteredModes.length;

  function closePanel() {
    setPanel(null);
    setFilter("");
    setTokenStart(null);
    setHighlight(0);
  }

  function togglePanel(p: Exclude<Panel, null>) {
    if (panel === p) {
      closePanel();
    } else {
      setPanel(p);
      setPanelSource("chip");
      setFilter("");
      setTokenStart(null);
      setHighlight(0);
      taRef.current?.focus();
    }
  }

  function pinForKey(key: string) {
    setPinned((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    autosize();
  }

  function selectAgent(a: Agent) {
    if (panelSource === "typed" && tokenStart !== null) {
      const end = tokenStart + 1 + filter.length;
      const next = `${input.slice(0, tokenStart)}@${stripAt(a.handle)} ${input.slice(end)}`;
      setInput(next);
      if (!pinned.includes(a.key)) setPinned((p) => [...p, a.key]);
      closePanel();
      requestAnimationFrame(() => {
        taRef.current?.focus();
        autosize();
      });
    } else {
      pinForKey(a.key);
    }
  }

  function selectMode(m: Mode) {
    setMode(m);
    if (panelSource === "typed" && tokenStart !== null) {
      setInput(input.slice(tokenStart + 1 + filter.length));
    }
    closePanel();
    requestAnimationFrame(() => taRef.current?.focus());
  }

  async function openChat(text: string, modeArg: Mode, agentKeysArg: string[]) {
    setBusy(true);
    setTransition((t) => t ?? { kind: "open", text });
    const { id } = await createProjectAndGetId();
    if (!id) {
      setBusy(false);
      setTransition(null);
      return;
    }
    try {
      sessionStorage.setItem(
        `onit:pending:${id}`,
        JSON.stringify({ content: text, agents: agentKeysArg, mode: modeArg }),
      );
    } catch {
      // ignore storage failures; the chat will just open empty
    }
    router.push(`/p/${id}`);
  }

  async function start() {
    const text = input.trim();
    if (!text || busy) return;
    if (!authed) {
      try {
        localStorage.setItem(
          "onit:anonPending",
          JSON.stringify({ content: text, mode, agents: pinned }),
        );
      } catch {}
      setBusy(true);
      setTransition({ kind: "signin", text });
      await signInWithGoogle();
      return;
    }
    openChat(text, mode, pinned);
  }

  useEffect(() => {
    if (!authed) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("onit:anonPending");
      if (raw) localStorage.removeItem("onit:anonPending");
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as {
        content?: string;
        mode?: string;
        agents?: string[];
      };
      const text = p.content?.trim();
      if (!text) return;
      const m: Mode = p.mode === "plan" || p.mode === "discuss" ? p.mode : "build";
      // Returning from the sign-in redirect with a saved brief: cover the
      // project-creation gap with the handoff overlay instead of a dead page.
      setTransition({ kind: "resume", text });
      openChat(text, m, p.agents ?? []);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!agentOpen) return;
    const close = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setAgentOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [agentOpen]);

  function pickStarter(prompt: string) {
    closePanel();
    setInput(prompt);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autosize();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (panel && items > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % items);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + items) % items);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (panel === "agents") selectAgent(filteredAgents[highlight]);
        else selectMode(filteredModes[highlight].key);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  const pinnedAgents = agents.filter((a) => pinned.includes(a.key));

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <RetroBackdrop grid={false} />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-9 flex flex-col items-center text-center">
          <h1 className="font-pixel text-balance text-[2.9rem] leading-[1.05] tracking-tight sm:text-[3.9rem]">
            <span className="text-foreground">{t("heroTitle")}</span>
            <br />
            <span
              style={{
                backgroundImage: "linear-gradient(100deg, #8b5cf6, #38bdf8 55%, #34d399)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {t("heroAccent")}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-balance font-mono text-[13.5px] leading-[1.7] tracking-tight text-muted-foreground sm:text-[14.5px]">
            {t("heroTagline")}
          </p>
        </div>

        <div ref={composerRef} className="relative">
          <div className="pixel-panel p-2.5">
            <textarea
              ref={taRef}
              value={input}
              onChange={onChange}
              onKeyDown={onKeyDown}
              rows={2}
              autoFocus
              placeholder={t("askAnything")}
              className="relative z-10 max-h-56 min-h-[52px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none"
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-0.5 pb-0.5 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <RoutingControl
                  agents={agents}
                  pinned={pinned}
                  open={agentOpen}
                  onToggle={() => setAgentOpen((o) => !o)}
                />
                <div className="inline-flex items-center gap-0.5 rounded-lg border-[1.5px] border-border bg-background/50 p-0.5">
                  {(["build", "plan", "discuss"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`pressable rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                        mode === m
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(
                        m === "build"
                          ? "modeBuild"
                          : m === "plan"
                            ? "modePlan"
                            : "modeDiscuss",
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={start}
                disabled={busy || !input.trim()}
                aria-label={t("sendLabel")}
                className="send-btn pressable flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-foreground bg-primary text-primary-foreground disabled:opacity-40"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </div>
            {agentOpen ? (
              <AgentMenu agents={agents} pinned={pinned} onChange={setPinned} />
            ) : null}
          </div>

        </div>

        {/* Quick quests: concrete opening lines, one tap to begin. */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {getStarters(lang).map((s) => {
            const meta = STARTER_META[s.cat];
            const Icon = meta.Icon;
            return (
              <SpotlightCard
                key={s.label}
                color={meta.color}
                onClick={() => pickStarter(s.prompt)}
                ariaLabel={s.label}
                className="pressable flex w-full items-center gap-3 rounded-xl border-[1.5px] border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-foreground/35"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[1.5px]"
                  style={{
                    borderColor: `color-mix(in oklab, ${meta.color} 42%, transparent)`,
                    background: `color-mix(in oklab, ${meta.color} 13%, transparent)`,
                    color: meta.color,
                  }}
                >
                  <Icon size={17} weight="bold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: meta.color }}
                  >
                    {t(meta.tag)}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-medium leading-snug text-foreground/90">
                    {s.label}
                  </span>
                </span>
              </SpotlightCard>
            );
          })}
        </div>

        {/* How it works */}
        <section className="mt-20">
          <h2 className="mb-7 text-center font-pixel text-2xl tracking-tight text-foreground sm:text-3xl">
            {t("howKicker")}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {HOW_STEPS.map((s) => (
              <li key={s.n} className="how-card pixel-panel p-5">
                <span className="how-num mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-foreground bg-card font-pixel text-sm text-foreground">
                  {s.n}
                </span>
                <h3 className="font-mono text-[14px] font-semibold leading-snug tracking-tight text-foreground">
                  {t(s.title)}
                </h3>
                <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed tracking-tight text-muted-foreground">
                  {t(s.body)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <Party
          agents={agents}
          onCta={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            taRef.current?.focus();
          }}
        />
      </div>

      {transition
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-background/90 px-6 backdrop-blur-md">
              <OrbMark size={44} />
              <div className="text-center">
                <p className="text-[15px] font-semibold">
                  {transition.kind === "signin"
                    ? t("signinTitle")
                    : transition.kind === "resume"
                      ? t("resumeTitle")
                      : t("openTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {transition.kind === "signin" ? t("signinSub") : t("openSub")}
                </p>
              </div>
              {transition.text ? (
                <div className="max-w-sm truncate rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {transition.text}
                </div>
              ) : null}
              <span className="typing-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
