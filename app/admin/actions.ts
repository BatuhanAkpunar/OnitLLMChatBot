"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAgentColor } from "@/lib/agent-colors";

export async function saveAgentConfig(
  key: string,
  systemPrompt: string,
): Promise<{ ok: boolean; error?: string; version?: number }> {
  await requireAdmin();
  if (!systemPrompt.trim()) {
    return { ok: false, error: "Prompt cannot be empty." };
  }

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("agent_configs")
    .select("version")
    .eq("key", key)
    .single();

  const nextVersion = (current?.version ?? 1) + 1;
  const { error } = await admin
    .from("agent_configs")
    .update({
      system_prompt: systemPrompt,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  return { ok: true, version: nextVersion };
}

export type NewAgentInput = {
  key: string;
  display_name: string;
  handle: string;
  color: string;
  description?: string;
  system_prompt: string;
  sort_order?: number;
};

export async function createAgentConfig(
  input: NewAgentInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const key = (input.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const display_name = (input.display_name ?? "").trim();
  let handle = (input.handle ?? "").trim().replace(/\s+/g, "");
  if (handle && !handle.startsWith("@")) handle = `@${handle}`;
  const color = (input.color ?? "").trim();
  const system_prompt = (input.system_prompt ?? "").trim();

  if (!key) return { ok: false, error: "Key is required." };
  if (!display_name) return { ok: false, error: "Display name is required." };
  if (handle.length < 2) return { ok: false, error: "A handle like @Name is required." };
  if (!isAgentColor(color)) return { ok: false, error: "Pick a valid color." };
  if (!system_prompt) return { ok: false, error: "Prompt cannot be empty." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("agent_configs")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  if (existing) return { ok: false, error: `A role with key "${key}" already exists.` };

  const { error } = await admin.from("agent_configs").insert({
    key,
    display_name,
    handle,
    color,
    description: input.description?.trim() || null,
    system_prompt,
    sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 99,
    enabled: true,
    version: 1,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAgentEnabled(
  key: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_configs")
    .update({ enabled })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAgentConfig(
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("agent_configs").delete().eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  revalidatePath("/", "layout");
  return { ok: true };
}
