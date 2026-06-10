"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CaretRight,
  PaperPlaneRight,
  Stop,
  Copy,
  ArrowClockwise,
  PencilSimple,
  ArrowDown,
  Lightning,
  Play,
  DownloadSimple,
  ListChecks,
  Scroll,
  ThumbsUp,
  ThumbsDown,
  Globe,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Markdown } from "./markdown";
import { RoutingControl } from "./routing-control";
import { parseMentions } from "@/lib/mentions";
import {
  sendUserMessage,
  setProjectMode,
  deleteMessage,
  truncateFromMessage,
  orchestrate,
  saveCoordinatorMessage,
  recordRouting,
  synthesize,
  setProjectRules,
  addProjectTasks,
  setTaskStatus,
  setMessageFeedback,
  statusSummary,
  type ProjectTask,
} from "@/app/(app)/actions";

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
  feedback?: number | null;
};

const THINKING_PREF_KEY = "onit:thinking-collapsed";

type Mode = "build" | "plan" | "discuss";
const MODE_LABELS: Record<Mode, string> = {
  build: "Build",
  plan: "Plan",
  discuss: "Discuss",
};

export function ChatView({
  projectId,
  title,
  agents,
  initialMessages,
  defaultAgentKey,
  initialMode,
  initialRules = "",
  initialTasks = [],
}: {
  projectId: string;
  title: string;
  agents: Agent[];
  initialMessages: Message[];
  defaultAgentKey: string;
  initialMode: Mode;
  initialRules?: string;
  initialTasks?: ProjectTask[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [agentKey, setAgentKey] = useState(defaultAgentKey);
  const [pinned, setPinned] = useState<string[]>([]);
  const [routing, setRouting] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{
    tasks: { role: string; task: string; done: string }[];
    text: string;
  } | null>(null);
  const [rules, setRules] = useState(initialRules);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(initialRules);
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [web, setWeb] = useState(false);
  const webRef = useRef(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapseThinking, setCollapseThinking] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [mention, setMention] = useState<{ open: boolean; query: string; start: number }>({
    open: false,
    query: "",
    start: -1,
  });
  const [hi, setHi] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const modeRef = useRef<Mode>(initialMode);

  const agentByKey = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.key, a])) as Record<string, Agent>,
    [agents],
  );

  const filtered = useMemo(() => {
    if (!mention.open) return [];
    const q = mention.query.toLowerCase();
    return agents.filter(
      (a) =>
        a.handle.toLowerCase().includes(q) || a.display_name.toLowerCase().includes(q),
    );
  }, [mention, agents]);

  useEffect(() => {
    setCollapseThinking(localStorage.getItem(THINKING_PREF_KEY) === "1");
  }, []);

  // Restore the per-chat mode (covers "discuss", which isn't persisted server-side).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`onit:mode:${projectId}`);
      if (saved === "plan" || saved === "build" || saved === "discuss") {
        setMode(saved);
        modeRef.current = saved;
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    if (atBottom) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, atBottom]);

  // auto-grow the composer textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [input]);

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
      const pending = JSON.parse(raw) as {
        content?: string;
        agentKey?: string;
        agents?: string[];
        mode?: string;
      };
      const content = pending.content?.trim();
      if (!content) return;
      if (pending.agents?.length) setPinned(pending.agents);
      if (pending.agentKey) setAgentKey(pending.agentKey);
      if (
        pending.mode === "plan" ||
        pending.mode === "build" ||
        pending.mode === "discuss"
      ) {
        setMode(pending.mode);
        modeRef.current = pending.mode;
        try {
          localStorage.setItem(`onit:mode:${projectId}`, pending.mode);
        } catch {}
        if (pending.mode !== "discuss") setProjectMode(projectId, pending.mode);
      }
      const mentioned = parseMentions(
        content,
        agents.map((a) => ({ key: a.key, handle: a.handle })),
      );
      const merged = [...new Set([...(pending.agents ?? []), ...mentioned])];
      submit(content, merged.length ? merged : undefined);
    } catch {
      // ignore malformed pending payloads
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
  }

  function toggleThinking() {
    setCollapseThinking((c) => {
      const next = !c;
      localStorage.setItem(THINKING_PREF_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function pickMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    modeRef.current = next;
    try {
      localStorage.setItem(`onit:mode:${projectId}`, next);
    } catch {}
    if (next !== "discuss") await setProjectMode(projectId, next);
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
    const next = input.slice(0, mention.start) + agent.handle + " " + input.slice(pos);
    setInput(next);
    setMention({ open: false, query: "", start: -1 });
    requestAnimationFrame(() => ta?.focus());
  }

  async function runAgent(key: string, task?: string) {
    let aid = `tmp-a-${Date.now()}-${key}`;
    setMessages((m) => [
      ...m,
      { id: aid, role: "agent", agent_key: key, content: "", thinking: "", status: "streaming" },
    ]);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentKey: key,
          mode: modeRef.current,
          task,
          web: webRef.current,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        let detail = "";
        try {
          detail = (await res.text()).slice(0, 160).trim();
        } catch {}
        const msg =
          res.status === 401
            ? "Your session expired. Please sign in again."
            : `Couldn't reach the model (HTTP ${res.status})${detail ? `: ${detail}` : ""}. Please try again.`;
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
          let evt: {
            type: string;
            delta?: string;
            status?: string;
            content?: string;
            messageId?: string;
          };
          try {
            evt = JSON.parse(ln);
          } catch {
            continue;
          }
          if (evt.type === "meta" && evt.messageId) {
            // Swap the optimistic id for the real one so feedback works.
            const real = evt.messageId;
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, id: real } : x)));
            aid = real;
          } else if (evt.type === "thinking") {
            thinkingAcc += evt.delta ?? "";
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, thinking: thinkingAcc } : x)));
          } else if (evt.type === "answer") {
            answerAcc += evt.delta ?? "";
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: answerAcc } : x)));
          } else if (evt.type === "final") {
            const finalContent = evt.content ?? answerAcc;
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: finalContent } : x)));
          } else if (evt.type === "done") {
            setMessages((m) =>
              m.map((x) =>
                x.id === aid ? { ...x, status: evt.status === "error" ? "error" : "complete" } : x,
              ),
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setMessages((m) => m.map((x) => (x.id === aid ? { ...x, status: "complete" } : x)));
      } else {
        setMessages((m) =>
          m.map((x) =>
            x.id === aid
              ? { ...x, status: "error", content: x.content || "Network error. Please try again." }
              : x,
          ),
        );
      }
    } finally {
      abortRef.current = null;
    }
  }

  async function submit(text: string, forcedAgents?: string[]) {
    if (!text.trim() || busy) return;

    // /status: coordinator project report, no user message persisted.
    if (text.trim().toLowerCase() === "/status") {
      setBusy(true);
      setRouting(true);
      try {
        const { text: report } = await statusSummary(projectId);
        const content = report || "I don't have enough activity to report on yet.";
        const { id } = await saveCoordinatorMessage(projectId, content);
        setMessages((m) => [
          ...m,
          {
            id: id ?? `tmp-c-${Date.now()}`,
            role: "agent",
            agent_key: "coordinator",
            content,
            status: "complete",
          },
        ]);
      } finally {
        setRouting(false);
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    stoppedRef.current = false;
    setMention({ open: false, query: "", start: -1 });

    const inline = parseMentions(text, agents.map((a) => ({ key: a.key, handle: a.handle })));

    setMessages((m) => [
      ...m,
      { id: `tmp-u-${Date.now()}`, role: "user", agent_key: null, content: text, status: "complete" },
    ]);
    setAtBottom(true);
    await sendUserMessage(projectId, text);

    const handleOf = (key: string) =>
      agents.find((a) => a.key === key)?.handle ?? key;
    let plan: { role: string; task?: string; done?: string }[];
    let recordAs: "manual" | "auto" | null = null;

    if (forcedAgents) {
      plan = forcedAgents.map((r) => ({ role: r }));
    } else if (pinned.length) {
      plan = [...new Set([...pinned, ...inline])].map((r) => ({ role: r }));
      recordAs = "manual";
    } else if (inline.length) {
      plan = inline.map((r) => ({ role: r }));
      recordAs = "manual";
    } else {
      // Auto: Onit reads the request, asks if unclear, or plans the work across roles.
      setRouting(true);
      let decision:
        | { action: "clarify"; question: string }
        | {
            action: "work";
            rationale: string;
            tasks: { role: string; task: string; done: string }[];
          };
      try {
        decision = await orchestrate(projectId, text);
      } catch {
        decision = {
          action: "work",
          rationale: "",
          tasks: [{ role: agentKey, task: text, done: "" }],
        };
      }
      setRouting(false);

      if (decision.action === "clarify") {
        const { id } = await saveCoordinatorMessage(projectId, decision.question);
        setMessages((m) => [
          ...m,
          {
            id: id ?? `tmp-c-${Date.now()}`,
            role: "agent",
            agent_key: "coordinator",
            content: decision.question,
            status: "complete",
          },
        ]);
        setBusy(false);
        return;
      }

      plan = decision.tasks.length
        ? decision.tasks.map((t) => ({ role: t.role, task: t.task, done: t.done }))
        : [{ role: agentKey }];
      recordAs = "auto";

      if (plan.length > 1) {
        const planText =
          "Here's the plan:\n" +
          decision.tasks
            .map(
              (t) =>
                `- **${handleOf(t.role)}**: ${t.task}${t.done ? `\n  - _${t.done}_` : ""}`,
            )
            .join("\n");
        const { id } = await saveCoordinatorMessage(projectId, planText);
        setMessages((m) => [
          ...m,
          {
            id: id ?? `tmp-c-${Date.now()}`,
            role: "agent",
            agent_key: "coordinator",
            content: planText,
            status: "complete",
          },
        ]);
      } else {
        const h = handleOf(plan[0]?.role ?? agentKey);
        toast(decision.rationale ? `${h} · ${decision.rationale}` : `Routed to ${h}`);
      }
    }

    // Multi-role auto plans wait for the user's approval before the team runs.
    if (recordAs === "auto" && plan.length > 1) {
      setPendingPlan({
        tasks: plan.map((p) => ({ role: p.role, task: p.task ?? "", done: p.done ?? "" })),
        text,
      });
      setBusy(false);
      return;
    }

    if (recordAs) {
      recordRouting(plan.map((p) => p.role), text, recordAs).catch(() => {});
    }
    await runTasks(plan, text);
  }

  async function runTasks(
    plan: { role: string; task?: string; done?: string }[],
    text: string,
    persistedIds?: string[],
  ) {
    setBusy(true);
    stoppedRef.current = false;
    setAgentKey(plan[plan.length - 1]?.role ?? agentKey);

    const markTask = (i: number, status: "doing" | "done") => {
      const id = persistedIds?.[i];
      if (!id) return;
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
      setTaskStatus(id, status).catch(() => {});
    };

    for (let i = 0; i < plan.length; i++) {
      markTask(i, "doing");
      await runAgent(plan[i].role, plan[i].task);
      if (stoppedRef.current) break;
      markTask(i, "done");
    }

    if (plan.length > 1 && !stoppedRef.current) {
      setSynthesizing(true);
      try {
        const { text: wrap } = await synthesize(
          projectId,
          text,
          plan
            .filter((p) => p.done)
            .map((p) => ({ role: p.role, done: p.done! })),
        );
        if (wrap) {
          const { id } = await saveCoordinatorMessage(projectId, wrap);
          setMessages((m) => [
            ...m,
            {
              id: id ?? `tmp-s-${Date.now()}`,
              role: "agent",
              agent_key: "coordinator",
              content: wrap,
              status: "complete",
            },
          ]);
        }
      } catch {}
      setSynthesizing(false);
    }

    setBusy(false);
  }

  async function approvePlan() {
    const p = pendingPlan;
    if (!p) return;
    setPendingPlan(null);
    recordRouting(p.tasks.map((t) => t.role), p.text, "auto").catch(() => {});
    // Approved plans become persistent backlog tasks for this project.
    let ids: string[] | undefined;
    try {
      const created = await addProjectTasks(projectId, p.tasks);
      if (created.length === p.tasks.length) {
        ids = created.map((t) => t.id);
        setTasks((t) => [...t, ...created]);
      }
    } catch {}
    await runTasks(p.tasks, p.text, ids);
  }

  function cancelPlan() {
    setPendingPlan(null);
  }

  async function saveRules() {
    const next = rulesDraft.trim();
    setRulesOpen(false);
    setRules(next);
    const { ok } = await setProjectRules(projectId, next);
    if (ok) toast.success(next ? "Team rules saved" : "Team rules cleared");
    else toast.error("Could not save the rules");
  }

  async function giveFeedback(m: Message, value: 1 | -1) {
    if (m.id.startsWith("tmp-")) return;
    const next = m.feedback === value ? 0 : value;
    setMessages((all) =>
      all.map((x) => (x.id === m.id ? { ...x, feedback: next || null } : x)),
    );
    await setMessageFeedback(m.id, next as -1 | 0 | 1);
  }

  function toggleWeb() {
    setWeb((w) => {
      webRef.current = !w;
      return !w;
    });
  }

  async function cycleTask(t: ProjectTask) {
    const order: ProjectTask["status"][] = ["todo", "doing", "done"];
    const next = order[(order.indexOf(t.status) + 1) % order.length];
    setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    await setTaskStatus(t.id, next);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    submit(text);
  }

  function exportChat() {
    const lines = [`# ${title}`, "", "> Exported from Onit AI", ""];
    for (const m of messages) {
      if (!m.content) continue;
      const who =
        m.role === "user"
          ? "You"
          : m.agent_key === "coordinator"
            ? "Onit"
            : (agentByKey[m.agent_key ?? ""]?.display_name ?? "Agent");
      lines.push(`## ${who}`, "", m.content, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "onit-chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported");
  }

  function stop() {
    stoppedRef.current = true;
    abortRef.current?.abort();
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function regenerate(message: Message) {
    if (busy || !message.agent_key) return;
    setBusy(true);
    stoppedRef.current = false;
    setMessages((m) => m.filter((x) => x.id !== message.id));
    if (!message.id.startsWith("tmp-")) {
      try {
        await deleteMessage(message.id);
      } catch {}
    }
    await runAgent(message.agent_key);
    setBusy(false);
  }

  function startEdit(message: Message) {
    setEditingId(message.id);
    setEditValue(message.content);
  }

  async function saveEdit(message: Message) {
    const text = editValue.trim();
    setEditingId(null);
    if (!text || busy) return;
    setMessages((m) => {
      const idx = m.findIndex((x) => x.id === message.id);
      return idx >= 0 ? m.slice(0, idx) : m;
    });
    if (!message.id.startsWith("tmp-")) {
      try {
        await truncateFromMessage(message.id);
      } catch {}
    }
    await submit(text);
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
      send();
    }
  }

  const lastMessage = messages[messages.length - 1];
  const showPlanActions =
    mode === "plan" && !busy && lastMessage?.role === "agent" && lastMessage.status === "complete";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/10 px-4">
        <h2 className="mr-auto truncate text-sm font-medium">{title}</h2>
        <button
          type="button"
          onClick={() => setTasksOpen(true)}
          title="Project backlog"
          aria-label="Project backlog"
          className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <ListChecks size={16} />
          {tasks.some((t) => t.status !== "done") ? (
            <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground">
              {tasks.filter((t) => t.status !== "done").length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => {
            setRulesDraft(rules);
            setRulesOpen(true);
          }}
          title="Team rules for this project"
          aria-label="Team rules"
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 hover:text-foreground ${
            rules ? "text-violet-500 dark:text-violet-300" : "text-muted-foreground"
          }`}
        >
          <Scroll size={16} weight={rules ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          onClick={exportChat}
          title="Export chat as Markdown"
          aria-label="Export chat"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <DownloadSimple size={16} />
        </button>
      </div>

      {rulesOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setRulesOpen(false)}
                aria-hidden
              />
              <div className="relative w-full max-w-lg rounded-2xl border border-border bg-popover p-5 shadow-2xl">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Team rules</h3>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setRulesOpen(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Every specialist in this project follows these rules. Examples:
                  &quot;Answer in English.&quot; &quot;Our stack is Next.js +
                  Supabase.&quot; &quot;Prefer free, open-source tools.&quot;
                </p>
                <textarea
                  value={rulesDraft}
                  onChange={(e) => setRulesDraft(e.target.value)}
                  rows={6}
                  autoFocus
                  placeholder="Write the rules your team should always follow…"
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRulesOpen(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveRules}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Save rules
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {tasksOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setTasksOpen(false)}
                aria-hidden
              />
              <div className="relative flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-popover p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Project backlog</h3>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setTasksOpen(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No tracked tasks yet. When you approve a multi-step plan, its
                    tasks land here and stay with the project.
                  </p>
                ) : (
                  <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1">
                    {tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => cycleTask(t)}
                        title="Click to change status"
                        className="flex w-full items-start gap-2.5 rounded-xl border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
                      >
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                            t.status === "done"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                              : t.status === "doing"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                                : "bg-white/10 text-muted-foreground"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-xs ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}
                          >
                            <span className="font-semibold">
                              {agentByKey[t.role_key]?.handle ?? t.role_key}
                            </span>{" "}
                            {t.task}
                          </span>
                          {t.done_criteria ? (
                            <span className="mt-0.5 block text-[11px] italic text-muted-foreground">
                              {t.done_criteria}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto" ref={scrollRef} onScroll={onScroll}>
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Describe what you need. Onit routes it to the right roles. Pin
                roles or @mention to choose yourself.
              </p>
            ) : null}
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                agent={m.agent_key ? agentByKey[m.agent_key] : undefined}
                collapseThinking={collapseThinking}
                onToggleThinking={toggleThinking}
                busy={busy}
                editing={editingId === m.id}
                editValue={editValue}
                onEditChange={setEditValue}
                onCopy={copyMessage}
                onRegenerate={regenerate}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onFeedback={giveFeedback}
              />
            ))}
            {routing ? (
              <div className="flex items-center gap-2 pl-0.5 text-xs text-muted-foreground">
                <Lightning size={13} weight="fill" className="animate-pulse text-amber-400" />
                Onit is routing your request…
              </div>
            ) : null}
            {synthesizing ? (
              <div className="flex items-center gap-2 pl-0.5 text-xs text-muted-foreground">
                <Lightning size={13} weight="fill" className="animate-pulse text-amber-400" />
                Onit is wrapping up the team&apos;s work…
              </div>
            ) : null}
            {pendingPlan && !busy ? (
              <div className="flex flex-wrap items-center gap-2 pl-0.5">
                <span className="text-xs text-muted-foreground">
                  Onit drafted a {pendingPlan.tasks.length}-step plan.
                </span>
                <button
                  type="button"
                  onClick={approvePlan}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play size={12} weight="fill" />
                  Run the plan
                </button>
                <button
                  type="button"
                  onClick={cancelPlan}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {showPlanActions ? (
              <div className="flex gap-2 pl-0.5">
                <button
                  type="button"
                  onClick={() => submit("Approved, please continue.", [lastMessage.agent_key!])}
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

        {!atBottom ? (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            className="glass absolute bottom-3 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-muted-foreground shadow-md transition-colors hover:text-foreground"
          >
            <ArrowDown size={16} />
          </button>
        ) : null}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="relative">
            {mention.open && filtered.length ? (
              <div className="glass-strong absolute bottom-full mb-2 w-64 overflow-hidden rounded-xl shadow-lg">
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
                    <span className="truncate text-xs text-muted-foreground">{a.display_name}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="glass-strong glass-edge rounded-2xl p-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={onChange}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Describe what you need. Onit routes it, or @mention a role…"
                className="max-h-48 min-h-[28px] w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <RoutingControl agents={agents} pinned={pinned} onChange={setPinned} />
                  <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
                    {(["build", "plan", "discuss"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => pickMode(m)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          mode === m
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {MODE_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={toggleWeb}
                    title={web ? "Web search on" : "Let agents search the web"}
                    aria-pressed={web}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                      web
                        ? "border-sky-400/40 text-sky-600 dark:text-sky-300"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Globe size={13} weight={web ? "fill" : "regular"} />
                    Web
                  </button>
                </div>
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90"
                  >
                    <Stop size={14} weight="fill" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={send}
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="send-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <PaperPlaneRight size={16} weight="fill" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MessageRow({
  message,
  agent,
  collapseThinking,
  onToggleThinking,
  busy,
  editing,
  editValue,
  onEditChange,
  onCopy,
  onRegenerate,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onFeedback,
}: {
  message: Message;
  agent?: Agent;
  collapseThinking: boolean;
  onToggleThinking: () => void;
  busy: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onCopy: (content: string) => void;
  onRegenerate: (m: Message) => void;
  onStartEdit: (m: Message) => void;
  onSaveEdit: (m: Message) => void;
  onCancelEdit: () => void;
  onFeedback: (m: Message, value: 1 | -1) => void;
}) {
  if (message.role === "user") {
    if (editing) {
      return (
        <div className="flex justify-end">
          <div className="w-full max-w-[85%]">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSaveEdit(message)}
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
              >
                Save &amp; resend
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm">
          {message.content}
        </div>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton title="Copy" onClick={() => onCopy(message.content)}>
            <Copy size={14} />
          </IconButton>
          <IconButton title="Edit" onClick={() => onStartEdit(message)}>
            <PencilSimple size={14} />
          </IconButton>
        </div>
      </div>
    );
  }

  const isCoordinator = message.agent_key === "coordinator";
  const color = isCoordinator
    ? "var(--foreground)"
    : agent
      ? `var(--agent-${agent.color})`
      : "var(--muted-foreground)";
  const name = isCoordinator ? "Onit" : agent?.display_name ?? "Agent";
  return (
    <div className="group flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color }}>
          {name}
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
            <CaretRight size={12} weight="bold" className={collapseThinking ? "" : "rotate-90"} />
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

      {message.status !== "streaming" && message.content ? (
        <div
          className={`flex gap-0.5 transition-opacity group-hover:opacity-100 ${
            message.feedback ? "opacity-100" : "opacity-0"
          }`}
        >
          <IconButton title="Copy" onClick={() => onCopy(message.content)}>
            <Copy size={14} />
          </IconButton>
          <IconButton title="Regenerate" onClick={() => onRegenerate(message)} disabled={busy}>
            <ArrowClockwise size={14} />
          </IconButton>
          {!isCoordinator ? (
            <>
              <IconButton title="Good answer" onClick={() => onFeedback(message, 1)}>
                <ThumbsUp
                  size={14}
                  weight={message.feedback === 1 ? "fill" : "regular"}
                  className={message.feedback === 1 ? "text-emerald-500" : ""}
                />
              </IconButton>
              <IconButton title="Bad answer" onClick={() => onFeedback(message, -1)}>
                <ThumbsDown
                  size={14}
                  weight={message.feedback === -1 ? "fill" : "regular"}
                  className={message.feedback === -1 ? "text-red-400" : ""}
                />
              </IconButton>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
