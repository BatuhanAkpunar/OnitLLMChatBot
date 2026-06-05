"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { BorderGlow } from "@/components/ui/border-glow";
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

  // Which role orbs are "active" = the ones @mentioned (or the default if none).
  const activeKeys = useMemo(() => {
    const mentioned = parseMentions(
      input,
      agents.map((a) => ({ key: a.key, handle: a.handle })),
    );
    return mentioned.length ? mentioned : [defaultAgentKey];
  }, [input, agents, defaultAgentKey]);

  const activeMode = MODES.find((m) => m.key === mode) ?? MODES[0];

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
      // Anyone can compose; the result is gated behind Google sign-in. Stash the
      // prompt so it runs automatically once they return signed-in.
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
      const m: Mode =
        p.mode === "plan" || p.mode === "discuss" ? p.mode : "build";
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

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-16">
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
            Brief one role or the whole team in a single prompt — mention
            <span className="text-foreground"> @Analyst</span>,
            <span className="text-foreground"> @Developer</span>,
            <span className="text-foreground"> @QA</span> and more. Plan it, build
            it, or talk it through.
          </p>
        </div>

        <BorderGlow radius={18} className="shadow-sm" innerClassName="p-2.5">
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
            placeholder="Ask your team anything, or @mention specific roles…"
            className="max-h-56 min-h-[56px] w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5">
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
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </div>
        </BorderGlow>

        <p className="mt-2 px-1 font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{activeMode.label}</span> ·{" "}
          {activeMode.tip}
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {agents.map((a) => {
            const on = activeKeys.includes(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => insertHandle(a.handle)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? "border-foreground/30 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full transition-transform"
                  style={{
                    backgroundColor: `var(--agent-${a.color})`,
                    transform: on ? "scale(1.5)" : "scale(1)",
                  }}
                />
                {a.handle}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
