/**
 * Splits a trailing ```options block off an answer into clickable choices.
 * The model appends this block to offer follow-up questions as chips; anything
 * before it stays as the message body. Pure so it can be unit-tested apart from
 * the message component.
 */
export function splitOptions(content: string): { body: string; options: string[] } {
  const m = content.match(/```options\s*\n([\s\S]*?)\n?```\s*$/);
  if (!m || m.index === undefined) return { body: content, options: [] };
  const options = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!options.length) return { body: content, options: [] };
  return { body: content.slice(0, m.index).trimEnd(), options };
}
