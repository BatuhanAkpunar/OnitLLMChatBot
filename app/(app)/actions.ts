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
  mode: "plan" | "build",
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
