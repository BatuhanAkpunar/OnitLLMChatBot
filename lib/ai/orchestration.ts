/**
 * Pure parsing/validation for the orchestrator's routing decision. Kept apart
 * from the server action so the untrusted-LLM-output handling is unit-testable.
 */

export type OrchestrateTask = {
  role: string;
  task: string;
  done: string;
  /** Optional method-library key the role should apply for this task. */
  skill: string;
};

export type OrchestrateResult =
  | { action: "clarify"; question: string }
  | { action: "work"; rationale: string; tasks: OrchestrateTask[] };

export type ParseOptions = {
  /** Enabled role keys; tasks naming any other role are dropped. */
  roleKeys: Iterable<string>;
  /** Enabled skill keys; an unknown skill is downgraded to "". */
  skillKeys: Iterable<string>;
  /** Used as the task text when the model omits one. */
  fallbackText: string;
};

/**
 * Turns the orchestrator LLM's reply into a validated decision. The model is
 * told to return compact JSON but may wrap it in prose, invent or duplicate
 * roles, omit fields, or pick a skill that no longer exists. This throws with a
 * precise reason on anything it cannot turn into a safe decision, so the caller
 * can retry or fall back rather than route on garbage.
 */
export function parseOrchestration(out: string, opts: ParseOptions): OrchestrateResult {
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object found");
  const json = JSON.parse(out.slice(start, end + 1));
  if (json.action === "clarify") {
    if (typeof json.question !== "string" || !json.question.trim()) {
      throw new Error('action "clarify" requires a non-empty "question" string');
    }
    return { action: "clarify", question: json.question.trim() };
  }
  if (json.action !== "work") {
    throw new Error('"action" must be "clarify" or "work"');
  }
  const valid = new Set(opts.roleKeys);
  const validSkills = new Set(opts.skillKeys);
  if (!Array.isArray(json.tasks) || json.tasks.length === 0) {
    throw new Error('"tasks" must be a non-empty array');
  }
  const tasks: OrchestrateTask[] = [];
  const seen = new Set<string>();
  for (const t of json.tasks as unknown[]) {
    const o = t as {
      role?: unknown;
      task?: unknown;
      done?: unknown;
      skill?: unknown;
    };
    const role = String(o.role ?? "").toLowerCase().trim();
    const task = String(o.task ?? "").trim();
    const done = String(o.done ?? "").trim();
    const skillKey = String(o.skill ?? "").toLowerCase().trim();
    if (!valid.has(role)) continue;
    if (seen.has(role)) continue;
    seen.add(role);
    tasks.push({
      role,
      task: task || opts.fallbackText,
      done,
      skill: validSkills.has(skillKey) ? skillKey : "",
    });
    if (tasks.length >= 3) break;
  }
  if (!tasks.length) {
    throw new Error(`no valid role keys; valid keys: ${[...valid].join(", ")}`);
  }
  return {
    action: "work",
    rationale: typeof json.rationale === "string" ? json.rationale : "",
    tasks,
  };
}
