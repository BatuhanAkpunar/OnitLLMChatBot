export type MentionAgent = { key: string; handle: string };

/**
 * Returns the agent keys mentioned in `text`, ordered by first appearance and
 * de-duplicated. Handles start with "@" so a plain substring match is enough.
 */
export function parseMentions(text: string, agents: MentionAgent[]): string[] {
  const lower = text.toLowerCase();
  const hits: { key: string; idx: number }[] = [];
  for (const a of agents) {
    const idx = lower.indexOf(a.handle.toLowerCase());
    if (idx >= 0) hits.push({ key: a.key, idx });
  }
  hits.sort((x, y) => x.idx - y.idx);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hits) {
    if (!seen.has(h.key)) {
      seen.add(h.key);
      out.push(h.key);
    }
  }
  return out;
}
