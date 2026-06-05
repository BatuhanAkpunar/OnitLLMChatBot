"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/user";

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
