// Quick connectivity + schema check using the service_role key.
// Run: node --env-file=.env.local scripts/check-db.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
console.log(
  "auth.admin.listUsers:",
  uErr ? `ERROR ${uErr.message}` : `OK (${users.users.length} users)`,
);

const { data: agents, error: aErr } = await supabase
  .from("agent_configs")
  .select("key, display_name, handle")
  .order("sort_order");

if (aErr) {
  console.log(`agent_configs: NOT READY (${aErr.code ?? ""} ${aErr.message})`);
} else {
  console.log(`agent_configs: ${agents.length} rows`);
  for (const a of agents) console.log(`  - ${a.handle} (${a.key})`);
}

for (const t of [
  "profiles",
  "projects",
  "messages",
  "context_snapshots",
  "usage_logs",
]) {
  const { error } = await supabase.from(t).select("*", { count: "exact", head: true });
  console.log(`table ${t}: ${error ? `MISSING (${error.message})` : "OK"}`);
}
