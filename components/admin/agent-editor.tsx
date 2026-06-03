"use client";

import { useState } from "react";
import { Plus, Trash, DownloadSimple, Eye, EyeSlash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Markdown } from "@/components/chat/markdown";
import { AGENT_COLORS } from "@/lib/agent-colors";
import {
  saveAgentConfig,
  createAgentConfig,
  setAgentEnabled,
  deleteAgentConfig,
} from "@/app/admin/actions";

export type EditableAgent = {
  key: string;
  display_name: string;
  handle: string;
  color: string;
  description: string | null;
  system_prompt: string;
  version: number;
  enabled: boolean;
  sort_order: number;
};

type FormState = {
  key: string;
  display_name: string;
  handle: string;
  color: string;
  description: string;
  sort_order: string;
  system_prompt: string;
};

const NEW = "__new__";
const emptyForm: FormState = {
  key: "",
  display_name: "",
  handle: "",
  color: AGENT_COLORS[0],
  description: "",
  sort_order: "99",
  system_prompt: "",
};

function toMarkdown(a: EditableAgent, body: string) {
  return `---\nkey: ${a.key}\ndisplay_name: ${a.display_name}\nhandle: "${a.handle}"\ncolor: ${a.color}\nsort_order: ${a.sort_order}\ndescription: ${a.description ?? ""}\n---\n\n${body.trim()}\n`;
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20";

export function AgentEditor({ agents }: { agents: EditableAgent[] }) {
  const [list, setList] = useState<EditableAgent[]>(agents);
  const [activeKey, setActiveKey] = useState(agents[0]?.key ?? NEW);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(agents.map((a) => [a.key, a.system_prompt])),
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  const isNew = activeKey === NEW;
  const active = list.find((a) => a.key === activeKey);
  const value = drafts[activeKey] ?? "";
  const dirty = active ? value !== active.system_prompt : false;

  async function save() {
    if (!active) return;
    setBusy(true);
    const res = await saveAgentConfig(active.key, value);
    setBusy(false);
    if (res.ok) {
      setList((l) =>
        l.map((a) =>
          a.key === active.key
            ? { ...a, system_prompt: value, version: res.version ?? a.version }
            : a,
        ),
      );
      toast.success("Saved — new conversations use the updated prompt.");
    } else {
      toast.error(res.error ?? "Could not save.");
    }
  }

  async function toggleEnabled() {
    if (!active) return;
    const next = !active.enabled;
    setBusy(true);
    const res = await setAgentEnabled(active.key, next);
    setBusy(false);
    if (res.ok) {
      setList((l) => l.map((a) => (a.key === active.key ? { ...a, enabled: next } : a)));
      toast.success(next ? "Role enabled." : "Role disabled.");
    } else {
      toast.error(res.error ?? "Could not update.");
    }
  }

  async function remove() {
    if (!active) return;
    if (!confirm(`Delete the “${active.display_name}” role? This cannot be undone.`)) return;
    setBusy(true);
    const res = await deleteAgentConfig(active.key);
    setBusy(false);
    if (res.ok) {
      const remaining = list.filter((a) => a.key !== active.key);
      setList(remaining);
      setActiveKey(remaining[0]?.key ?? NEW);
      toast.success("Role deleted.");
    } else {
      toast.error(res.error ?? "Could not delete.");
    }
  }

  async function create() {
    setBusy(true);
    const res = await createAgentConfig({
      key: form.key,
      display_name: form.display_name,
      handle: form.handle,
      color: form.color,
      description: form.description,
      system_prompt: form.system_prompt,
      sort_order: Number(form.sort_order) || 99,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not create role.");
      return;
    }
    const key = form.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    let handle = form.handle.trim().replace(/\s+/g, "");
    if (handle && !handle.startsWith("@")) handle = `@${handle}`;
    const created: EditableAgent = {
      key,
      display_name: form.display_name.trim(),
      handle,
      color: form.color,
      description: form.description.trim() || null,
      system_prompt: form.system_prompt.trim(),
      version: 1,
      enabled: true,
      sort_order: Number(form.sort_order) || 99,
    };
    setList((l) => [...l, created]);
    setDrafts((d) => ({ ...d, [key]: created.system_prompt }));
    setActiveKey(key);
    setForm({ ...emptyForm });
    toast.success("Role created.");
  }

  function download(a: EditableAgent) {
    const body = drafts[a.key] ?? a.system_prompt;
    const blob = new Blob([toMarkdown(a, body)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.key}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${a.key}.md`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {list.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setActiveKey(a.key)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              a.key === activeKey
                ? "border-border bg-accent"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: `var(--agent-${a.color})`,
                opacity: a.enabled ? 1 : 0.35,
              }}
            />
            <span className={a.enabled ? "" : "line-through opacity-60"}>
              {a.display_name}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveKey(NEW)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
            isNew
              ? "border-border bg-accent"
              : "border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Plus size={14} weight="bold" />
          Add role
        </button>
      </div>

      {isNew ? (
        <NewAgentForm form={form} setForm={setForm} onCreate={create} busy={busy} />
      ) : active ? (
        <>
          <div className="text-xs text-muted-foreground">
            {active.handle} · v{active.version}
            {active.enabled ? "" : " · disabled"}
            {dirty ? " · unsaved changes" : ""}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <textarea
              value={value}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [active.key]: e.target.value }))
              }
              spellCheck={false}
              className="h-[26rem] w-full resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="h-[26rem] overflow-y-auto rounded-lg border border-border bg-card p-4">
              <Markdown>{value || "_Preview…_"}</Markdown>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => download(active)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <DownloadSimple size={15} />
              .md
            </button>
            <button
              type="button"
              onClick={toggleEnabled}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              {active.enabled ? <EyeSlash size={15} /> : <Eye size={15} />}
              {active.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash size={15} />
              Delete
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No roles yet. Add one to get started.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function NewAgentForm({
  form,
  setForm,
  onCreate,
  busy,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onCreate: () => void;
  busy: boolean;
}) {
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Display name">
          <input
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Security Engineer"
            className={inputCls}
          />
        </Field>
        <Field label="Key (unique, a–z and _)">
          <input
            value={form.key}
            onChange={(e) => set("key", e.target.value)}
            placeholder="security_engineer"
            className={inputCls}
          />
        </Field>
        <Field label="Handle">
          <input
            value={form.handle}
            onChange={(e) => set("handle", e.target.value)}
            placeholder="@Security"
            className={inputCls}
          />
        </Field>
        <Field label="Sort order">
          <input
            value={form.sort_order}
            onChange={(e) => set("sort_order", e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short summary shown in the picker"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Color</div>
          <div className="flex flex-wrap gap-1.5">
            {AGENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                title={c}
                aria-label={c}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  form.color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: `var(--agent-${c})` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">
          System prompt (markdown)
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            value={form.system_prompt}
            onChange={(e) => set("system_prompt", e.target.value)}
            spellCheck={false}
            placeholder={"## Role\nYou are a Senior …\n\n## Goal\n…"}
            className="h-[24rem] w-full resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring/20"
          />
          <div className="h-[24rem] overflow-y-auto rounded-lg border border-border bg-card p-4">
            <Markdown>{form.system_prompt || "_Preview…_"}</Markdown>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create role"}
      </button>
      <p className="text-xs text-muted-foreground">
        Tip: after creating, use the “.md” button on the role to download the file
        and commit it into <code>prompts/agents/</code>.
      </p>
    </div>
  );
}
