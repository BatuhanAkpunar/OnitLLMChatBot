"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight, Plus, Sparkle } from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { TeamConstellation } from "@/components/hero/team-constellation";
import { parseMentions } from "@/lib/mentions";
import type { Agent } from "./chat-view";

type Mode = "build" | "plan" | "discuss";

const MODES: { key: Mode; label: string; tip: string }[] = [
  { key: "build", label: "Build", tip: "Roles deliver the result directly." },
  { key: "plan", label: "Plan", tip: "Roles outline the approach and check in first." },
  { key: "discuss", label: "Discuss", tip: "Roles weigh the options and trade-offs together." },
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

  const firstName = userName?.trim().split(/\s+/)[0] || null;

  // Build a concrete example from the real roster (first two roles).
  const example = useMemo(() => {
    const a = agents[0]?.handle ?? "@Analyst";
    const b = agents[2]?.handle ?? "@Developer";
    return `${a} turn this idea into user stories, then ${b} build a first version.`;
  }, [agents]);

  const activeKeys = useMemo(() => {
    const mentioned = parseMentions(
      input,
      agents.map((a) => ({ key: a.key, handle: a.handle })),
    );
    return mentioned.length ? mentioned : [defaultAgentKey];
  }, [input, agents, defaultAgentKey]);

  const activeMode = MODES.find((m) => m.key === mode) ?? MODES[0];
  const hasMention = parseMentions(
    input,
    agents.map((a) => ({ key: a.key, handle: a.handle })),
  ).length > 0;

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }

  async function openChat(text: string, modeArg: Mode) {
    setBusy(true);
    const { id } = await createProjectAndGetId();
    if (!id) {
      setBusy(false);
      return;
    }
    try {
      sessionStorage.setItem(
        `onit:pending:${id}`,
        JSON.stringify({ content: text, agentKey: defaultAgentKey, mode: modeArg }),
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
          JSON.stringify({ content: text, mode }),
        );
      } catch {}
      setBusy(true);
      await signInWithGoogle();
      return;
    }
    openChat(text, mode);
  }

  // After an anonymous visitor signs in, replay the prompt they had typed.
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
      const p = JSON.parse(raw) as { content?: string; mode?: string };
      const text = p.content?.trim();
      if (!text) return;
      const m: Mode = p.mode === "plan" || p.mode === "discuss" ? p.mode : "build";
      openChat(text, m);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function insertHandle(handle: string) {
    setInput((v) => (v.trim() ? `${v.trimEnd()} ${handle} ` : `${handle} `));
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autosize();
    });
  }

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
            Describe a task and <span className="text-foreground">@mention</span>{" "}
            the roles who should handle it — pick from the team below. Combine
            several in one prompt and each replies in its lane.
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
            placeholder={`Describe a task… e.g. “${agents[2]?.handle ?? "@Developer"} build a login form, ${agents[5]?.handle ?? "@QA"} add tests”`}
            className="max-h-56 min-h-[56px] w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
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
              disabled={busy || !input.trim()}
              aria-label="Send"
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 ${
                input.trim() && !busy ? "btn-glow" : ""
              }`}
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

        {/* The team — the core mechanic, made obvious for first-timers. */}
        <div className="mt-7">
          <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Your team · tap a role to add it to your prompt
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map((a) => {
              const on = activeKeys.includes(a.key) && hasMention;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => insertHandle(a.handle)}
                  className={`group flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                    on
                      ? "border-foreground/30 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full transition-transform"
                    style={{
                      backgroundColor: `var(--agent-${a.color})`,
                      transform: on ? "scale(1.6)" : "scale(1)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.handle}</div>
                    {a.description ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.description}
                      </div>
                    ) : null}
                  </div>
                  <Plus
                    size={14}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
