"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/user";
import { generateText } from "ai";
import { openrouter, SUMMARY_MODEL } from "@/lib/ai/openrouter";

/**
 * Orchestrator router: analyzes a request and returns the role key(s) best
 * suited to handle it (most relevant first). Falls back to the first role.
 */
export async function routeToAgents(text: string): Promise<{ keys: string[] }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_configs")
    .select("key, display_name, description")
    .eq("enabled", true)
    .order("sort_order");
  const list = data ?? [];
  const fallback = list[0] ? [list[0].key] : [];
  if (!list.length || !text.trim()) return { keys: fallback };

  const roster = list
    .map((a) => `${a.key}: ${a.display_name} — ${a.description ?? ""}`)
    .join("\n");
  try {
    const { text: out } = await generateText({
      model: openrouter(SUMMARY_MODEL),
      system:
        "You route a software-team request to the right role(s). Pick the 1-3 most relevant roles for the request. Reply with ONLY their keys, comma-separated, most relevant first - no other text.",
      prompt: `Roles:\n${roster}\n\nRequest: ${text}\n\nKeys:`,
      maxOutputTokens: 24,
    });
    const valid = new Set(list.map((a) => a.key));
    const keys = [
      ...new Set(
        out
          .toLowerCase()
          .split(/[^a-z0-9_]+/)
          .map((s) => s.trim())
          .filter((k) => valid.has(k)),
      ),
    ].slice(0, 3);
    return { keys: keys.length ? keys : fallback };
  } catch {
    return { keys: fallback };
  }
}

export type OrchestrateResult =
  | { action: "clarify"; question: string }
  | { action: "route"; roles: string[]; rationale: string };

/**
 * Smart orchestrator: reads the request (with recent context) and either asks
 * one clarifying question (if it's too vague to act on well) or routes to the
 * best role(s) with a short rationale.
 */
export async function orchestrate(
  projectId: string,
  text: string,
): Promise<OrchestrateResult> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_configs")
    .select("key, display_name, description")
    .eq("enabled", true)
    .order("sort_order");
  const list = data ?? [];
  const fallback: OrchestrateResult = {
    action: "route",
    roles: list[0] ? [list[0].key] : [],
    rationale: "",
  };
  if (!list.length || !text.trim()) return fallback;

  const { data: recent } = await admin
    .from("messages")
    .select("role, agent_key, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(6);
  const ctx = (recent ?? [])
    .reverse()
    .map(
      (m) =>
        `${m.role === "user" ? "User" : m.agent_key ?? "agent"}: ${(m.content || "").slice(0, 240)}`,
    )
    .join("\n");

  const roster = list
    .map((a) => `${a.key}: ${a.display_name} — ${a.description ?? ""}`)
    .join("\n");

  try {
    const { text: out } = await generateText({
      model: openrouter(SUMMARY_MODEL),
      system: `You are Onit, the coordinator of a team of AI software roles. For the user's latest request, choose ONE:
1. CLARIFY — if the request is too vague or missing a key detail you'd need to do good work, ask ONE short, specific question.
2. ROUTE — otherwise route to the 1-3 most relevant roles.
Reply with ONLY compact JSON, no prose:
{"action":"clarify","question":"..."} OR {"action":"route","roles":["key"],"rationale":"one short sentence why"}
Prefer ROUTE; only CLARIFY when genuinely necessary.
Roles:
${roster}`,
      prompt: `${ctx ? `Recent conversation:\n${ctx}\n\n` : ""}Latest request: ${text}\n\nJSON:`,
      maxOutputTokens: 140,
    });
    const json = JSON.parse(
      out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1),
    );
    if (
      json.action === "clarify" &&
      typeof json.question === "string" &&
      json.question.trim()
    ) {
      return { action: "clarify", question: json.question.trim() };
    }
    const valid = new Set(list.map((a) => a.key));
    const rawRoles: unknown[] = Array.isArray(json.roles) ? json.roles : [];
    const roles = [
      ...new Set(
        rawRoles
          .map((s) => String(s).toLowerCase().trim())
          .filter((k) => valid.has(k)),
      ),
    ].slice(0, 3);
    return {
      action: "route",
      roles: roles.length ? roles : fallback.roles,
      rationale: typeof json.rationale === "string" ? json.rationale : "",
    };
  } catch {
    return fallback;
  }
}

/** Persists a coordinator (Onit) message — e.g. a clarifying question. */
export async function saveCoordinatorMessage(
  projectId: string,
  content: string,
): Promise<{ id: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { id: null };
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) return { id: null };
  const { data } = await admin
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      role: "agent",
      agent_key: "coordinator",
      content,
      status: "complete",
    })
    .select("id")
    .single();
  return { id: data?.id ?? null };
}

export async function createProject() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title: "New chat" })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/?error=${encodeURIComponent("Could not create the chat.")}`);
  }
  revalidatePath("/", "layout");
  redirect(`/p/${data.id}`);
}

/** Creates a project and returns its id (no redirect) — used by the home composer. */
export async function createProjectAndGetId(): Promise<{ id: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { id: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title: "New chat" })
    .select("id")
    .single();

  if (!data) return { id: null };
  revalidatePath("/", "layout");
  return { id: data.id };
}

/** Inserts a single user message (used once before fanning out to agents). */
export async function sendUserMessage(
  projectId: string,
  content: string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const text = content.trim();
  if (!text) return { ok: false };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id, title")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) return { ok: false };

  const { error } = await admin.from("messages").insert({
    project_id: projectId,
    owner_id: user.id,
    role: "user",
    content: text,
    status: "complete",
  });
  if (error) return { ok: false };

  if (project.title === "New chat") {
    await admin
      .from("projects")
      .update({ title: text.slice(0, 60) })
      .eq("id", projectId);
    revalidatePath("/", "layout");
  }
  return { ok: true };
}

/** Persists the Plan/Build mode toggle for a project. */
export async function setProjectMode(
  projectId: string,
  mode: "plan" | "build" | "discuss",
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) return { ok: false };

  const { error } = await admin
    .from("projects")
    .update({ mode })
    .eq("id", projectId);
  return { ok: !error };
}

// --- Chat management (user client; RLS scopes everything to the owner) -------

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function renameProject(
  projectId: string,
  title: string,
): Promise<{ ok: boolean }> {
  const t = title.trim();
  if (!t) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ title: t.slice(0, 80) })
    .eq("id", projectId);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteProject(
  projectId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type ProjectHit = {
  id: string;
  title: string;
  last_message_at: string;
};

export async function searchProjects(query: string): Promise<ProjectHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const pattern = likePattern(q);

  const [titleRes, contentRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, last_message_at")
      .ilike("title", pattern)
      .order("last_message_at", { ascending: false })
      .limit(20),
    supabase.from("messages").select("project_id").ilike("content", pattern).limit(60),
  ]);

  const ids = [...new Set((contentRes.data ?? []).map((m) => m.project_id))];
  let contentProjects: ProjectHit[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, last_message_at")
      .in("id", ids);
    contentProjects = (data ?? []) as ProjectHit[];
  }

  const merged = new Map<string, ProjectHit>();
  for (const p of [...(titleRes.data ?? []), ...contentProjects]) {
    merged.set(p.id, p as ProjectHit);
  }
  return [...merged.values()]
    .sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1))
    .slice(0, 20);
}

export async function deleteMessage(
  messageId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  return { ok: !error };
}

export async function getUserStats(): Promise<{
  chats: number;
  messages: number;
  tokens: number;
}> {
  const supabase = await createClient();
  const [proj, msg, usage] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("usage_logs").select("total_tokens"),
  ]);
  const tokens = (usage.data ?? []).reduce(
    (s, r) => s + (r.total_tokens ?? 0),
    0,
  );
  return {
    chats: proj.count ?? 0,
    messages: msg.count ?? 0,
    tokens,
  };
}

/** Deletes a message and every message after it in the same chat. */
export async function truncateFromMessage(
  messageId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: msg } = await supabase
    .from("messages")
    .select("project_id, created_at")
    .eq("id", messageId)
    .single();
  if (!msg) return { ok: false };
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("project_id", msg.project_id)
    .gte("created_at", msg.created_at);
  return { ok: !error };
}
