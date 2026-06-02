import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { enforceTokenBudget } from "@/lib/tokens";

export const RECENT_WINDOW = 20;
export const MAX_CONTEXT_TOKENS = 100_000;

/**
 * Faz 4 tiered context for an agent:
 *  - 100+ messages  -> single one-line project intro (context_snapshots/project_intro)
 *  - 20-100         -> rolling summaries (context_snapshots/rolling)
 *  - last 20        -> full text (non-archived messages)
 *  - other agents   -> labelled inline as "Agent Notes"
 * Finally trimmed to MAX_CONTEXT_TOKENS.
 */
export async function buildContext(
  supabase: SupabaseClient,
  projectId: string,
  currentAgentKey: string,
  agentNames: Record<string, string>,
): Promise<ModelMessage[]> {
  const [introRes, rollingRes, recentRes] = await Promise.all([
    supabase
      .from("context_snapshots")
      .select("summary")
      .eq("project_id", projectId)
      .eq("kind", "project_intro")
      .maybeSingle(),
    supabase
      .from("context_snapshots")
      .select("summary, created_at")
      .eq("project_id", projectId)
      .eq("kind", "rolling")
      .order("created_at", { ascending: true }),
    supabase
      .from("messages")
      .select("role, agent_key, content")
      .eq("project_id", projectId)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(RECENT_WINDOW),
  ]);

  const out: ModelMessage[] = [];

  const summaryParts: string[] = [];
  if (introRes.data?.summary) {
    summaryParts.push(`PROJECT SUMMARY: ${introRes.data.summary}`);
  }
  if (rollingRes.data?.length) {
    summaryParts.push(
      "EARLIER DISCUSSION (summarized):\n" +
        rollingRes.data.map((r) => `- ${r.summary}`).join("\n"),
    );
  }
  if (summaryParts.length) {
    out.push({ role: "system", content: summaryParts.join("\n\n") });
  }

  const recent = (recentRes.data ?? [])
    .filter((m) => (m.content ?? "").trim() !== "")
    .reverse();

  for (const m of recent) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "system") {
      out.push({ role: "system", content: m.content });
    } else if (m.agent_key === currentAgentKey) {
      out.push({ role: "assistant", content: m.content });
    } else {
      const name = (m.agent_key && agentNames[m.agent_key]) || "Another agent";
      out.push({ role: "user", content: `[${name} noted]: ${m.content}` });
    }
  }

  return enforceTokenBudget(out, MAX_CONTEXT_TOKENS);
}
