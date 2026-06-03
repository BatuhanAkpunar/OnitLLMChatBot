"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretRight, PaperPlaneRight } from "@phosphor-icons/react";
import { Markdown } from "./markdown";
import { parseMentions } from "@/lib/mentions";
import { sendUserMessage, setProjectMode } from "@/app/(app)/actions";

export type Agent = {
  key: string;
  display_name: string;
  handle: string;
  color: string;
  description?: string | null;
};

export type Message = {
  id: string;
  role: "user" | "agent" | "system";
  agent_key: string | null;
  content: string;
  thinking?: string | null;
  status: string;
};

const THINKING_PREF_KEY = "onit:thinking-collapsed";

export function ChatView({
  projectId,
  title,
  agents,
  initialMessages,
  defaultAgentKey,
  initialMode,
}: {
  projectId: string;
  title: string;
  agents: Agent[];
  initialMessages: Message[];
  defaultAgentKey: string;
  initialMode: "plan" | "build";
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [agentKey, setAgentKey] = useState(defaultAgentKey);
  const [mode, setMode] = useState<"plan" | "build">(initialMode);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapseThinking, setCollapseThinking] = useState(false);

  const [mention, setMention] = useState<{ open: boolean; query: string; start: number }>({
    open: false,
    query: "",
    start: -1,
  });
  const [hi, setHi] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);

  const agentByKey = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.key, a])) as Record<string, Agent>,
    [agents],
  );
  const activeAgent = agentByKey[agentKey];

  const filtered = useMemo(() => {
    if (!mention.open) return [];
    const q = mention.query.toLowerCase();
    return agents.filter(
      (a) =>
        a.handle.toLowerCase().includes(q) ||
        a.display_name.toLowerCase().includes(q),
    );
  }, [mention, agents]);

  useEffect(() => {
    setCollapseThinking(localStorage.getItem(THINKING_PREF_KEY) === "1");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Auto-send the first message typed on the home screen.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(`onit:pending:${projectId}`);
      if (raw) sessionStorage.removeItem(`onit:pending:${projectId}`);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { content?: string; agentKey?: string };
      const content = pending.content?.trim();
      if (!content) return;
      if (pending.agentKey) setAgentKey(pending.agentKey);
      const mentioned = parseMentions(
        content,
        agents.map((a) => ({ key: a.key, handle: a.handle })),
      );
      const targets = mentioned.length
        ? mentioned
        : pending.agentKey
          ? [pending.agentKey]
          : undefined;
      submit(content, targets);
    } catch {
      // ignore malformed pending payloads
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleThinking() {
    setCollapseThinking((c) => {
      const next = !c;
      localStorage.setItem(THINKING_PREF_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function toggleMode() {
    const next = mode === "plan" ? "build" : "plan";
    setMode(next);
    await setProjectMode(projectId, next);
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    const pos = e.target.selectionStart ?? val.length;
    const m = val.slice(0, pos).match(/(?:^|\s)@(\w*)$/);
    if (m) {
      setMention({ open: true, query: m[1], start: pos - m[1].length - 1 });
      setHi(0);
    } else if (mention.open) {
      setMention({ open: false, query: "", start: -1 });
    }
  }

  function pickMention(agent: Agent) {
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? input.length;
    const next =
      input.slice(0, mention.start) + agent.handle + " " + input.slice(pos);
    setInput(next);
    setMention({ open: false, query: "", start: -1 });
    requestAnimationFrame(() => ta?.focus());
  }

  async function runAgent(key: string) {
    const aid = `tmp-a-${Date.now()}-${key}`;
    setMessages((m) => [
      ...m,
      { id: aid, role: "agent", agent_key: key, content: "", thinking: "", status: "streaming" },
    ]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, agentKey: key, mode }),
      });
      if (!res.ok || !res.body) {
        const msg =
          res.status === 401
            ? "Your session expired. Please sign in again."
            : "Something went wrong. Please try again.";
        setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: msg, status: "error" } : x)));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let thinkingAcc = "";
      let answerAcc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const ln = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!ln.trim()) continue;
          let evt: { type: string; delta?: string; status?: string; content?: string };
          try {
            evt = JSON.parse(ln);
          } catch {
            continue;
          }
          if (evt.type === "thinking") {
            thinkingAcc += evt.delta ?? "";
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, thinking: thinkingAcc } : x)));
          } else if (evt.type === "answer") {
            answerAcc += evt.delta ?? "";
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: answerAcc } : x)));
          } else if (evt.type === "final") {
            const finalContent = evt.content ?? answerAcc;
            setMessages((m) =>
              m.map((x) => (x.id === aid ? { ...x, content: finalContent } : x)),
            );
          } else if (evt.type === "done") {
            setMessages((m) =>
              m.map((x) =>
                x.id === aid ? { ...x, status: evt.status === "error" ? "error" : "complete" } : x,
              ),
            );
          }
        }
      }
    } catch {
      setMessages((m) =>
        m.map((x) =>
          x.id === aid
            ? { ...x, status: "error", content: x.content || "Network error. Please try again." }
            : x,
        ),
      );
    }
  }

  async function submit(text: string, forcedAgents?: string[]) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMention({ open: false, query: "", start: -1 });

    const mentioned =
      forcedAgents ??
      parseMentions(text, agents.map((a) => ({ key: a.key, handle: a.handle })));
    const targets = mentioned.length ? mentioned : [agentKey];

    setMessages((m) => [
      ...m,
      { id: `tmp-u-${Date.now()}`, role: "user", agent_key: null, content: text, status: "complete" },
    ]);

    await sendUserMessage(projectId, text);
    setAgentKey(targets[targets.length - 1]);

    for (const key of targets) {
      await runAgent(key);
    }
    setBusy(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention.open && filtered.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((h) => (h + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((h) => (h - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickMention(filtered[hi] ?? filtered[0]);
        return;
      }
      if (e.key === "Escape") {
        setMention({ open: false, query: "", start: -1 });
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      setInput("");
      submit(text);
    }
  }

  const lastMessage = messages[messages.length - 1];
  const showPlanActions =
    mode === "plan" &&
    !busy &&
    lastMessage?.role === "agent" &&
    lastMessage.status === "complete";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
          title="Toggle Plan / Build mode"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${mode === "plan" ? "bg-amber-500" : "bg-emerald-500"}`}
          />
          {mode === "plan" ? "Plan mode" : "Build mode"}
        </button>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Mention an agent with @ (e.g. {activeAgent?.handle ?? "@Analyst"}) or just type to
              message {activeAgent?.display_name ?? "an agent"}.
            </p>
          ) : null}
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              agent={m.agent_key ? agentByKey[m.agent_key] : undefined}
              collapseThinking={collapseThinking}
              onToggleThinking={toggleThinking}
            />
          ))}
          {showPlanActions ? (
            <div className="flex gap-2 pl-0.5">
              <button
                type="button"
                onClick={() =>
                  submit("Approved — please continue.", [lastMessage.agent_key!])
                }
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => taRef.current?.focus()}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                Modify
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Default agent</span>
            <select
              value={agentKey}
              onChange={(e) => setAgentKey(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs outline-none"
            >
              {agents.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.display_name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">· @ to mention others</span>
          </div>

          <div className="relative">
            {mention.open && filtered.length ? (
              <div className="absolute bottom-full mb-2 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {filtered.map((a, i) => (
                  <button
                    key={a.key}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickMention(a);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      i === hi ? "bg-accent" : "hover:bg-accent"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: `var(--agent-${a.color})` }}
                    />
                    <span className="font-medium">{a.handle}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {a.display_name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={onChange}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Message agents… use @ to mention"
                className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const text = input.trim();
                  setInput("");
                  submit(text);
                }}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  agent,
  collapseThinking,
  onToggleThinking,
}: {
  message: Message;
  agent?: Agent;
  collapseThinking: boolean;
  onToggleThinking: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const color = agent ? `var(--agent-${agent.color})` : "var(--muted-foreground)";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color }}>
          {agent?.display_name ?? "Agent"}
        </span>
        {message.status === "error" ? (
          <span className="text-xs text-destructive">· error</span>
        ) : null}
        {message.status === "streaming" && !message.content && !message.thinking ? (
          <span className="text-xs text-muted-foreground">· thinking…</span>
        ) : null}
      </div>

      {message.thinking ? (
        <div>
          <button
            type="button"
            onClick={onToggleThinking}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretRight
              size={12}
              weight="bold"
              className={collapseThinking ? "" : "rotate-90"}
            />
            Thinking
          </button>
          {!collapseThinking ? (
            <div className="mt-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
              {message.thinking}
            </div>
          ) : null}
        </div>
      ) : null}

      {message.content ? (
        <div className="text-sm">
          <Markdown>{message.content}</Markdown>
        </div>
      ) : null}
    </div>
  );
}
