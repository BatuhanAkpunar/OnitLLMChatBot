"use client";

import { useState } from "react";
import { Markdown } from "@/components/chat/markdown";
import { saveAgentConfig } from "@/app/admin/actions";

export type EditableAgent = {
  key: string;
  display_name: string;
  handle: string;
  color: string;
  description: string | null;
  system_prompt: string;
  version: number;
};

export function AgentEditor({ agents }: { agents: EditableAgent[] }) {
  const [activeKey, setActiveKey] = useState(agents[0]?.key ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(agents.map((a) => [a.key, a.system_prompt])),
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const active = agents.find((a) => a.key === activeKey);
  const value = drafts[activeKey] ?? "";
  const dirty = active ? value !== active.system_prompt : false;

  async function save() {
    if (!active) return;
    setSaving(true);
    setStatus(null);
    const res = await saveAgentConfig(activeKey, value);
    setSaving(false);
    setStatus({
      ok: res.ok,
      text: res.ok
        ? "Saved. New conversations will use the updated prompt."
        : res.error ?? "Could not save.",
    });
  }

  if (!active) return <p className="text-sm text-muted-foreground">No agents found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {agents.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => {
              setActiveKey(a.key);
              setStatus(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              a.key === activeKey
                ? "border-border bg-accent"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `var(--agent-${a.color})` }}
            />
            {a.display_name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {active.handle} · v{active.version}
          {dirty ? " · unsaved changes" : ""}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          value={value}
          onChange={(e) => setDrafts((d) => ({ ...d, [activeKey]: e.target.value }))}
          spellCheck={false}
          className="h-[28rem] w-full resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring/20"
        />
        <div className="h-[28rem] overflow-y-auto rounded-lg border border-border bg-card p-4">
          <Markdown>{value || "_Preview…_"}</Markdown>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status ? (
          <span className={`text-sm ${status.ok ? "text-emerald-600" : "text-destructive"}`}>
            {status.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
