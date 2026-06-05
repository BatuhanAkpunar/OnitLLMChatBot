"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaperPlaneRight,
  CheckCircle,
  Circle,
  X,
  Sparkle,
} from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { TeamConstellation } from "@/components/hero/team-constellation";
import { parseMentions } from "@/lib/mentions";
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
  const [selected, setSelected] = useState<string[]>([defaultAgentKey]);

  const firstName = userName?.trim().split(/\s+/)[0] || null;
  const mentionList = useMemo(
    () => agents.map((a) => ({ key: a.key, handle: a.handle })),
    [agents],
  );

  const mentions = useMemo(
    () => parseMentions(input, mentionList),
    [input, mentionList],
  );

  // Who's "on it": the roles the user put on the task, plus anyone @mentioned.
  const targets = useMemo(() => {
    const set = [...new Set([...selected, ...mentions])];
    return set.length ? set : agents[0] ? [agents[0].key] : [];
  }, [selected, mentions, agents]);

  const selectedAgents = agents.filter((a) => selected.includes(a.key));
  const activeMode = MODES.find((m) => m.key === mode) ?? MODES[0];

  const example = useMemo(() => {
    const a = agents[2]?.handle ?? "@Developer";
    const b = agents[5]?.handle ?? "@QA";
    return `Build a password-less login: ${a} implement it and ${b} cover the edge cases.`;
  }, [agents]);

  function toggleRole(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }

  async function openChat(text: string, modeArg: Mode, agentKeys: string[]) {
    setBusy(true);
    const { id } = await createProjectAndGetId();
    if (!id) {
      setBusy(false);
      return;
    }
    try {
      sessionStorage.setItem(
        `onit:pending:${id}`,
        JSON.stringify({
          content: text,
          agents: agentKeys,
          agentKey: agentKeys[0] ?? defaultAgentKey,
          mode: modeArg,
        }),
      );
    } catch {
      // ignore storage failures; the chat will just open empty
    }
    router.push(`/p/${id}`);
  }

  async function start() {
    const text = input.trim();
    if (!text || busy || targets.length === 0) return;
    if (!authed) {
      try {
        localStorage.setItem(
          "onit:anonPending",
          JSON.stringify({ content: text, mode, agents: targets }),
        );
      } catch {}
      setBusy(true);
      await signInWithGoogle();
      return;
    }
    openChat(text, mode, targets);
  }

  // After an anonymous visitor signs in, replay the brief they had typed.
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
      const ks = p.agents?.length ? p.agents : [defaultAgentKey];
      openChat(text, m, ks);
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
      <TeamConstellation activeKeys={targets} className="opacity-90" />

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
            Put the right roles{" "}
            <span className="text-foreground">on the task</span> — tap them in the
            team below — then brief them. Mix several and each works in its lane.
          </p>
        </div>

        <div className="glass-strong glass-edge rounded-2xl p-2.5 shadow-sm">
          {/* On it — who will act on this brief */}
          <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-2 pt-1">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              On&nbsp;it
            </span>
            {selectedAgents.length ? (
              selectedAgents.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleRole(a.key)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-0.5 pl-2 pr-1 text-xs transition-colors hover:bg-white/10"
                  title={`Remove ${a.handle}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: `var(--agent-${a.color})` }}
                  />
                  {a.handle}
                  <X size={11} className="text-muted-foreground group-hover:text-foreground" />
                </button>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                tap a role below to put it on the task
              </span>
            )}
          </div>

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
            placeholder="Brief your team… what should they build, plan or weigh in on?"
            className="max-h-56 min-h-[52px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5 pt-1">
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
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
            <button
              type="button"
              onClick={start}
              disabled={busy || !input.trim() || targets.length === 0}
              aria-label="Send"
              className="send-btn flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground">{activeMode.label}</span> ·{" "}
            {activeMode.tip}
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

        {/* The team — clearly selectable, with what each role does. */}
        <div className="mt-7">
          <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Your team · tap to put a role on the task
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map((a) => {
              const on = selected.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRole(a.key)}
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
