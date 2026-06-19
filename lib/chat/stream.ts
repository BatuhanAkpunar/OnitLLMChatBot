/**
 * Pure helpers for the /api/chat streaming contract (NDJSON: one JSON object per
 * line). Kept apart from the chat component so the answer state machine can be
 * tested against the exact wire format the route emits, with no React or fetch.
 *
 * Wire events: {type:"meta",messageId,agentKey} {type:"thinking",delta}
 * {type:"answer",delta} {type:"final",content} {type:"done",status}.
 */

export type StreamEvent = {
  type: string;
  delta?: string;
  status?: string;
  content?: string;
  messageId?: string;
  agentKey?: string;
};

/**
 * Pulls every complete NDJSON line out of a growing buffer and returns the
 * parsed events plus the leftover partial line. Blank and unparseable lines are
 * skipped, and a half-received line (no trailing newline yet) stays in `rest`
 * until its newline arrives in a later chunk.
 */
export function drainEvents(buf: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  let rest = buf;
  let nl: number;
  while ((nl = rest.indexOf("\n")) >= 0) {
    const ln = rest.slice(0, nl);
    rest = rest.slice(nl + 1);
    if (!ln.trim()) continue;
    try {
      events.push(JSON.parse(ln) as StreamEvent);
    } catch {
      // partial or malformed line: drop it, keep streaming
    }
  }
  return { events, rest };
}

/** Accumulated state of one streaming agent row. */
export type StreamRow = {
  content: string;
  thinking: string;
  status: "streaming" | "complete" | "error";
};

export function initialRow(): StreamRow {
  return { content: "", thinking: "", status: "streaming" };
}

/**
 * Applies one wire event to a row. The `meta` id-swap is handled by the caller
 * because it touches React keys; everything that shapes the visible answer and
 * the terminal status lives here. An empty/omitted delta is a no-op; `final`
 * replaces the streamed answer with the route's authoritative content.
 */
export function applyEvent(row: StreamRow, evt: StreamEvent): StreamRow {
  switch (evt.type) {
    case "thinking":
      return { ...row, thinking: row.thinking + (evt.delta ?? "") };
    case "answer":
      return { ...row, content: row.content + (evt.delta ?? "") };
    case "final":
      return { ...row, content: evt.content ?? row.content };
    case "done":
      return { ...row, status: evt.status === "error" ? "error" : "complete" };
    default:
      return row;
  }
}

/**
 * Closes a row whose stream ended without a `done` event (proxy cut, failover
 * edge): a lingering "streaming" becomes "complete" so the bubble never hangs.
 * A row that already reached a terminal status is left untouched.
 */
export function finalizeRow(row: StreamRow): StreamRow {
  return row.status === "streaming" ? { ...row, status: "complete" } : row;
}
