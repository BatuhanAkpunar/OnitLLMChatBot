"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { createProjectAndGetId } from "@/app/(app)/actions";
import { BorderGlow } from "@/components/ui/border-glow";
import type { Agent } from "./chat-view";

const STARTERS = [
  "Turn this idea into user stories with acceptance criteria",
  "Draft an MVP plan and milestones for a new feature",
  "Review this code and suggest improvements",
  "Write test cases for a login form",
];

export function HomeComposer({
  userName,
  agents,
  defaultAgentKey,
}: {
  userName: string | null;
  agents: Agent[];
  defaultAgentKey: string;
}) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [agentKey, setAgentKey] = useState(defaultAgentKey);
  const [busy, setBusy] = useState(false);

  const firstName = userName?.trim().split(/\s+/)[0] || null;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  function fillStarter(text: string) {
    setInput(text);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  async function start() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    const { id } = await createProjectAndGetId();
    if (!id) {
      setBusy(false);
      return;
    }
    try {
      sessionStorage.setItem(
        `onit:pending:${id}`,
        JSON.stringify({ content: text, agentKey }),
      );
    } catch {
      // ignore storage failures; the chat will just open empty
    }
    router.push(`/p/${id}`);
  }

  function insertHandle(handle: string) {
    setInput((v) => (v.trim() ? `${v.trimEnd()} ${handle} ` : `${handle} `));
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {firstName ? `Welcome, ${firstName}` : "Welcome to Onit AI"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How can I help you today?
          </p>
        </div>

        <BorderGlow radius={16} className="shadow-sm" innerClassName="p-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            autoFocus
            placeholder="Ask anything, or @mention a role…"
            className="max-h-48 min-h-[52px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Default</span>
              <select
                value={agentKey}
                onChange={(e) => setAgentKey(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
              >
                {agents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.display_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={start}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </div>
        </BorderGlow>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {agents.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => insertHandle(a.handle)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(--agent-${a.color})` }}
              />
              {a.handle}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => fillStarter(s)}
              className="rounded-xl border border-border bg-card/50 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
