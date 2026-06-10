"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAgentColor } from "@/lib/agent-colors";
import { generateText } from "ai";
import { openrouter, DEFAULT_MODEL } from "@/lib/ai/openrouter";
import { modelCost, MODEL_CHOICES } from "@/lib/ai/model-prices";
import { buildSystemPrompt } from "@/lib/ai/guardrails";

export async function saveAgentConfig(
  key: string,
  systemPrompt: string,
  model?: string | null,
): Promise<{ ok: boolean; error?: string; version?: number }> {
  await requireAdmin();
  if (!systemPrompt.trim()) {
    return { ok: false, error: "Prompt cannot be empty." };
  }

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("agent_configs")
    .select("version, system_prompt, model")
    .eq("key", key)
    .single();

  // Every save preserves the outgoing prompt as a version (rollback target).
  if (current?.system_prompt && current.system_prompt !== systemPrompt) {
    await admin.from("agent_config_versions").insert({
      agent_key: key,
      version: current.version ?? 1,
      system_prompt: current.system_prompt,
      model: current.model ?? null,
      note: "before admin edit",
    });
  }

  const nextVersion = (current?.version ?? 1) + 1;
  const { error } = await admin
    .from("agent_configs")
    .update({
      system_prompt: systemPrompt,
      model: model?.trim() || null,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  return { ok: true, version: nextVersion };
}

export type AgentVersion = {
  id: string;
  version: number;
  system_prompt: string;
  model: string | null;
  note: string | null;
  created_at: string;
};

export async function listAgentVersions(key: string): Promise<AgentVersion[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_config_versions")
    .select("id, version, system_prompt, model, note, created_at")
    .eq("agent_key", key)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as AgentVersion[];
}

export async function restoreAgentVersion(
  key: string,
  versionId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: v } = await admin
    .from("agent_config_versions")
    .select("system_prompt, model, version")
    .eq("id", versionId)
    .eq("agent_key", key)
    .maybeSingle();
  if (!v) return { ok: false, error: "Version not found." };
  const res = await saveAgentConfig(key, v.system_prompt, v.model);
  return res.ok ? { ok: true } : res;
}

/** Playground: run a sample message against a draft prompt, without saving. */
export async function testAgentPrompt(
  draftPrompt: string,
  sample: string,
  model?: string | null,
): Promise<{ text: string; ms: number; tokens: number; costUsd: number; error?: string }> {
  await requireAdmin();
  const m = model?.trim() || DEFAULT_MODEL;
  const started = Date.now();
  try {
    const { text, usage } = await generateText({
      model: openrouter(m),
      system: buildSystemPrompt(draftPrompt),
      prompt: sample,
      maxOutputTokens: 700,
    });
    const inTok = usage?.inputTokens ?? 0;
    const outTok = usage?.outputTokens ?? 0;
    return {
      text,
      ms: Date.now() - started,
      tokens: inTok + outTok,
      costUsd: modelCost(m, inTok, outTok),
    };
  } catch (err) {
    return {
      text: "",
      ms: Date.now() - started,
      tokens: 0,
      costUsd: 0,
      error: err instanceof Error ? err.message.slice(0, 200) : "Model call failed.",
    };
  }
}

export async function getModelChoices(): Promise<string[]> {
  await requireAdmin();
  return MODEL_CHOICES;
}

/** Starts or stops a prompt A/B test: variant B is a stored version. */
export async function setAgentAbVersion(
  key: string,
  versionId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_configs")
    .update({ ab_version_id: versionId })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agents");
  return { ok: true };
}

export type AbStats = {
  a: { count: number; up: number; down: number };
  b: { count: number; up: number; down: number };
};

export async function getAgentAbStats(key: string): Promise<AbStats> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select("variant, feedback")
    .eq("agent_key", key)
    .not("variant", "is", null)
    .limit(2000);
  const stats: AbStats = {
    a: { count: 0, up: 0, down: 0 },
    b: { count: 0, up: 0, down: 0 },
  };
  for (const m of data ?? []) {
    const v = m.variant === "b" ? stats.b : stats.a;
    v.count++;
    if (m.feedback === 1) v.up++;
    if (m.feedback === -1) v.down++;
  }
  return stats;
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
