import { streamText } from "ai";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  llm,
  DEFAULT_MODEL,
  SUMMARY_MODEL,
  FALLBACK_MODEL,
} from "@/lib/ai/llm";
import { modelCost } from "@/lib/ai/model-prices";
import { buildSystemPrompt, languageRule } from "@/lib/ai/guardrails";
import { buildContext } from "@/lib/context";
import { maybeSummarizeProject } from "@/lib/summarize";
import {
  detectInjectionAttempt,
  sanitizeOutput,
  INJECTION_HARDENING,
} from "@/lib/security";

export const maxDuration = 60;

const LLM_TIMEOUT_MS = 30_000;
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

  let body: {
    projectId?: string;
    agentKey?: string;
    mode?: string;
    task?: string;
    skill?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const agentKey = body.agentKey?.trim();
  const requestedSkill =
    typeof body.skill === "string" ? body.skill.trim().toLowerCase() : "";
  const mode =
    body.mode === "plan"
      ? "plan"
      : body.mode === "discuss"
        ? "discuss"
        : "build";
  const task =
    typeof body.task === "string" ? body.task.slice(0, 600).trim() : "";
  if (!projectId || !agentKey) {
    return new Response("Missing required fields.", { status: 400 });
  }

  const admin = createAdminClient();

  // Run the core flow under the user's own session (RLS) so it works with the
  // keys present in any environment, no service-role dependency. A token-based
  // client keeps working inside the streaming callback (where the request's
  // cookie scope is gone). Falls back to the admin client if no token is found.
  const serverSb = await createUserClient();
  const { data: sess } = await serverSb.auth.getSession();
  const token = sess.session?.access_token;
  const db = token
    ? createSbClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      )
    : admin;

  // RLS scopes this to the user's own projects, so a returned row means it's theirs.
  const { data: project } = await db
    .from("projects")
    .select("id, rules")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return new Response("Chat not found.", { status: 404 });
  const teamRules = (project.rules ?? "").trim();

  const { data: agentRows } = await db
    .from("agent_configs")
    .select("key, display_name, system_prompt, model, ab_version_id");
  const agents = agentRows ?? [];
  const agent = agents.find((a) => a.key === agentKey);
  if (!agent) return new Response("Unknown agent.", { status: 400 });

  // Prompt A/B: when a B version is set for this agent, flip a coin per reply
  // and record which variant answered (feedback joins on messages.variant).
  let systemPrompt = agent.system_prompt as string;
  let agentModel = (agent.model as string | null) || DEFAULT_MODEL;
  let variant: "a" | "b" | null = null;
  if (agent.ab_version_id) {
    variant = Math.random() < 0.5 ? "a" : "b";
    if (variant === "b") {
      const { data: v } = await admin
        .from("agent_config_versions")
        .select("system_prompt, model")
        .eq("id", agent.ab_version_id)
        .maybeSingle();
      if (v) {
        systemPrompt = v.system_prompt;
        if (v.model) agentModel = v.model;
      } else {
        variant = null; // stale pointer: behave as no test
      }
    }
  }
  const agentNames: Record<string, string> = Object.fromEntries(
    agents.map((a) => [a.key, a.display_name]),
  );

  const { data: lastUser } = await db
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

  // Per-user response language preference (profiles.preferred_language).
  const { data: profileRow } = await db
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .maybeSingle();
  const langRule = languageRule(profileRow?.preferred_language);

  // Adopted decisions are standing constraints every role must respect.
  const { data: adopted } = await db
    .from("project_decisions")
    .select("title, constraints, scope_roles")
    .eq("project_id", projectId)
    .eq("status", "adopted")
    .order("created_at", { ascending: false })
    .limit(10);
  const decisionsBlock = (adopted ?? [])
    .filter(
      (d) =>
        !(d.scope_roles as string[] | null)?.length ||
        (d.scope_roles as string[]).includes(agentKey),
    )
    .map(
      (d) =>
        `- ${d.title}${(d.constraints ?? []).length ? `: ${(d.constraints as string[]).join("; ")}` : ""}`,
    )
    .join("\n");

  // Method library: the orchestrator picks a skill per task; direct @mentions
  // fall back to a cheap trigger-phrase match against the request text.
  let skillBlock = "";
  {
    const { data: skillRows } = await db
      .from("skills")
      .select("key, title, skill_type, triggers, role_keys, body")
      .eq("enabled", true)
      .order("sort_order");
    const skills = skillRows ?? [];
    let chosen = requestedSkill
      ? skills.find((s) => s.key === requestedSkill)
      : undefined;
    if (!chosen && !requestedSkill) {
      const text = `${task} ${lastUser?.content ?? ""}`.toLowerCase();
      let bestHits = 0;
      for (const s of skills) {
        const roleOk =
          !(s.role_keys as string[] | null)?.length ||
          (s.role_keys as string[]).includes(agentKey);
        if (!roleOk) continue;
        const hits = ((s.triggers as string[] | null) ?? []).filter((t) =>
          text.includes(t.toLowerCase()),
        ).length;
        if (hits > bestHits) {
          bestHits = hits;
          chosen = s;
        }
      }
    }
    if (chosen) {
      skillBlock = `\n\nApply this method from the team's library for the current assignment (adapt it to the request; skip it if the request turns out to be trivial):\n# ${chosen.title}\n${String(chosen.body).slice(0, 6000)}`;
    }
  }

  const ctx = await buildContext(db, projectId, agentKey, agentNames);

  const { data: placeholder, error: phErr } = await db
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      role: "agent",
      agent_key: agentKey,
      content: "",
      thinking: "",
      status: "streaming",
      variant,
    })
    .select("id")
    .single();
  if (phErr || !placeholder) {
    return new Response("Message could not be saved.", { status: 500 });
  }
  const assistantId = placeholder.id;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), LLM_TIMEOUT_MS);
  let aborted = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => {
        try {
          controller.enqueue(line(o));
        } catch {
          // client disconnected: keep generating, just stop enqueueing
        }
      };

      send({ type: "meta", messageId: assistantId, agentKey });

      let thinking = "";
      let answer = "";
      let status: "complete" | "error" = "complete";
      let inTok = 0;
      let outTok = 0;
      let thinkIn = 0;
      let thinkOut = 0;
      let usedModel = agentModel;

      try {
        // The team answers directly - thinking bubbles were removed (the user
        // doesn't want to see them), which also saves a model call per reply.
        const planNote =
          mode === "plan"
            ? 'End your reply with a brief "Shall I continue?" and state the next step.'
            : mode === "discuss"
              ? "Explore the trade-offs: give a clear recommendation, but surface 2–3 options with pros/cons and the key risks. If other roles have left notes, build on or respectfully challenge them."
              : "Provide the result directly.";
        const sysFull = `${buildSystemPrompt(systemPrompt)}${injection ? INJECTION_HARDENING : ""}${teamRules ? `\n\nProject team rules set by the user (follow them strictly):\n${teamRules.slice(0, 2000)}` : ""}${decisionsBlock ? `\n\nAdopted team decisions (standing constraints):\n${decisionsBlock}\nThese were settled by the team. Never silently contradict one. If the current request touches one, start by acknowledging the standing decision; if the user wants to change it, say explicitly that this would supersede the decision and what the switch would cost, then give your recommendation.` : ""}${skillBlock}${langRule}\n\nCurrent mode: ${mode}. ${planNote}${task ? `\n\nYour specific assignment in the team's plan: ${task}` : ""}`;

        async function runAnswer(model: string) {
          const s = streamText({
            model: llm(model),
            system: sysFull,
            messages: ctx,
            abortSignal: timeout.signal,
          });
          for await (const d of s.textStream) {
            answer += d;
            send({ type: "answer", delta: d });
          }
          try {
            const u = await s.usage;
            inTok += u?.inputTokens ?? 0;
            outTok += u?.outputTokens ?? 0;
          } catch {}
        }

        try {
          await runAnswer(agentModel);
        } catch (err) {
          // Failover: if the primary died before producing anything, retry
          // once on the fallback model so the user still gets an answer.
          if (!aborted && !answer && agentModel !== FALLBACK_MODEL) {
            usedModel = FALLBACK_MODEL;
            await runAnswer(FALLBACK_MODEL);
          } else {
            throw err;
          }
        }
      } catch {
        if (aborted) {
          status = "complete";
        } else {
          status = "error";
          if (!answer) {
            answer =
              "Sorry, I couldn't complete that response (the model timed out or failed). Please try again.";
            send({ type: "answer", delta: answer });
          }
        }
      } finally {
        clearTimeout(timer);
        const safe = sanitizeOutput(answer);
        if (safe !== answer) answer = safe;
        send({ type: "final", content: answer });
        try {
          await db
            .from("messages")
            .update({ content: answer, thinking, status, token_count: outTok })
            .eq("id", assistantId);
        } catch {
          // best-effort persistence
        }
        if (status === "complete") {
          try {
            const totalIn = inTok + thinkIn;
            const totalOut = outTok + thinkOut;
            await admin.from("usage_logs").insert({
              user_id: user.id,
              project_id: projectId,
              message_id: assistantId,
              kind: "chat",
              model: usedModel,
              agent_key: agentKey,
              prompt_tokens: totalIn,
              completion_tokens: totalOut,
              total_tokens: totalIn + totalOut,
              cost:
                modelCost(usedModel, inTok, outTok) +
                modelCost(SUMMARY_MODEL, thinkIn, thinkOut),
            });
          } catch {
            // usage logging is best-effort
          }
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
