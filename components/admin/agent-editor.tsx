"use client";

import { useState } from "react";
import {
  Plus,
  Trash,
  DownloadSimple,
  Eye,
  EyeSlash,
  ClockCounterClockwise,
  Flask,
  GitBranch,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Markdown } from "@/components/chat/markdown";
import { AGENT_COLORS } from "@/lib/agent-colors";
import { MODEL_CHOICES } from "@/lib/ai/model-prices";
import { ROLE_TEMPLATES } from "@/lib/role-templates";
import {
  saveAgentConfig,
  createAgentConfig,
  setAgentEnabled,
  deleteAgentConfig,
  listAgentVersions,
  restoreAgentVersion,
  testAgentPrompt,
  setAgentAbVersion,
  getAgentAbStats,
  type AgentVersion,
  type AbStats,
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
  model: string | null;
  ab_version_id: string | null;
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
  const [models, setModels] = useState<Record<string, string>>(
    Object.fromEntries(agents.map((a) => [a.key, a.model ?? ""])),
  );

  // Tools panel (history / playground / A/B), one open at a time.
  const [panel, setPanel] = useState<"history" | "test" | "ab" | null>(null);
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [viewVersion, setViewVersion] = useState<AgentVersion | null>(null);
  const [sample, setSample] = useState("");
  const [testResult, setTestResult] = useState<{
    text: string;
    ms: number;
    tokens: number;
    costUsd: number;
    error?: string;
  } | null>(null);
  const [abStats, setAbStats] = useState<AbStats | null>(null);

  const isNew = activeKey === NEW;
  const active = list.find((a) => a.key === activeKey);
  const value = drafts[activeKey] ?? "";
  const model = models[activeKey] ?? "";
  const dirty = active
    ? value !== active.system_prompt || model !== (active.model ?? "")
    : false;

  function switchAgent(key: string) {
    setActiveKey(key);
    setPanel(null);
    setViewVersion(null);
    setTestResult(null);
    setAbStats(null);
  }

  async function save() {
    if (!active) return;
    setBusy(true);
    const res = await saveAgentConfig(active.key, value, model || null);
    setBusy(false);
    if (res.ok) {
      setList((l) =>
        l.map((a) =>
          a.key === active.key
            ? {
                ...a,
                system_prompt: value,
                model: model || null,
                version: res.version ?? a.version,
              }
            : a,
        ),
      );
      toast.success("Saved. New conversations use the updated prompt.");
    } else {
      toast.error(res.error ?? "Could not save.");
    }
  }

  async function openHistory() {
    if (!active) return;
    setPanel(panel === "history" ? null : "history");
    setViewVersion(null);
    if (panel !== "history") {
      const v = await listAgentVersions(active.key);
      setVersions(v);
    }
  }

  async function restore(v: AgentVersion) {
    if (!active) return;
    setBusy(true);
    const res = await restoreAgentVersion(active.key, v.id);
    setBusy(false);
    if (res.ok) {
      setDrafts((d) => ({ ...d, [active.key]: v.system_prompt }));
      setModels((m) => ({ ...m, [active.key]: v.model ?? "" }));
      setList((l) =>
        l.map((a) =>
          a.key === active.key
            ? { ...a, system_prompt: v.system_prompt, model: v.model, version: a.version + 1 }
            : a,
        ),
      );
      setPanel(null);
      toast.success(`Restored v${v.version}.`);
    } else {
      toast.error(res.error ?? "Could not restore.");
    }
  }

  async function runTest() {
    if (!sample.trim()) return;
    setBusy(true);
    setTestResult(null);
    const res = await testAgentPrompt(value, sample, model || null);
    setBusy(false);
    setTestResult(res);
  }

  async function openAb() {
    if (!active) return;
    setPanel(panel === "ab" ? null : "ab");
    if (panel !== "ab") {
      const [v, s] = await Promise.all([
        listAgentVersions(active.key),
        getAgentAbStats(active.key),
      ]);
      setVersions(v);
      setAbStats(s);
    }
  }

  async function setAb(versionId: string | null) {
    if (!active) return;
    setBusy(true);
    const res = await setAgentAbVersion(active.key, versionId);
    setBusy(false);
    if (res.ok) {
      setList((l) =>
        l.map((a) => (a.key === active.key ? { ...a, ab_version_id: versionId } : a)),
      );
      toast.success(versionId ? "A/B test started." : "A/B test stopped.");
    } else {
      toast.error(res.error ?? "Could not update the test.");
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
      model: null,
      ab_version_id: null,
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
            onClick={() => switchAgent(a.key)}
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
          onClick={() => switchAgent(NEW)}
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {active.handle} · v{active.version}
              {active.enabled ? "" : " · disabled"}
              {active.ab_version_id ? " · A/B running" : ""}
              {dirty ? " · unsaved changes" : ""}
            </div>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              Model
              <select
                value={model}
                onChange={(e) =>
                  setModels((m) => ({ ...m, [active.key]: e.target.value }))
                }
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Default</option>
                {MODEL_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
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
              onClick={openHistory}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent ${
                panel === "history" ? "border-foreground/40 bg-accent" : "border-border"
              }`}
            >
              <ClockCounterClockwise size={15} />
              History
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel(panel === "test" ? null : "test");
                setTestResult(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent ${
                panel === "test" ? "border-foreground/40 bg-accent" : "border-border"
              }`}
            >
              <Flask size={15} />
              Test
            </button>
            <button
              type="button"
              onClick={openAb}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent ${
                panel === "ab" ? "border-foreground/40 bg-accent" : "border-border"
              }`}
            >
              <GitBranch size={15} />
              A/B
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

          {panel === "history" ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Prompt history (latest 20). Restoring saves the current prompt as
                a new version first, so nothing is lost.
              </div>
              {versions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No versions yet. A version is recorded every time you save a
                  changed prompt.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="font-mono text-xs">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                        {v.model ? ` · ${v.model}` : ""}
                        {v.note ? ` · ${v.note}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewVersion(viewVersion?.id === v.id ? null : v)}
                        className="ml-auto rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
                      >
                        {viewVersion?.id === v.id ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => restore(v)}
                        disabled={busy}
                        className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {viewVersion ? (
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-relaxed">
                  {viewVersion.system_prompt}
                </pre>
              ) : null}
            </div>
          ) : null}

          {panel === "test" ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Playground: runs the CURRENT DRAFT prompt (unsaved edits included)
                with {model || "the default model"}. Nothing is saved or logged
                to chats.
              </div>
              <div className="flex gap-2">
                <input
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runTest();
                  }}
                  placeholder="A sample user message, e.g. 'Spec a referral program for a fitness app'"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={runTest}
                  disabled={busy || !sample.trim()}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "Running…" : "Run"}
                </button>
              </div>
              {testResult ? (
                testResult.error ? (
                  <p className="mt-3 text-xs text-destructive">{testResult.error}</p>
                ) : (
                  <div className="mt-3">
                    <div className="mb-2 text-[11px] text-muted-foreground">
                      {testResult.ms} ms · {testResult.tokens} tokens · $
                      {testResult.costUsd.toFixed(5)}
                    </div>
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background p-3">
                      <Markdown>{testResult.text}</Markdown>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {panel === "ab" ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Prompt A/B: variant B is a stored version; replies split 50/50 and
                thumbs feedback decides the winner.
              </div>
              {active.ab_version_id ? (
                <div className="space-y-3">
                  {abStats ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(["a", "b"] as const).map((k) => (
                        <div key={k} className="rounded-lg border border-border p-3">
                          <div className="font-semibold uppercase">Variant {k}</div>
                          <div className="mt-1 text-muted-foreground">
                            {abStats[k].count} replies · 👍 {abStats[k].up} · 👎{" "}
                            {abStats[k].down}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAb(null)}
                    disabled={busy}
                    className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-40"
                  >
                    Stop the test
                  </button>
                </div>
              ) : versions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No stored versions to test against. Save a prompt change first,
                  then pick the previous version as variant B here.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {versions.slice(0, 8).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="font-mono text-xs">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAb(v.id)}
                        disabled={busy}
                        className="ml-auto rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Use as variant B
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
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
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkle size={13} weight="fill" />
          Start from a template
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                setForm({
                  key: t.key,
                  display_name: t.display_name,
                  handle: t.handle,
                  color: t.color,
                  description: t.description,
                  sort_order: "99",
                  system_prompt: t.system_prompt,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `var(--agent-${t.color})` }}
              />
              {t.display_name}
            </button>
          ))}
        </div>
      </div>

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
