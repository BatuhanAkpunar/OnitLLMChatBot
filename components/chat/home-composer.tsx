"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight, Sparkle, Check, CheckCircle, CaretRight } from "@phosphor-icons/react";
import { STARTERS } from "./starters";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { Aurora } from "@/components/hero/aurora";
import { RoleAvatar, rolePersona } from "./role-visual";
import type { Agent } from "./chat-view";

type Mode = "build" | "plan" | "discuss";
type Panel = "agents" | "modes" | null;

const MODES: { key: Mode; label: string; tip: string }[] = [
  { key: "build", label: "Build", tip: "The team delivers the result directly." },
  { key: "plan", label: "Plan", tip: "The team outlines the approach and checks in first." },
  { key: "discuss", label: "Discuss", tip: "The team weighs options and trade-offs together." },
];

// The promise of the product in three beats: brief, team works, you steer.
const STEPS = [
  "Write what you need",
  "The team gets to work",
  "You review and steer",
];

const EXAMPLES = [
  "@Developer build a Stripe checkout, then @QA cover the edge cases.",
  "@Analyst spec a referral program, then @ProductManager prioritize the rollout.",
  "@Designer sketch an onboarding flow and @Developer build the first screen.",
  "Plan a two week MVP for a habit tracker app.",
  "Should we use SQL or NoSQL for a realtime chat app? Weigh the trade offs.",
  "@QA write test cases for a password reset flow, and @Developer fix what breaks.",
];

// Matches the orb plasma palette (violet to indigo).
const ACCENT_TITLE: CSSProperties = {
  backgroundImage: "linear-gradient(95deg, #a78bfa, #6366f1)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

function stripAt(handle: string) {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

export function HomeComposer({
  authed,
  userName,
  agents,
}: {
  authed: boolean;
  userName: string | null;
  agents: Agent[];
  defaultAgentKey?: string;
}) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll state for the team carousel.
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, scrollStart: 0, moved: 0 });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [exIdx, setExIdx] = useState(0);

  // Inline command panel (@ agents, / modes), like a command palette.
  const [panel, setPanel] = useState<Panel>(null);
  const [panelSource, setPanelSource] = useState<"typed" | "chip">("chip");
  const [filter, setFilter] = useState("");
  const [tokenStart, setTokenStart] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);

  const firstName = userName?.trim().split(/\s+/)[0] || null;

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
    if (!q) return MODES;
    return MODES.filter((m) => m.key.startsWith(q));
  }, [filter]);

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
    const val = e.target.value;
    setInput(val);
    autosize();

    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const at = before.match(/(?:^|\s)@(\w*)$/);
    const slash = before.match(/^\/(\w*)$/);
    if (at) {
      setPanel("agents");
      setPanelSource("typed");
      setFilter(at[1]);
      setTokenStart(caret - at[1].length - 1);
      setHighlight(0);
    } else if (slash) {
      setPanel("modes");
      setPanelSource("typed");
      setFilter(slash[1]);
      setTokenStart(0);
      setHighlight(0);
    } else if (panel) {
      closePanel();
    }
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
    const { id } = await createProjectAndGetId();
    if (!id) {
      setBusy(false);
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
      openChat(text, m, p.agents ?? []);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!panel) return;
    const close = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  function onTrackPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return; // touch scrolls natively
    const el = trackRef.current;
    if (!el) return;
    dragState.current = {
      down: true,
      startX: e.clientX,
      scrollStart: el.scrollLeft,
      moved: 0,
    };
    // No pointer capture yet: capturing here would swallow the click on the
    // cards. We only capture once the pointer actually starts dragging.
  }

  function onTrackPointerMove(e: React.PointerEvent) {
    const el = trackRef.current;
    const d = dragState.current;
    if (!el || !d.down) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 6 && !el.hasPointerCapture(e.pointerId)) {
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = d.scrollStart - dx;
  }

  function onTrackPointerUp(e: React.PointerEvent) {
    const el = trackRef.current;
    dragState.current.down = false;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }

  function cycleExample() {
    closePanel();
    setInput(EXAMPLES[exIdx % EXAMPLES.length]);
    setExIdx((i) => i + 1);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autosize();
    });
  }

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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-12">
      <Aurora className="absolute inset-x-0 top-0 z-0 h-[52%]" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-7 flex flex-col items-center text-center">
          {firstName ? (
            <span className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
              Welcome back, {firstName}
            </span>
          ) : null}
          <h1 className="text-balance text-[2.75rem] font-bold leading-[1.04] tracking-tight sm:text-[3.5rem]">
            Your AI product team.
            <br />
            <span style={ACCENT_TITLE}>On it.</span>
          </h1>
          <div className="mt-5 flex flex-col items-center gap-1.5 sm:flex-row sm:gap-3">
            {STEPS.map((step, i) => (
              <span key={step} className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-[15px] font-medium text-foreground/80">
                  <span className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step}
                </span>
                {i < STEPS.length - 1 ? (
                  <CaretRight
                    size={12}
                    weight="bold"
                    className="hidden text-foreground/30 sm:block"
                  />
                ) : null}
              </span>
            ))}
          </div>
        </div>

        <div ref={composerRef} className="relative">
          <div className="rounded-2xl border border-border bg-card/85 p-2.5 shadow-xl backdrop-blur-xl">
            <textarea
              ref={taRef}
              value={input}
              onChange={onChange}
              onKeyDown={onKeyDown}
              rows={2}
              autoFocus
              placeholder="Ask your team anything…"
              className="max-h-56 min-h-[52px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none"
            />
            <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => togglePanel("agents")}
                  aria-expanded={panel === "agents"}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                    panel === "agents"
                      ? "border-violet-500/45 text-foreground"
                      : "border-border text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded border border-border bg-background px-0.5 font-mono text-[10px]">
                    @
                  </kbd>
                  {pinnedAgents.length === 0 ? (
                    "agents"
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="flex -space-x-1.5">
                        {pinnedAgents.slice(0, 3).map((a) => (
                          <RoleAvatar
                            key={a.key}
                            roleKey={a.key}
                            color={a.color}
                            size={16}
                            rounded="rounded-full"
                          />
                        ))}
                      </span>
                      {pinnedAgents.length === 1
                        ? stripAt(pinnedAgents[0].handle)
                        : `${pinnedAgents.length} agents`}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => togglePanel("modes")}
                  aria-expanded={panel === "modes"}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                    panel === "modes"
                      ? "border-violet-500/45 text-foreground"
                      : "border-border text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded border border-border bg-background px-0.5 font-mono text-[10px]">
                    /
                  </kbd>
                  {mode}
                </button>
                <button
                  type="button"
                  onClick={cycleExample}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[13px] font-semibold text-foreground/70 transition-colors hover:text-foreground"
                >
                  <Sparkle size={12} weight="fill" className="text-violet-500 dark:text-violet-300" />
                  example
                </button>
              </div>
              <button
                type="button"
                onClick={start}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="send-btn flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </div>
          </div>

          {panel ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
              <div className="border-b border-border px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {panel === "agents" ? "Agents" : "Modes"}
              </div>
              {panel === "agents" ? (
                filteredAgents.length === 0 ? (
                  <div className="px-3.5 py-3 text-xs text-muted-foreground">
                    No matching agent.
                  </div>
                ) : (
                  filteredAgents.map((a, i) => (
                    <button
                      key={a.key}
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => selectAgent(a)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                        i === highlight ? "bg-accent" : ""
                      }`}
                    >
                      <RoleAvatar roleKey={a.key} color={a.color} size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{a.handle}</span>
                        <span className="block truncate text-[13px] text-foreground/65">
                          {rolePersona(a.key, a.description)}
                        </span>
                      </span>
                      {pinned.includes(a.key) ? (
                        <Check size={14} weight="bold" className="shrink-0 text-violet-500 dark:text-violet-300" />
                      ) : null}
                    </button>
                  ))
                )
              ) : filteredModes.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-muted-foreground">
                  No matching mode.
                </div>
              ) : (
                filteredModes.map((m, i) => (
                  <button
                    key={m.key}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectMode(m.key)}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      i === highlight ? "bg-accent" : ""
                    }`}
                  >
                    <kbd className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-background font-mono text-[11px]">
                      /
                    </kbd>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{m.label}</span>
                      <span className="block truncate text-[13px] text-foreground/65">
                        {m.tip}
                      </span>
                    </span>
                    {mode === m.key ? (
                      <Check size={14} weight="bold" className="shrink-0 text-violet-500 dark:text-violet-300" />
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Quick starts: show what the team can do, one tap to begin. */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => pickStarter(s.prompt)}
              className="rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[13px] text-foreground/75 backdrop-blur transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.06] hover:text-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
              Meet your team
            </h2>
            <p className="mt-1.5 text-sm font-medium text-foreground/70">
              Six specialists, one brief. Tap anyone to bring them in.
            </p>
          </div>

          <div className="relative py-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background to-transparent" />

            <div
              ref={trackRef}
              onPointerDown={onTrackPointerDown}
              onPointerMove={onTrackPointerMove}
              onPointerUp={onTrackPointerUp}
              onPointerCancel={onTrackPointerUp}
              className="onit-carousel flex cursor-grab gap-4 px-4 active:cursor-grabbing"
            >
              {agents.map((a) => {
                  const on = pinned.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        if (dragState.current.moved > 6) return;
                        pinForKey(a.key);
                      }}
                      className={`relative flex w-[168px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] ${
                        on ? "" : "ring-1 ring-inset ring-border"
                      }`}
                      style={
                        on
                          ? { boxShadow: `inset 0 0 0 2px var(--agent-${a.color}), 0 10px 30px -10px rgba(0,0,0,0.35)` }
                          : undefined
                      }
                    >
                      <span
                        className="block w-full"
                        style={{
                          background: `linear-gradient(160deg, color-mix(in srgb, var(--agent-${a.color}) 28%, transparent), color-mix(in srgb, var(--agent-${a.color}) 8%, transparent))`,
                        }}
                      >
                        <RoleAvatar
                          roleKey={a.key}
                          color={a.color}
                          size={168}
                          rounded="rounded-none"
                        />
                      </span>
                      {on ? (
                        <span className="absolute right-2 top-2 grid place-items-center rounded-full bg-background shadow-md">
                          <CheckCircle
                            size={22}
                            weight="fill"
                            style={{ color: `var(--agent-${a.color})` }}
                          />
                        </span>
                      ) : null}
                      <span className="flex flex-col gap-1 p-3.5">
                        <span className="text-[15px] font-bold tracking-tight">
                          {a.handle}
                        </span>
                        <span className="line-clamp-3 text-[13px] leading-snug text-foreground/70">
                          {rolePersona(a.key, a.description)}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
