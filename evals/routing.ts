/**
 * Routing eval: runs canned requests through the live orchestrator prompt and
 * checks the routing decision against an expectation, so we can spot drift
 * BEFORE shipping an orchestrator-prompt change. This is a manual dev tool, not
 * part of `npm test` (it hits the live model and is non-deterministic).
 *
 *   node --env-file=.env.local --experimental-strip-types evals/routing.ts
 *   (or)  npx tsx --env-file=.env.local evals/routing.ts
 */
import { generateText } from "ai";
import { google, DEFAULT_MODEL, NO_THINKING } from "../lib/ai/llm.ts";
import {
  buildOrchestratorSystem,
  parseOrchestration,
} from "../lib/ai/orchestration.ts";

// The 5 core roles, matching prompts/agents/*.md frontmatter.
const ROLES = [
  { key: "analyst", name: "Analyst", desc: "Requirements, user stories, acceptance criteria" },
  { key: "product_manager", name: "Product Manager", desc: "Product strategy, PRDs, prioritization" },
  { key: "product_designer", name: "Designer", desc: "UX flows, interaction and visual design" },
  { key: "project_manager", name: "Project Manager", desc: "Delivery sequencing, sprints, dependencies" },
  { key: "qa", name: "QA Engineer", desc: "Test strategy, cases, quality" },
];
const roster = ROLES.map((r) => `${r.key}: ${r.name}: ${r.desc}`).join("\n");
const roleKeys = ROLES.map((r) => r.key);

type Case = { req: string; expect: "clarify" | string[] };
const CASES: Case[] = [
  { req: "Bir alışkanlık takip uygulaması için kısa bir PRD yaz", expect: ["product_manager"] },
  { req: "Login ekranı için test senaryoları çıkar", expect: ["qa"] },
  { req: "Bu özellik için kabul kriterlerini Given/When/Then olarak yaz", expect: ["analyst"] },
  { req: "Bu ürün için 2 haftalık sprint planı yap", expect: ["project_manager"] },
  { req: "Onboarding akışının kullanıcı yolculuğunu (user flow) çıkar", expect: ["product_designer"] },
  { req: "Bir not alma uygulaması için hem PRD yaz hem de test planı çıkar", expect: ["product_manager", "qa"] },
  { req: "bugün hava nasıl olacak", expect: "clarify" },
  { req: "merhaba, bana bir şiir yazar mısın", expect: "clarify" },
];

const system = buildOrchestratorSystem({ langRule: " reply in the user's language.", roster });

async function decide(req: string) {
  const { text } = await generateText({
    model: google(DEFAULT_MODEL),
    providerOptions: NO_THINKING,
    system,
    prompt: `Latest request: ${req}\n\nJSON:`,
    maxOutputTokens: 300,
  });
  return parseOrchestration(text, { roleKeys, skillKeys: [], fallbackText: req });
}

function pass(c: Case, got: Awaited<ReturnType<typeof decide>>): boolean {
  if (c.expect === "clarify") return got.action === "clarify";
  if (got.action !== "work") return false;
  const roles = got.tasks.map((t) => t.role).sort();
  const want = [...c.expect].sort();
  return roles.length === want.length && roles.every((r, i) => r === want[i]);
}

const results = await Promise.all(
  CASES.map(async (c) => {
    try {
      const got = await decide(c.req);
      const ok = pass(c, got);
      const detail =
        got.action === "work" ? got.tasks.map((t) => t.role).join("+") : "clarify";
      return { c, ok, detail };
    } catch (e) {
      return { c, ok: false, detail: `ERROR ${e instanceof Error ? e.message : e}` };
    }
  }),
);

let passed = 0;
for (const { c, ok, detail } of results) {
  if (ok) passed++;
  const want = c.expect === "clarify" ? "clarify" : c.expect.join("+");
  console.log(`${ok ? "PASS" : "FAIL"}  want=${want}  got=${detail}  | ${c.req}`);
}
console.log(`\n${passed}/${CASES.length} passed`);
process.exit(passed === CASES.length ? 0 : 1);
