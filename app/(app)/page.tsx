import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HomeComposer } from "@/components/chat/home-composer";
import { TopBar } from "@/components/nav/top-bar";
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

  // Signed-in users get the floating top bar (history + profile) over the hero.
  let projects: { id: string; title: string; last_message_at: string }[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false });
    projects = data ?? [];
  }

  return (
    <>
      {user ? <TopBar user={user} projects={projects} overlay /> : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <HomeComposer
          authed={!!user}
          userName={user?.name ?? null}
          agents={agentList}
          defaultAgentKey={agentList[0]?.key ?? "analyst"}
        />
      </div>
    </>
  );
}
