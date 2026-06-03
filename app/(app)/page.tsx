import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { HomeComposer } from "@/components/chat/home-composer";
import type { Agent } from "@/components/chat/chat-view";

export default async function HomePage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: agents } = await supabase
    .from("agent_configs")
    .select("key, display_name, handle, color, description")
    .eq("enabled", true)
    .order("sort_order");

  const agentList = (agents ?? []) as Agent[];

  return (
    <HomeComposer
      userName={user?.name ?? null}
      agents={agentList}
      defaultAgentKey={agentList[0]?.key ?? "analyst"}
    />
  );
}
