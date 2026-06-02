import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const PRICES: Record<string, [number, number]> = {
  "openai/gpt-4o-mini": [0.15, 0.6],
};
function costOf(model: string, pin: number, pout: number) {
  const [i, o] = PRICES[model] ?? [0.15, 0.6];
  return (pin / 1e6) * i + (pout / 1e6) * o;
}
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default async function AdminUsagePage(props: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const { days } = await props.searchParams;
  const dayN = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const since = new Date(Date.now() - dayN * 86_400_000).toISOString();

  const admin = createAdminClient();
  const [logsRes, profilesRes] = await Promise.all([
    admin
      .from("usage_logs")
      .select("user_id, model, prompt_tokens, completion_tokens")
      .gte("created_at", since),
    admin.from("profiles").select("id, email"),
  ]);

  const emailById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.email ?? p.id]),
  );

  const byUser = new Map<string, { tokens: number; cost: number }>();
  const byModel = new Map<string, { tokens: number; cost: number }>();
  for (const l of logsRes.data ?? []) {
    const pin = l.prompt_tokens ?? 0;
    const pout = l.completion_tokens ?? 0;
    const tokens = pin + pout;
    const cost = costOf(l.model ?? "", pin, pout);

    const u = byUser.get(l.user_id) ?? { tokens: 0, cost: 0 };
    u.tokens += tokens;
    u.cost += cost;
    byUser.set(l.user_id, u);

    const m = byModel.get(l.model ?? "unknown") ?? { tokens: 0, cost: 0 };
    m.tokens += tokens;
    m.cost += cost;
    byModel.set(l.model ?? "unknown", m);
  }

  const users = [...byUser.entries()].sort((a, b) => b[1].tokens - a[1].tokens);
  const models = [...byModel.entries()].sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Token usage and estimated cost over the selected range.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/usage?days=${r.days}`}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                r.days === dayN
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <Section title="By user">
        {users.length === 0 ? (
          <Empty />
        ) : (
          users.map(([id, v]) => (
            <Row key={id} label={emailById.get(id) ?? id} tokens={v.tokens} cost={v.cost} />
          ))
        )}
      </Section>

      <Section title="By model">
        {models.length === 0 ? (
          <Empty />
        ) : (
          models.map(([model, v]) => (
            <Row key={model} label={model} tokens={v.tokens} cost={v.cost} />
          ))
        )}
      </Section>
    </div>
  );

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5 text-sm font-medium">{title}</div>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 py-1 text-xs text-muted-foreground">
          <span />
          <span className="text-right">Tokens</span>
          <span className="w-20 text-right">Est. cost</span>
        </div>
        <div className="divide-y divide-border">{children}</div>
      </div>
    );
  }
  function Row({ label, tokens, cost }: { label: string; tokens: number; cost: number }) {
    return (
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 py-2.5 text-sm">
        <span className="truncate">{label}</span>
        <span className="text-right tabular-nums">{fmt(tokens)}</span>
        <span className="w-20 text-right tabular-nums">${cost.toFixed(2)}</span>
      </div>
    );
  }
  function Empty() {
    return <div className="px-4 py-6 text-center text-sm text-muted-foreground">No usage yet.</div>;
  }
}
