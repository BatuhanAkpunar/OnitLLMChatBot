// Deep-introspect the live DB and (optionally) apply the idempotent migrations.
//
//   node --env-file=.env.local scripts/db-apply.mjs            # introspect only
//   node --env-file=.env.local scripts/db-apply.mjs --apply    # introspect + apply + verify
//
// Requires DATABASE_URL in the environment (Supabase: Settings -> Database ->
// Connection string -> Session pooler URI, with your password).
import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const baseCfg = { ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 };
// Prefer explicit PG* env vars (avoids URL-encoding issues with special characters
// in the password); fall back to DATABASE_URL when provided.
const client = process.env.DATABASE_URL
  ? new Client({ connectionString: process.env.DATABASE_URL, ...baseCfg })
  : new Client(baseCfg);
await client.connect();

async function introspect(label) {
  console.log(`\n===== ${label} =====`);
  const tables = await client.query(`
    select table_name,
           string_agg(column_name, ', ' order by ordinal_position) as cols
    from information_schema.columns
    where table_schema = 'public'
    group by table_name
    order by table_name`);
  if (tables.rows.length === 0) {
    console.log("public schema has NO tables");
  } else {
    for (const r of tables.rows) console.log(`• ${r.table_name}: ${r.cols}`);
  }

  for (const t of [
    "profiles",
    "projects",
    "messages",
    "context_snapshots",
    "usage_logs",
    "agent_configs",
  ]) {
    try {
      const c = await client.query(`select count(*)::int as n from public.${t}`);
      console.log(`  rows ${t}: ${c.rows[0].n}`);
    } catch {
      console.log(`  rows ${t}: (table missing)`);
    }
  }

  const pol = await client.query(
    `select tablename, count(*)::int as n from pg_policies where schemaname='public' group by tablename order by tablename`,
  );
  console.log(
    "RLS policies:",
    pol.rows.map((r) => `${r.tablename}=${r.n}`).join(", ") || "(none)",
  );
}

await introspect("BEFORE (current live state)");

if (process.argv.includes("--apply")) {
  for (const f of ["0001_init.sql", "0002_seed_agents.sql"]) {
    const sql = await readFile(
      new URL(`../supabase/migrations/${f}`, import.meta.url),
      "utf8",
    );
    process.stdout.write(`\nApplying ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  // Make PostgREST pick up the new tables immediately.
  await client.query(`notify pgrst, 'reload schema'`);
  console.log("Requested PostgREST schema reload.");

  await introspect("AFTER apply");

  const agents = await client.query(
    `select key, handle, color, sort_order from public.agent_configs order by sort_order`,
  );
  console.log("\nSeeded agents:");
  for (const a of agents.rows)
    console.log(`  ${a.sort_order}. ${a.handle} (${a.key}) [${a.color}]`);
}

await client.end();
console.log("\nDone.");
