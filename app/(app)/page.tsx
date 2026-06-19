import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { getAgentRoster } from "@/lib/agents-roster";
import { HomeComposer } from "@/components/chat/home-composer";
import { TopBar } from "@/components/nav/top-bar";

export default async function HomePage() {
  const supabase = await createClient();

  // One parallel round-trip: auth claims, the cached role roster, and the
  // user's project list (RLS returns nothing for signed-out visitors).
  const [user, agentList, { data: projects }] = await Promise.all([
    getCurrentUser(),
    getAgentRoster(),
    supabase
      .from("projects")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false }),
  ]);

  return (
    <>
      {user ? <TopBar user={user} projects={projects ?? []} overlay /> : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <HomeComposer
          authed={!!user}
          agents={agentList}
          defaultAgentKey={agentList[0]?.key ?? "analyst"}
        />
      </div>
    </>
  );
}
