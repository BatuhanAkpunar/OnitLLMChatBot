// Routing eval: runs the canned requests in evals/routing.jsonl against the
// coordinator prompt and reports how often the chosen roles match expectations.
// Run BEFORE changing the orchestrator prompt, and again after, to catch drift.
//
//   node --env-file=.env.local scripts/eval-routing.mjs
//
// A case passes when the model's role set overlaps the expected set (subset
// match would be too strict for 1-3 task plans).

import { readFile } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_SUMMARY_MODEL || "openai/gpt-4o-mini";
if (!KEY) {
  console.error("OPENROUTER_API_KEY missing");
  process.exit(1);
}

// Keep this roster in sync with prompts/agents/*.md frontmatter.
const ROSTER = `analyst: Analyst: Requirements, user stories, acceptance criteria
product_manager: Product Manager: Prioritization, roadmap, product decisions
developer: Developer: Architecture, code, implementation
project_manager: Project Manager: Planning, sequencing, delivery
product_designer: Designer: UX research, flows, interface design
qa: QA Engineer: Test strategy, cases, quality`;

const SYSTEM = `You are Onit, the coordinator of a team of AI software roles. For the user's latest request choose ONE:
1. CLARIFY: if it's too vague or missing a key detail, ask ONE short, specific question.
2. WORK: break it into 1-3 concrete assignments, each given to the single most relevant role. For every task also write "done": one short, checkable acceptance criterion.
Reply with ONLY compact JSON, no prose:
{"action":"clarify","question":"..."}
OR
{"action":"work","rationale":"one short sentence","tasks":[{"role":"rolekey","task":"...","done":"done when ..."}]}
Prefer WORK; only CLARIFY when genuinely necessary.
Roles:
${ROSTER}`;

async function route(text) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Latest request: ${text}\n\nJSON:` },
      ],
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const out = json.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
  if (parsed.action === "clarify") return { clarify: true, roles: [] };
  return {
    clarify: false,
    roles: (parsed.tasks ?? []).map((t) => String(t.role).toLowerCase()),
  };
}

const file = path.join(import.meta.dirname, "..", "evals", "routing.jsonl");
const cases = (await readFile(file, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

let pass = 0;
const failures = [];
for (const c of cases) {
  try {
    const got = await route(c.text);
    const overlap = c.expect.some((r) => got.roles.includes(r));
    const ok = !got.clarify && overlap;
    if (ok) pass++;
    else failures.push({ text: c.text, expect: c.expect, got: got.clarify ? "CLARIFY" : got.roles });
    process.stdout.write(ok ? "." : "F");
  } catch (err) {
    failures.push({ text: c.text, expect: c.expect, got: `ERROR ${err.message}` });
    process.stdout.write("E");
  }
}

console.log(`\n\nPass: ${pass}/${cases.length} (${Math.round((pass / cases.length) * 100)}%)`);
for (const f of failures) {
  console.log(`- "${f.text}"\n  expected one of: ${f.expect.join(", ")} | got: ${Array.isArray(f.got) ? f.got.join(", ") : f.got}`);
}
process.exit(failures.length ? 1 : 0);
