// Instant, client-side guess of which role(s) a request is about — used only
// for live UI hints (the constellation + the "Auto" preview). The actual
// routing decision is made server-side by `routeToAgents` (an LLM).
const RULES: Record<string, RegExp> = {
  developer:
    /build|code|implement|api|function|bug|fix|refactor|database|deploy|backend|frontend|integrat|script|librar|endpoint|migrat/i,
  qa: /test|qa|edge case|coverage|scenario|regression|validat|quality|reproduc/i,
  product_designer:
    /design|ui|ux|screen|layout|flow|wireframe|prototype|accessib|visual|figma|interaction|component/i,
  analyst:
    /requirement|user stor|acceptance|spec|scope|stakeholder|criteria|elicit|use case/i,
  product_manager:
    /roadmap|prioriti|feature|metric|prd|strateg|value|market|user need|product|positioning/i,
  project_manager:
    /timeline|milestone|sprint|estimat|schedule|risk|deadline|deliver|coordinat|backlog|capacity/i,
};

export function guessRoles(text: string, validKeys: string[]): string[] {
  const t = text.trim();
  if (!t) return [];
  const scored = validKeys
    .map((k) => {
      const re = RULES[k];
      const n = re ? (t.match(new RegExp(re, "gi"))?.length ?? 0) : 0;
      return { k, n };
    })
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n);
  return scored.slice(0, 2).map((s) => s.k);
}
