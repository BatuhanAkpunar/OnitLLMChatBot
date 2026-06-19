export type MentionAgent = { key: string; handle: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the agent keys mentioned in `text`, ordered by first appearance and
 * de-duplicated. A handle only counts at a word boundary: it must not be glued
 * to a preceding word character (so "sam@qa-team.com" is not a @QA mention) and
 * must not run straight into more word characters (so "@QA" inside "@QAlead"
 * does not match). This mirrors how the composer detects an @token while typing.
 */
export function parseMentions(text: string, agents: MentionAgent[]): string[] {
  const hits: { key: string; idx: number }[] = [];
  for (const a of agents) {
    const re = new RegExp(`(?<![\\w])${escapeRegExp(a.handle)}(?!\\w)`, "i");
    const m = re.exec(text);
    if (m) hits.push({ key: a.key, idx: m.index });
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
