import { streamText } from "ai";
import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { openrouter, DEFAULT_MODEL, SUMMARY_MODEL } from "@/lib/ai/openrouter";
import { buildSystemPrompt } from "@/lib/ai/guardrails";
import { buildContext } from "@/lib/context";
import { maybeSummarizeProject } from "@/lib/summarize";
import {
  detectInjectionAttempt,
  sanitizeOutput,
  INJECTION_HARDENING,
} from "@/lib/security";

export const maxDuration = 60;

const OPENROUTER_TIMEOUT_MS = 30_000;
const encoder = new TextEncoder();
const line = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

/**
 * Generates ONE agent's reply (thinking, then answer) for the current project
 * state. The user's message is inserted separately (sendUserMessage) so a single
 * user turn can fan out to multiple agents. Streams NDJSON events:
 *   {type:"meta", messageId}  {type:"thinking", delta}  {type:"answer", delta}  {type:"done", status}
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: { projectId?: string; agentKey?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const agentKey = body.agentKey?.trim();
  const mode =
    body.mode === "plan"
      ? "plan"
      : body.mode === "discuss"
        ? "discuss"
        : "build";
  if (!projectId || !agentKey) {
    return new Response("Missing required fields.", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    // TEMP diagnostic: distinguish a broken service key from a missing project.
    const { count, error: probeErr } = await admin
      .from("agent_configs")
      .select("key", { count: "exact", head: true });
    const diag = probeErr
      ? `admin-read-failed: ${probeErr.message}`
      : `project-missing (admin read ${count ?? "?"} agents)${projErr ? `; ${projErr.message}` : ""}`;
    return new Response(`Chat not found. [${diag}]`, { status: 404 });
  }
  if (project.owner_id !== user.id) {
    return new Response(
      `Chat not found. [owner ${String(project.owner_id).slice(0, 8)} != you ${user.id.slice(0, 8)}]`,
      { status: 404 },
    );
  }

  const { data: agentRows } = await admin
    .from("agent_configs")
    .select("key, display_name, system_prompt");
  const agents = agentRows ?? [];
  const agent = agents.find((a) => a.key === agentKey);
  if (!agent) return new Response("Unknown agent.", { status: 400 });
  const agentNames: Record<string, string> = Object.fromEntries(
    agents.map((a) => [a.key, a.display_name]),
  );

  const { data: lastUser } = await admin
    .from("messages")
    .select("content")
    .eq("project_id", projectId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const injection = lastUser?.content
    ? detectInjectionAttempt(lastUser.content)
    : false;

  const ctx = await buildContext(admin, projectId, agentKey, agentNames);

  const { data: placeholder, error: phErr } = await admin
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      role: "agent",
      agent_key: agentKey,
      content: "",
      thinking: "",
      status: "streaming",
    })
    .select("id")
    .single();
  if (phErr || !placeholder) {
    return new Response("Message could not be saved.", { status: 500 });
  }
  const assistantId = placeholder.id;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), OPENROUTER_TIMEOUT_MS);
  let aborted = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => {
        try {
          controller.enqueue(line(o));
        } catch {
          // client disconnected — keep generating, just stop enqueueing
        }
      };

      send({ type: "meta", messageId: assistantId, agentKey });

      let thinking = "";
      let answer = "";
      let status: "complete" | "error" = "complete";
      let inTok = 0;
      let outTok = 0;

      try {
        // 1) Thinking bubble (cheaper model), completes before the main answer.
        const think = streamText({
          model: openrouter(SUMMARY_MODEL),
          system: `You are ${agent.display_name}. In AT MOST two short first-person sentences, note what you reviewed (including any notes from other agents) and how you will respond. Do NOT answer the question, and do NOT use lists or headings.`,
          messages: ctx,
          maxOutputTokens: 120,
          abortSignal: timeout.signal,
        });
        for await (const d of think.textStream) {
          thinking += d;
          send({ type: "thinking", delta: d });
        }
        try {
          const u = await think.usage;
          inTok += u?.inputTokens ?? 0;
          outTok += u?.outputTokens ?? 0;
        } catch {}

        // 2) Main answer.
        const planNote =
          mode === "plan"
            ? 'End your reply with a brief "Shall I continue?" and state the next step.'
            : mode === "discuss"
              ? "Explore the trade-offs: give a clear recommendation, but surface 2–3 options with pros/cons and the key risks. If other roles have left notes, build on or respectfully challenge them."
              : "Provide the result directly.";
        const answerStream = streamText({
          model: openrouter(DEFAULT_MODEL),
          system: `${buildSystemPrompt(agent.system_prompt)}${injection ? INJECTION_HARDENING : ""}\n\nCurrent mode: ${mode}. ${planNote}`,
          messages: ctx,
          abortSignal: timeout.signal,
        });
        for await (const d of answerStream.textStream) {
          answer += d;
          send({ type: "answer", delta: d });
        }
        try {
          const u = await answerStream.usage;
          inTok += u?.inputTokens ?? 0;
          outTok += u?.outputTokens ?? 0;
        } catch {}
      } catch {
        if (aborted) {
          status = "complete";
        } else {
          status = "error";
          if (!answer) {
            answer =
              "Sorry — I couldn't complete that response (the model timed out or failed). Please try again.";
            send({ type: "answer", delta: answer });
          }
        }
      } finally {
        clearTimeout(timer);
        const safe = sanitizeOutput(answer);
        if (safe !== answer) answer = safe;
        send({ type: "final", content: answer });
        await admin
          .from("messages")
          .update({ content: answer, thinking, status, token_count: outTok })
          .eq("id", assistantId);
        if (status === "complete") {
          await admin.from("usage_logs").insert({
            user_id: user.id,
            project_id: projectId,
            message_id: assistantId,
            kind: "chat",
            model: DEFAULT_MODEL,
            agent_key: agentKey,
            prompt_tokens: inTok,
            completion_tokens: outTok,
            total_tokens: inTok + outTok,
            cost: 0,
          });
          try {
            await maybeSummarizeProject(admin, projectId, user.id);
          } catch {
            // auto-summarization is best-effort
          }
        }
        send({ type: "done", status });
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      aborted = true;
      clearTimeout(timer);
      timeout.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
