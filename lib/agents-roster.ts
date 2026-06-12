import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/components/chat/chat-view";

/**
 * The enabled-roles roster, cached across requests: it's identical for every
 * visitor and changes only from the admin panel (which revalidates the tag).
 * Uses the service-role client so signed-out visitors get it too.
 */
export const getAgentRoster = unstable_cache(
  async (): Promise<Agent[]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agent_configs")
      .select("key, display_name, handle, color, description")
      .eq("enabled", true)
      .order("sort_order");
    return (data ?? []) as Agent[];
  },
  ["agent-roster"],
  { revalidate: 300, tags: ["agent-roster"] },
);
