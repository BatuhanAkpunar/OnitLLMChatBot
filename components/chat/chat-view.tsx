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
  Play,
  DownloadSimple,
  ListChecks,
  Scroll,
  Gavel,
  Check,
  Plus,
  ListNumbers,
  ThumbsUp,
  ThumbsDown,
  Globe,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Markdown } from "./markdown";
import { RoutingControl } from "./routing-control";
import { RoleAvatar } from "./role-visual";
import { STARTERS } from "./starters";
import { OrbMark } from "@/components/brand/orb";
import { TopBar } from "@/components/nav/top-bar";
import type { ProjectListItem } from "@/components/nav/history-button";
import type { CurrentUser } from "@/lib/auth/user";
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
  captureDecisions,
  setDecisionStatus,
  type ProjectTask,
  type ProjectDecision,
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
  initialDecisions = [],
  lang = "en",
  user = null,
  projects = [],
}: {
  projectId: string;
  title: string;
  agents: Agent[];
  initialMessages: Message[];
  defaultAgentKey: string;
  initialMode: Mode;
  initialRules?: string;
  initialTasks?: ProjectTask[];
  initialDecisions?: ProjectDecision[];
  lang?: "en" | "tr";
  user?: CurrentUser | null;
  projects?: ProjectListItem[];
}) {
  // A persisted "streaming" status means the stream died mid-flight (tab
  // closed, function killed): there is no live stream to attach to, so treat
  // those as settled instead of showing an eternal "thinking…" label.
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map((m) =>
      m.status === "streaming" ? { ...m, status: "complete" } : m,
    ),
  );
  const [agentKey, setAgentKey] = useState(defaultAgentKey);
  const [pinned, setPinned] = useState<string[]>([]);
  const [routing, setRouting] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{
    tasks: { role: string; task: string; done: string; skill: string }[];
    text: string;
  } | null>(null);
  // Step-by-step runs pause here between tasks so the user stays in control.
  const [pendingNext, setPendingNext] = useState<{
    tasks: { role: string; task?: string; done?: string; skill?: string }[];
    text: string;
    ids?: string[];
    index: number;
  } | null>(null);
  const [rules, setRules] = useState(initialRules);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(initialRules);
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [decisions, setDecisions] = useState<ProjectDecision[]>(initialDecisions);
  const [decisionsOpen, setDecisionsOpen] = useState(false);
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

  async function runAgent(key: string, task?: string, skill?: string) {
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
          skill: skill || undefined,
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
            // Capture the CURRENT id in a const: the updater runs later, after
            // `aid` has already been reassigned, so matching on `aid` directly
            // would never hit the row (and the bubble would stay "thinking…").
            const real = evt.messageId;
            const tmp = aid;
            setMessages((m) => m.map((x) => (x.id === tmp ? { ...x, id: real } : x)));
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
      // If the stream ended without a "done" event (proxy cut, failover edge
      // case), never leave the row stuck in the streaming state.
      setMessages((m) =>
        m.map((x) =>
          x.id === aid && x.status === "streaming" ? { ...x, status: "complete" } : x,
        ),
      );
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
    let plan: { role: string; task?: string; done?: string; skill?: string }[];
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
            tasks: { role: string; task: string; done: string; skill: string }[];
          };
      try {
        decision = await orchestrate(projectId, text);
      } catch {
        decision = {
          action: "work",
          rationale: "",
          tasks: [{ role: agentKey, task: text, done: "", skill: "" }],
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
        ? decision.tasks.map((t) => ({
            role: t.role,
            task: t.task,
            done: t.done,
            skill: t.skill,
          }))
        : [{ role: agentKey }];
      recordAs = "auto";

      if (plan.length > 1) {
        const planText =
          (lang === "tr" ? "İşte plan:\n" : "Here's the plan:\n") +
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
        tasks: plan.map((p) => ({
          role: p.role,
          task: p.task ?? "",
          done: p.done ?? "",
          skill: p.skill ?? "",
        })),
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

  /** Marks a persisted backlog task as doing/done (both UI and DB). */
  function markBacklogTask(
    persistedIds: string[] | undefined,
    i: number,
    status: "doing" | "done",
  ) {
    const id = persistedIds?.[i];
    if (!id) return;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    setTaskStatus(id, status).catch(() => {});
  }

  /** Closes a team run: Onit synthesizes the work and proposes decisions. */
  async function wrapUp(
    plan: { role: string; done?: string }[],
    text: string,
  ) {
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

    // Decision memory: Onit proposes anything the team just settled; the
    // user adopts or dismisses it from the Decisions panel.
    try {
      const proposed = await captureDecisions(projectId, text);
      if (proposed.length) {
        setDecisions((d) => [...proposed, ...d]);
        toast(
          proposed.length === 1
            ? "Onit captured a decision for your review"
            : `Onit captured ${proposed.length} decisions for your review`,
          {
            action: {
              label: "Review",
              onClick: () => setDecisionsOpen(true),
            },
          },
        );
      }
    } catch {}
  }

  async function runTasks(
    plan: { role: string; task?: string; done?: string; skill?: string }[],
    text: string,
    persistedIds?: string[],
    stepwise = false,
  ) {
    setBusy(true);
    stoppedRef.current = false;
    setAgentKey(plan[plan.length - 1]?.role ?? agentKey);

    if (stepwise && plan.length > 1) {
      await runStep(plan, text, persistedIds, 0);
      return;
    }

    for (let i = 0; i < plan.length; i++) {
      markBacklogTask(persistedIds, i, "doing");
      await runAgent(plan[i].role, plan[i].task, plan[i].skill);
      if (stoppedRef.current) break;
      markBacklogTask(persistedIds, i, "done");
    }

    if (plan.length > 1 && !stoppedRef.current) {
      await wrapUp(plan, text);
    }

    setBusy(false);
  }

  /** Step-by-step run: one task, then pause for the user's go-ahead. */
  async function runStep(
    plan: { role: string; task?: string; done?: string; skill?: string }[],
    text: string,
    ids: string[] | undefined,
    i: number,
  ) {
    setBusy(true);
    setPendingNext(null);
    markBacklogTask(ids, i, "doing");
    await runAgent(plan[i].role, plan[i].task, plan[i].skill);
    if (!stoppedRef.current) markBacklogTask(ids, i, "done");

    const next = i + 1;
    if (stoppedRef.current || next >= plan.length) {
      if (next >= plan.length && plan.length > 1 && !stoppedRef.current) {
        await wrapUp(plan, text);
      }
      setBusy(false);
      return;
    }
    setPendingNext({ tasks: plan, text, ids, index: next });
    setBusy(false);
  }

  /** "Finish here" on a paused step-by-step run: wrap up what's done. */
  async function finishStepRun() {
    const p = pendingNext;
    if (!p) return;
    setPendingNext(null);
    if (p.index > 1) {
      setBusy(true);
      await wrapUp(p.tasks.slice(0, p.index), p.text);
      setBusy(false);
    }
  }

  async function approvePlan(stepwise = false) {
    const p = pendingPlan;
    if (!p) return;
    // The user may have edited the plan: drop rows left without a task.
    const tasks = p.tasks
      .map((t) => ({ ...t, task: t.task.trim(), done: t.done.trim() }))
      .filter((t) => t.task && agentByKey[t.role]);
    if (!tasks.length) {
      setPendingPlan(null);
      return;
    }
    setPendingPlan(null);
    recordRouting(tasks.map((t) => t.role), p.text, "auto").catch(() => {});
    // Approved plans become persistent backlog tasks for this project.
    let ids: string[] | undefined;
    try {
      const created = await addProjectTasks(projectId, tasks);
      if (created.length === tasks.length) {
        ids = created.map((t) => t.id);
        setTasks((t) => [...t, ...created]);
      }
    } catch {}
    await runTasks(tasks, p.text, ids, stepwise);
  }

  function cancelPlan() {
    setPendingPlan(null);
  }

  function updatePlanTask(
    i: number,
    patch: Partial<{ role: string; task: string; done: string }>,
  ) {
    setPendingPlan((p) =>
      p
        ? {
            ...p,
            tasks: p.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)),
          }
        : p,
    );
  }

  function removePlanTask(i: number) {
    setPendingPlan((p) =>
      p ? { ...p, tasks: p.tasks.filter((_, j) => j !== i) } : p,
    );
  }

  function addPlanTask() {
    setPendingPlan((p) =>
      p
        ? {
            ...p,
            tasks: [
              ...p.tasks,
              { role: agents[0]?.key ?? "", task: "", done: "", skill: "" },
            ],
          }
        : p,
    );
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

  async function decideStatus(
    d: ProjectDecision,
    status: ProjectDecision["status"],
  ) {
    setDecisions((list) =>
      list
        .map((x) => (x.id === d.id ? { ...x, status } : x))
        .filter((x) => x.status !== "dismissed"),
    );
    const { ok } = await setDecisionStatus(d.id, status);
    if (!ok) toast.error("Could not update the decision.");
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

  const chatTools = (
    <>
      <button
        type="button"
        onClick={() => setTasksOpen(true)}
        title="Project backlog"
        className="relative inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ListChecks size={18} />
        <span className="hidden lg:inline">Backlog</span>
        {tasks.some((t) => t.status !== "done") ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {tasks.filter((t) => t.status !== "done").length}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => setDecisionsOpen(true)}
        title="Team decisions for this project"
        className={`relative inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium transition-colors hover:bg-accent hover:text-foreground ${
          decisions.some((d) => d.status === "adopted")
            ? "text-violet-600 dark:text-violet-300"
            : "text-muted-foreground"
        }`}
      >
        <Gavel size={18} />
        <span className="hidden lg:inline">Decisions</span>
        {decisions.some((d) => d.status === "proposed") ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {decisions.filter((d) => d.status === "proposed").length}
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
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium transition-colors hover:bg-accent hover:text-foreground ${
          rules ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"
        }`}
      >
        <Scroll size={18} weight={rules ? "fill" : "regular"} />
        <span className="hidden lg:inline">Rules</span>
      </button>
      <button
        type="button"
        onClick={exportChat}
        title="Export chat as Markdown"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <DownloadSimple size={18} />
        <span className="hidden lg:inline">Export</span>
      </button>
      <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
    </>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="onit-chat-glow" aria-hidden />
      <TopBar user={user} projects={projects} title={title} tools={chatTools} />

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

      {decisionsOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setDecisionsOpen(false)}
                aria-hidden
              />
              <div className="relative flex max-h-[75vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-popover p-5 shadow-2xl">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Team decisions</h3>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setDecisionsOpen(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Adopted decisions become standing constraints: every
                  specialist respects them in future answers. Onit proposes new
                  ones after team runs; you adopt or dismiss.
                </p>
                {decisions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No decisions yet. When the team settles something worth
                    remembering, it lands here for your review.
                  </p>
                ) : (
                  <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
                    {decisions.map((d) => (
                      <div
                        key={d.id}
                        className={`rounded-xl border px-3.5 py-3 ${
                          d.status === "adopted"
                            ? "border-violet-500/25 bg-violet-500/[0.04]"
                            : d.status === "proposed"
                              ? "border-amber-500/30 bg-amber-500/[0.04]"
                              : "border-border opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold leading-snug">
                            {d.title}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                              d.status === "adopted"
                                ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                                : d.status === "proposed"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                                  : "bg-white/10 text-muted-foreground"
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        {d.because.length ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Why:</span>{" "}
                            {d.because.join(" · ")}
                          </p>
                        ) : null}
                        {d.despite.length ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Trade-off accepted:
                            </span>{" "}
                            {d.despite.join(" · ")}
                          </p>
                        ) : null}
                        {d.constraints.length ? (
                          <ul className="mt-1.5 space-y-0.5">
                            {d.constraints.map((c, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs"
                              >
                                <Check
                                  size={12}
                                  weight="bold"
                                  className="mt-0.5 shrink-0 text-violet-500"
                                />
                                {c}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-2.5 flex gap-2">
                          {d.status === "proposed" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => decideStatus(d, "adopted")}
                                className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                              >
                                Adopt
                              </button>
                              <button
                                type="button"
                                onClick={() => decideStatus(d, "dismissed")}
                                className="rounded-lg border border-border px-2.5 py-1 text-[11px] transition-colors hover:bg-accent"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : d.status === "adopted" ? (
                            <button
                              type="button"
                              onClick={() => decideStatus(d, "superseded")}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              Mark superseded
                            </button>
                          ) : null}
                        </div>
                      </div>
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
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex -space-x-2.5">
                  {agents.slice(0, 6).map((a) => (
                    <span
                      key={a.key}
                      className="rounded-full ring-[2.5px] ring-background"
                    >
                      <RoleAvatar
                        roleKey={a.key}
                        color={a.color}
                        size={40}
                        rounded="rounded-full"
                      />
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-[15px] font-semibold">Your team is ready.</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Describe what you need and Onit hands it to the right
                    specialists, or @mention a role to pick yourself.
                  </p>
                </div>
                <div className="flex max-w-md flex-wrap justify-center gap-1.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setInput(s.prompt);
                        taRef.current?.focus();
                      }}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-[13px] text-foreground/80 transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.06] hover:text-foreground"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
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
                canPickOption={
                  m.id === lastMessage?.id &&
                  m.role === "agent" &&
                  m.status === "complete" &&
                  !busy
                }
                onPickOption={(opt) =>
                  submit(
                    opt,
                    m.agent_key && m.agent_key !== "coordinator"
                      ? [m.agent_key]
                      : undefined,
                  )
                }
              />
            ))}
            {routing ? (
              <OnitWorking label="Onit is picking the right specialists" />
            ) : null}
            {synthesizing ? (
              <OnitWorking label="Onit is wrapping up the team's work" />
            ) : null}
            {pendingPlan && !busy ? (
              <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-500/[0.04]">
                <div className="flex items-baseline gap-2.5 px-4 pt-3.5">
                  <OrbMark size={20} />
                  <span className="text-sm font-semibold">
                    Onit drafted a {pendingPlan.tasks.length}-step plan
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Edit anything before the team runs.
                  </span>
                </div>
                <ul className="space-y-2 px-4 py-3.5">
                  {pendingPlan.tasks.map((t, i) => {
                    const a = agentByKey[t.role];
                    return (
                      <li
                        key={i}
                        className="group/task rounded-xl border border-violet-500/15 bg-background/50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          {a ? (
                            <RoleAvatar
                              roleKey={a.key}
                              color={a.color}
                              size={26}
                              rounded="rounded-lg"
                            />
                          ) : (
                            <span className="h-[26px] w-[26px] rounded-lg bg-muted" />
                          )}
                          <select
                            value={t.role}
                            onChange={(e) =>
                              updatePlanTask(i, { role: e.target.value })
                            }
                            aria-label="Assigned role"
                            className="cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent py-0.5 pl-1 pr-5 text-[13px] font-semibold outline-none transition-colors hover:border-border focus:border-border"
                            style={
                              a ? { color: `var(--agent-${a.color})` } : undefined
                            }
                          >
                            {agents.map((ag) => (
                              <option key={ag.key} value={ag.key}>
                                {ag.handle}
                              </option>
                            ))}
                          </select>
                          {pendingPlan.tasks.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePlanTask(i)}
                              aria-label="Remove step"
                              title="Remove step"
                              className="ml-auto rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/task:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                        </div>
                        <textarea
                          value={t.task}
                          onChange={(e) =>
                            updatePlanTask(i, { task: e.target.value })
                          }
                          rows={2}
                          placeholder="What should this role do?"
                          className="mt-1.5 w-full resize-none rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm leading-snug outline-none transition-colors focus:border-border"
                        />
                        <input
                          value={t.done}
                          onChange={(e) =>
                            updatePlanTask(i, { done: e.target.value })
                          }
                          placeholder="Done when ... (optional)"
                          className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-xs italic text-muted-foreground outline-none transition-colors focus:border-border"
                        />
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      onClick={addPlanTask}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Plus size={13} weight="bold" />
                      Add a step
                    </button>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 border-t border-violet-500/15 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => approvePlan(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Play size={12} weight="fill" />
                    Run the plan
                  </button>
                  {pendingPlan.tasks.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => approvePlan(true)}
                      title="Run one step at a time; you approve each next step"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <ListNumbers size={13} weight="bold" />
                      Run step by step
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={cancelPlan}
                    className="rounded-lg border border-border px-3.5 py-2 text-xs transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {pendingNext && !busy ? (
              <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-500/[0.04]">
                <div className="flex items-center gap-2.5 px-4 pt-3.5">
                  <OrbMark size={20} />
                  <span className="text-sm font-semibold">
                    Step {pendingNext.index} of {pendingNext.tasks.length} done
                  </span>
                </div>
                <div className="flex items-start gap-3 px-4 py-3.5">
                  {(() => {
                    const t = pendingNext.tasks[pendingNext.index];
                    const a = agentByKey[t.role];
                    return (
                      <>
                        {a ? (
                          <RoleAvatar
                            roleKey={a.key}
                            color={a.color}
                            size={28}
                            rounded="rounded-lg"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 text-sm leading-snug">
                          <span className="text-xs text-muted-foreground">
                            Next up
                          </span>
                          <span className="block">
                            <span
                              className="font-semibold"
                              style={
                                a
                                  ? { color: `var(--agent-${a.color})` }
                                  : undefined
                              }
                            >
                              {a?.handle ?? t.role}
                            </span>{" "}
                            {t.task}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex gap-2 border-t border-violet-500/15 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      runStep(
                        pendingNext.tasks,
                        pendingNext.text,
                        pendingNext.ids,
                        pendingNext.index,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Play size={12} weight="fill" />
                    Run next step
                  </button>
                  <button
                    type="button"
                    onClick={finishStepRun}
                    className="rounded-lg border border-border px-3.5 py-2 text-xs transition-colors hover:bg-accent"
                  >
                    Finish here
                  </button>
                </div>
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

      {/* Composer: floats free of the thread, like the landing hero */}
      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto max-w-3xl">
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

            <div className="glass-strong glass-edge rounded-2xl p-2 shadow-2xl">
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

/** Onit (the coordinator) shown as busy: orb avatar + label + typing dots. */
function OnitWorking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center">
        <OrbMark size={24} />
      </span>
      <span className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground">
        {label}
        <span className="typing-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </span>
    </div>
  );
}

/**
 * Interactive skills end a question with a fenced ```options block; the UI
 * turns it into clickable quick-select chips (latest message only).
 */
function splitOptions(content: string): { body: string; options: string[] } {
  const m = content.match(/```options\s*\n([\s\S]*?)\n?```\s*$/);
  if (!m || m.index === undefined) return { body: content, options: [] };
  const options = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!options.length) return { body: content, options: [] };
  return { body: content.slice(0, m.index).trimEnd(), options };
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
  canPickOption,
  onPickOption,
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
  canPickOption: boolean;
  onPickOption: (option: string) => void;
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
        <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-primary px-4.5 py-2.5 text-sm text-primary-foreground">
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
    ? "var(--agent-indigo)"
    : agent
      ? `var(--agent-${agent.color})`
      : "var(--muted-foreground)";
  const name = isCoordinator ? "Onit" : (agent?.display_name ?? "Agent");
  const waiting =
    message.status === "streaming" && !message.content && !message.thinking;

  return (
    <div className="group flex gap-3">
      {/* The pixel-art teammate answering; Onit itself appears as the orb. */}
      <span className="mt-1 shrink-0">
        {isCoordinator ? (
          <span className="grid h-[34px] w-[34px] place-items-center">
            <OrbMark size={24} />
          </span>
        ) : agent ? (
          <RoleAvatar
            roleKey={agent.key}
            color={agent.color}
            size={34}
            rounded="rounded-xl"
          />
        ) : (
          <span className="h-[34px] w-[34px] rounded-xl bg-muted" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold" style={{ color }}>
            {name}
          </span>
          {!isCoordinator && agent?.handle ? (
            <span className="text-[11px] text-muted-foreground">{agent.handle}</span>
          ) : null}
          {message.status === "error" ? (
            <span className="text-[11px] font-medium text-destructive">
              couldn&apos;t finish
            </span>
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
              <div className="mt-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
                {message.thinking}
              </div>
            ) : null}
          </div>
        ) : null}

        {waiting ? (
          <span className="inline-flex w-fit items-center rounded-2xl rounded-tl-md border border-border/70 bg-card px-4 py-3.5 text-muted-foreground">
            <span className="typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </span>
        ) : null}

        {message.content
          ? (() => {
              const { body, options } = splitOptions(message.content);
              return (
                <>
                  {body ? (
                    <div
                      className={`w-fit max-w-full rounded-2xl rounded-tl-md border px-4 py-3 text-sm ${
                        isCoordinator
                          ? "border-violet-500/20 bg-violet-500/[0.04]"
                          : "border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      }`}
                    >
                      <Markdown>{body}</Markdown>
                    </div>
                  ) : null}
                  {options.length && message.status === "complete" ? (
                    canPickOption ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onPickOption(opt)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-left text-[13px] leading-snug transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
                          >
                            <span
                              className="font-mono text-[11px] font-bold"
                              style={{ color }}
                            >
                              {i + 1}
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ol className="mt-1 space-y-0.5 pl-0.5 text-xs text-muted-foreground">
                        {options.map((opt, i) => (
                          <li key={i}>
                            {i + 1}. {opt}
                          </li>
                        ))}
                      </ol>
                    )
                  ) : null}
                </>
              );
            })()
          : null}

        {message.status !== "streaming" && message.content ? (
          <div
            className={`flex gap-0.5 transition-opacity group-hover:opacity-100 ${
              message.feedback ? "opacity-100" : "opacity-0"
            }`}
          >
            <IconButton title="Copy" onClick={() => onCopy(message.content)}>
              <Copy size={14} />
            </IconButton>
            <IconButton
              title="Regenerate"
              onClick={() => onRegenerate(message)}
              disabled={busy}
            >
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
    </div>
  );
}
