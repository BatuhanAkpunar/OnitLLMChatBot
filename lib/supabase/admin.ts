import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client (bypasses RLS). Server-only. Use for writes that have no
 * authenticated insert policy: assistant message persistence during streaming,
 * usage_logs, context_snapshots, and admin agent_config edits. Always verify
 * ownership in application code before writing with this client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
