import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentEditor, type EditableAgent } from "@/components/admin/agent-editor";

export default async function AdminAgentsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: agents } = await admin
    .from("agent_configs")
    .select(
      "key, display_name, handle, color, description, system_prompt, version, enabled, sort_order, model, ab_version_id",
    )
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Agent configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit each role&apos;s prompt. Changes apply to new conversations; active
          chats keep their current behavior. Security guardrails are always
          enforced separately and cannot be edited here.
        </p>
      </div>
      <AgentEditor agents={(agents ?? []) as EditableAgent[]} />
    </div>
  );
}
