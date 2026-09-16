import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { llm, SUMMARY_MODEL, NO_THINKING } from "@/lib/ai/llm";

const RECENT_WINDOW = 20; // keep the last 20 messages as full text
const SUMMARIZE_BATCH = 20; // summarize the oldest 20 when triggered
const MAX_ROLLING = 4; // beyond this, collapse oldest rolling summaries into the project intro

/**
 * Background auto-summarization. Runs after each agent reply: when the number of
 * non-archived messages grows past (recent window + a batch), the oldest 20 are
 * summarized into a rolling snapshot and archived. Once rolling snapshots pile
 * up (project > ~100 messages) the oldest collapse into a one-line project intro.
 */
export async function maybeSummarizeProject(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  apiKey?: string,
): Promise<void> {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("archived", false);
  const nonArchived = count ?? 0;
  if (nonArchived <= RECENT_WINDOW + SUMMARIZE_BATCH) return;

  const { data: oldest } = await supabase
    .from("messages")
    .select("id, role, agent_key, content")
    .eq("project_id", projectId)
    .eq("archived", false)
    .order("created_at", { ascending: true })
    .limit(SUMMARIZE_BATCH);
  if (!oldest || oldest.length < SUMMARIZE_BATCH) return;

  const transcript = oldest
    .map(
      (m) =>
        `${m.role === "user" ? "User" : (m.agent_key ?? "Agent")}: ${m.content}`,
    )
    .join("\n");

  const { text: summary } = await generateText({
    model: llm(SUMMARY_MODEL, apiKey),
    providerOptions: NO_THINKING,
    system:
      "Summarize this conversation excerpt in 3-5 concise bullet points, emphasizing decisions made, conclusions reached, and open questions. Output only the bullets.",
    prompt: transcript,
  });

  await supabase.from("context_snapshots").insert({
    project_id: projectId,
    owner_id: ownerId,
    kind: "rolling",
    summary,
  });
  await supabase
    .from("messages")
    .update({ archived: true })
    .in(
      "id",
      oldest.map((m) => m.id),
    );

  // Collapse the oldest rolling summaries into a single project intro line.
  const { data: rollings } = await supabase
    .from("context_snapshots")
    .select("id, summary")
    .eq("project_id", projectId)
    .eq("kind", "rolling")
    .order("created_at", { ascending: true });

  if (rollings && rollings.length > MAX_ROLLING) {
    const toCollapse = rollings.slice(0, rollings.length - MAX_ROLLING);
    const { text: intro } = await generateText({
      model: llm(SUMMARY_MODEL, apiKey),
      providerOptions: NO_THINKING,
      system:
        "Compress these summaries into a SINGLE sentence capturing what this project is about and its key decisions so far.",
      prompt: toCollapse.map((r) => r.summary).join("\n"),
    });

    const { data: existing } = await supabase
      .from("context_snapshots")
      .select("id")
      .eq("project_id", projectId)
      .eq("kind", "project_intro")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("context_snapshots")
        .update({ summary: intro })
        .eq("id", existing.id);
    } else {
      await supabase.from("context_snapshots").insert({
        project_id: projectId,
        owner_id: ownerId,
        kind: "project_intro",
        summary: intro,
      });
    }

    await supabase
      .from("context_snapshots")
      .delete()
      .in(
        "id",
        toCollapse.map((r) => r.id),
      );
  }
}
