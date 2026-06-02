"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

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
