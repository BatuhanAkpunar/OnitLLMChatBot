// Syncs the canonical skill files in prompts/skills/*.md into the skills
// table (service role). Re-running resets the seeded skills to match the
// .md files. Run: node --env-file=.env.local scripts/seed-skills.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "prompts", "skills");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/** Minimal `key: value` frontmatter parser; list fields are comma-separated. */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw.trim() };
  const data = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: m[2].trim() };
}

const list = (v) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
let ok = 0;
for (const file of files) {
  const { data, body } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
  if (!data.key) {
    console.error("skip (no key):", file);
    continue;
  }
  const row = {
    key: data.key,
    title: data.title ?? data.key,
    description: data.description ?? "",
    intent: data.intent ?? null,
    skill_type: data.skill_type ?? "component",
    best_for: list(data.best_for),
    triggers: list(data.triggers),
    role_keys: list(data.role_keys),
    body,
    enabled: true,
    sort_order: Number(data.sort_order ?? 0) || 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("skills").upsert(row, { onConflict: "key" });
  if (error) console.error("ERROR", data.key, "-", error.message);
  else {
    ok++;
    console.log("upserted", data.key);
  }
}
console.log(`\nDone: ${ok}/${files.length} skills seeded from prompts/skills/.`);
