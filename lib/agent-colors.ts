/** Color keys that have a matching `--agent-<key>` CSS variable (light + dark). */
export const AGENT_COLORS = [
  "analyst",
  "product-manager",
  "project-manager",
  "developer",
  "product-designer",
  "qa",
  "red",
  "amber",
  "lime",
  "cyan",
  "indigo",
  "rose",
] as const;

export type AgentColor = (typeof AGENT_COLORS)[number];

export function isAgentColor(c: string): c is AgentColor {
  return (AGENT_COLORS as readonly string[]).includes(c);
}
