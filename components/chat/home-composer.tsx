"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaperPlaneRight,
  CheckCircle,
  Circle,
  Sparkle,
  Lightning,
} from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { TeamConstellation } from "@/components/hero/team-constellation";
import { RoutingControl } from "./routing-control";
import { guessRoles } from "@/lib/route-heuristic";
import type { Agent } from "./chat-view";

type Mode = "build" | "plan" | "discuss";

const MODES: { key: Mode; label: string; tip: string }[] = [
  { key: "build", label: "Build", tip: "The team delivers the result directly." },
  { key: "plan", label: "Plan", tip: "The team outlines the approach and checks in first." },
  { key: "discuss", label: "Discuss", tip: "The team weighs the options and trade-offs together." },
];

export function HomeComposer({
  authed,
  userName,
  agents,
  defaultAgentKey,
}: {
  authed: boolean;
  userName: string | null;
  agents: Agent[];
  defaultAgentKey: string;
}) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [busy, setBusy] = useState(false);
  // empty = Auto (Onit routes); otherwise the roles the user pinned.
  const [pinned, setPinned] = useState<string[]>([]);

  const firstName = userName?.trim().split(/\s+/)[0] || null;
  const agentKeys = useMemo(() => agents.map((a) => a.key), [agents]);
  const guessed = useMemo(() => guessRoles(input, agentKeys), [input, agentKeys]);
  const activeKeys = pinned.length ? pinned : guessed;
  const activeMode = MODES.find((m) => m.key === mode) ?? MODES[0];
  const handlesOf = (keys: string[]) =>
    agents
      .filter((a) => keys.includes(a.key))
      .map((a) => a.handle)
      .join(", ");

  const example = useMemo(() => {
    return "Design and build a password-less login, and cover the edge cases.";
  }, []);

  function pinForKey(key: string) {
    setPinned((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
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

  function fillExample() {
    setInput(example);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autosize();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-12">
      <TeamConstellation activeKeys={activeKeys} className="opacity-90" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-5">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Onit&nbsp;AI{firstName ? ` · welcome, ${firstName}` : ""}
          </span>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Your AI product team
            <span className="text-muted-foreground"> — on it.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Just describe what you need — Onit reads it and routes to the right
            roles. Prefer to choose? Pin roles yourself.
          </p>
        </div>

        <div className="glass-strong glass-edge rounded-2xl p-2.5 shadow-sm">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autosize();
            }}
            onKeyDown={onKeyDown}
            rows={2}
            autoFocus
            placeholder="Describe what you need — Onit routes it to the right team…"
            className="max-h-56 min-h-[52px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5 pt-1">
            <div className="flex items-center gap-1.5">
              <RoutingControl agents={agents} pinned={pinned} onChange={setPinned} />
              <div className="hidden items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 sm:inline-flex">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    title={m.tip}
                    onClick={() => setMode(m.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      mode === m.key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
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

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {pinned.length ? (
              <>
                On it ·{" "}
                <span className="text-foreground">{handlesOf(pinned)}</span>
              </>
            ) : (
              <>
                <Lightning size={12} weight="fill" className="text-amber-400" />
                Auto ·{" "}
                {input.trim() && guessed.length ? (
                  <>
                    likely{" "}
                    <span className="text-foreground">{handlesOf(guessed)}</span>
                  </>
                ) : (
                  "Onit picks the right role(s)"
                )}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={fillExample}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkle size={13} weight="fill" />
            Try an example
          </button>
        </div>

        {/* Meet the team — teaches the roles; tapping pins one (overrides Auto). */}
        <div className="mt-7">
          <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Meet your team · tap to pin a role (otherwise Auto decides)
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map((a) => {
              const on = pinned.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pinForKey(a.key)}
                  className={`group flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${
                    on ? "bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                  }`}
                  style={on ? { borderColor: `var(--agent-${a.color})` } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--agent-${a.color})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.handle}</div>
                    {a.description ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.description}
                      </div>
                    ) : null}
                  </div>
                  {on ? (
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="shrink-0"
                      style={{ color: `var(--agent-${a.color})` }}
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
