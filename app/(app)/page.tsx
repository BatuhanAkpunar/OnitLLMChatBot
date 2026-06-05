import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { HomeComposer } from "@/components/chat/home-composer";
import type { Agent } from "@/components/chat/chat-view";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Use the service-role client so the role roster is available to signed-out
  // visitors too (agent_configs RLS only grants reads to authenticated users).
  const admin = createAdminClient();
  const { data: agents } = await admin
    .from("agent_configs")
    .select("key, display_name, handle, color, description")
    .eq("enabled", true)
    .order("sort_order");

  const agentList = (agents ?? []) as Agent[];

  return (
    <HomeComposer
      authed={!!user}
      userName={user?.name ?? null}
      agents={agentList}
      defaultAgentKey={agentList[0]?.key ?? "analyst"}
    />
  );
}
