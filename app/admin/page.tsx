import { createAdminClient } from "@/lib/supabase/admin";

// Rough gpt-4o-mini pricing (USD per 1M tokens) for the estimate.
const PRICE_IN = 0.15;
const PRICE_OUT = 0.6;

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [users, projects, usage, recentMsgs] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin
      .from("usage_logs")
      .select("prompt_tokens, completion_tokens")
      .gte("created_at", startOfMonthISO()),
    admin
      .from("messages")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);

  const promptTokens = (usage.data ?? []).reduce((s, u) => s + (u.prompt_tokens ?? 0), 0);
  const completionTokens = (usage.data ?? []).reduce((s, u) => s + (u.completion_tokens ?? 0), 0);
  const totalTokens = promptTokens + completionTokens;
  const estCost = (promptTokens / 1e6) * PRICE_IN + (completionTokens / 1e6) * PRICE_OUT;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    };
  });
  for (const m of recentMsgs.data ?? []) {
    const day = days.find((d) => d.key === (m.created_at as string).slice(0, 10));
    if (day) day.count += 1;
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const cards = [
    { label: "Total users", value: fmt(users.count ?? 0) },
    { label: "Total projects", value: fmt(projects.count ?? 0) },
    { label: "Tokens this month", value: fmt(totalTokens) },
    { label: "Est. cost this month", value: `$${estCost.toFixed(2)}` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of usage across the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-medium">Messages · last 7 days</div>
        <div className="mt-5 flex h-40 items-end gap-3">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count ? 4 : 0 }}
                  title={`${d.count} messages`}
                />
              </div>
              <div className="text-xs text-muted-foreground">{d.label}</div>
              <div className="text-xs font-medium">{d.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
