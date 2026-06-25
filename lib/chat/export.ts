/**
 * Builds a clean, paste-ready deliverable from a chat thread, instead of dumping
 * the whole transcript. Research (docs/research/findings.md) showed builders want
 * "the spec, not the chat": the original brief plus what the team produced, not
 * every follow-up prompt and routing/plan message. Kept as a pure function so the
 * formatting is unit-testable without React.
 */

export type ExportMessage = {
  role: "user" | "agent" | "system";
  agentKey?: string | null;
  content: string;
};

export type ExportLabels = {
  /** One-line note placed under the title, e.g. "Exported from Onit AI". */
  exportedNote: string;
  /** Heading for the original idea, e.g. "Brief". */
  brief: string;
  /** Display name for the coordinator role (agentKey === "coordinator"). */
  coordinatorName: string;
  /** Resolves a teammate's display name from its agent key. */
  nameFor: (agentKey: string) => string;
};

/**
 * Returns markdown: the title, the original brief (first user message), then one
 * section per substantive team output (teammate answers + Onit's synthesis).
 * Follow-up user prompts and empty messages are dropped so the result reads as a
 * document, not a conversation log.
 */
export function buildChatExport(
  title: string,
  messages: ExportMessage[],
  labels: ExportLabels,
): string {
  const lines: string[] = [`# ${title}`, "", `> ${labels.exportedNote}`, ""];

  const firstBrief = messages.find(
    (m) => m.role === "user" && m.content.trim(),
  );
  if (firstBrief) {
    lines.push(`## ${labels.brief}`, "", firstBrief.content.trim(), "");
  }

  for (const m of messages) {
    // Only teammate/coordinator answers belong in the deliverable: follow-up
    // user prompts and system messages are conversation, not spec.
    if (m.role !== "agent") continue;
    const content = m.content.trim();
    if (!content) continue;
    const name =
      m.agentKey === "coordinator"
        ? labels.coordinatorName
        : labels.nameFor(m.agentKey ?? "");
    lines.push(`## ${name}`, "", content, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
