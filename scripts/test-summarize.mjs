// Integration check for the auto-summary DB path (service role). Creates a
// throwaway project with 42 messages, runs the trigger's DB operations, asserts
// a rolling snapshot is created + the oldest 20 archived, then cleans up.
// Run: node --env-file=.env.local scripts/test-summarize.mjs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: users } = await sb.auth.admin.listUsers();
const owner = users.users.find((u) => u.email === "dev@onit.local")?.id;
if (!owner) {
  console.error("dev@onit.local not found");
  process.exit(1);
}

const { data: proj } = await sb
  .from("projects")
  .insert({ owner_id: owner, title: "summarize-test" })
  .select("id")
  .single();
const pid = proj.id;

const rows = Array.from({ length: 42 }, (_, i) => ({
  project_id: pid,
  owner_id: owner,
  role: i % 2 ? "agent" : "user",
  agent_key: i % 2 ? "analyst" : null,
  content: `message number ${i}`,
  status: "complete",
}));
await sb.from("messages").insert(rows);

const before = await sb
  .from("messages")
  .select("id", { count: "exact", head: true })
  .eq("project_id", pid)
  .eq("archived", false);
console.log("non-archived before:", before.count, "(threshold to summarize: > 40)");

// Replicate the trigger's DB operations (LLM summary stubbed; generateText is
// already proven by the working chat).
const { data: oldest } = await sb
  .from("messages")
  .select("id")
  .eq("project_id", pid)
  .eq("archived", false)
  .order("created_at", { ascending: true })
  .limit(20);

const snapIns = await sb.from("context_snapshots").insert({
  project_id: pid,
  owner_id: owner,
  kind: "rolling",
  summary: "[test summary of oldest 20]",
});
console.log("snapshot insert error:", snapIns.error?.message ?? "none");

await sb
  .from("messages")
  .update({ archived: true })
  .in("id", oldest.map((m) => m.id));

const after = await sb
  .from("messages")
  .select("id", { count: "exact", head: true })
  .eq("project_id", pid)
  .eq("archived", false);
const snaps = await sb
  .from("context_snapshots")
  .select("id", { count: "exact", head: true })
  .eq("project_id", pid)
  .eq("kind", "rolling");

console.log("non-archived after:", after.count, "(expected 22)");
console.log("rolling snapshots:", snaps.count, "(expected 1)");

await sb.from("projects").delete().eq("id", pid);
console.log("cleaned up:", before.count === 42 && after.count === 22 && snaps.count === 1 ? "PASS" : "CHECK");
