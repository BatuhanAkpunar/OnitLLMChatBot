import { getEncoding, type Tiktoken } from "js-tiktoken";
import type { ModelMessage } from "ai";

let enc: Tiktoken | null = null;
function encoder(): Tiktoken {
  if (!enc) enc = getEncoding("o200k_base");
  return enc;
}

export function countTokens(text: string): number {
  if (!text) return 0;
  return encoder().encode(text).length;
}

export function countMessagesTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const m of messages) {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    total += countTokens(content) + 4; // small per-message overhead
  }
  return total;
}

/**
 * Drops the oldest non-system messages until the transcript fits the budget.
 * System messages (project summary / rolling summaries) are preserved.
 */
export function enforceTokenBudget(
  messages: ModelMessage[],
  budget = 100_000,
): ModelMessage[] {
  const msgs = [...messages];
  while (countMessagesTokens(msgs) > budget && msgs.length > 1) {
    const idx = msgs.findIndex((m) => m.role !== "system");
    if (idx === -1) break;
    msgs.splice(idx, 1);
  }
  return msgs;
}
