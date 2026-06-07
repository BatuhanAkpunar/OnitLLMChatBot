"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight, Sparkle, CheckCircle } from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { signInWithGoogle } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { RoutingControl } from "./routing-control";
import { roleIcon, rolePersona } from "./role-visual";
import { guessRoles } from "@/lib/route-heuristic";
import type { Agent } from "./chat-view";

type Mode = "build" | "plan" | "discuss";

const MODES: { key: Mode; label: string; tip: string }[] = [
  { key: "build", label: "Build", tip: "The team delivers the result directly." },
  { key: "plan", label: "Plan", tip: "The team outlines the approach and checks in first." },
  { key: "discuss", label: "Discuss", tip: "The team weighs the options and trade-offs together." },
];

const EXAMPLES = [
  "@Developer build a Stripe checkout, then @QA cover the edge cases.",
  "@Analyst spec a referral program, then @ProductManager prioritize the rollout.",
  "@Designer sketch an onboarding flow and @Developer build the first screen.",
  "Plan a two week MVP for a habit tracker app.",
  "Should we use SQL or NoSQL for a realtime chat app? Weigh the trade offs.",
  "@QA write test cases for a password reset flow, and @Developer fix what breaks.",
];

const ACCENT_TITLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(95deg, var(--agent-analyst), var(--agent-product-designer), var(--agent-developer))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

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
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [exIdx, setExIdx] = useState(0);

  const firstName = userName?.trim().split(/\s+/)[0] || null;
  const agentKeys = useMemo(() => agents.map((a) => a.key), [agents]);
  const guessed = useMemo(() => guessRoles(input, agentKeys), [input, agentKeys]);
  const handlesOf = (keys: string[]) =>
    agents
      .filter((a) => keys.includes(a.key))
      .map((a) => a.handle)
      .join(", ");

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

  function cycleExample() {
    setInput(EXAMPLES[exIdx % EXAMPLES.length]);
    setExIdx((i) => i + 1);
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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="onit-aurora" aria-hidden />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={60} />
          {firstName ? (
            <span className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Welcome back, {firstName}
            </span>
          ) : null}
          <h1 className="mt-3 text-balance text-[2.5rem] font-semibold leading-[1.03] tracking-tight sm:text-[3.25rem]">
            Your AI product team.
            <br />
            <span style={ACCENT_TITLE}>On it.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Describe what you need. Onit reads it, brings in the right
            specialists, and gets to work. You stay in control.
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
            placeholder="Describe what you need, or @mention a specialist…"
            className="max-h-56 min-h-[52px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5 pt-1">
            <div className="flex items-center gap-1.5">
              <RoutingControl agents={agents} pinned={pinned} onChange={setPinned} />
              <div className="inline-flex rounded-xl bg-white/5 p-1 ring-1 ring-inset ring-white/10">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    title={m.tip}
                    onClick={() => setMode(m.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      mode === m.key
                        ? "bg-foreground text-background shadow-sm"
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

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            {pinned.length ? (
              <>
                <span className="text-foreground">{handlesOf(pinned)}</span>{" "}
                {pinned.length > 1 ? "are" : "is"} on it.
              </>
            ) : (
              <>
                Onit will route this to the right specialist
                {input.trim() && guessed.length ? (
                  <>
                    {" "}
                    (likely{" "}
                    <span className="text-foreground">{handlesOf(guessed)}</span>)
                  </>
                ) : null}
                .
              </>
            )}
          </p>
          <button
            type="button"
            onClick={cycleExample}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkle size={13} weight="fill" />
            Try an example
          </button>
        </div>

        <div className="mt-9">
          <div className="mb-4 text-center">
            <div className="text-sm font-medium">Your team is standing by</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Tap a specialist to put them on it, or let Onit decide.
            </div>
          </div>

          <div className="group relative overflow-hidden py-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

            <div className="onit-marquee">
              {[0, 1].map((dup) =>
                agents.map((a) => {
                  const on = pinned.includes(a.key);
                  const Icon = roleIcon(a.key);
                  return (
                    <button
                      key={`${a.key}-${dup}`}
                      type="button"
                      aria-pressed={on}
                      aria-hidden={dup === 1}
                      tabIndex={dup === 1 ? -1 : 0}
                      onClick={() => pinForKey(a.key)}
                      className={`mr-3 flex w-[168px] shrink-0 flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all ${
                        on
                          ? "border-transparent bg-white/[0.09]"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      }`}
                      style={
                        on
                          ? { boxShadow: `inset 0 0 0 1.5px var(--agent-${a.color})` }
                          : undefined
                      }
                    >
                      <span
                        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full ring-1 ring-inset ring-white/10"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--agent-${a.color}) 16%, transparent)`,
                        }}
                      >
                        <Icon
                          size={24}
                          weight="bold"
                          style={{ color: `var(--agent-${a.color})` }}
                        />
                        {on ? (
                          <span className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-background">
                            <CheckCircle
                              size={17}
                              weight="fill"
                              style={{ color: `var(--agent-${a.color})` }}
                            />
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm font-semibold">{a.handle}</span>
                      <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                        {rolePersona(a.key, a.description)}
                      </span>
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
