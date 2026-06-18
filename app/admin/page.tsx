import { createAdminClient } from "@/lib/supabase/admin";
import { modelCost } from "@/lib/ai/model-prices";

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// Compute time-dependent values outside the component render to keep it pure.
function sevenDayWindow() {
  const now = Date.now();
  return {
    since: new Date(now - 7 * 86_400_000).toISOString(),
    days: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86_400_000);
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        count: 0,
      };
    }),
  };
}

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const win = sevenDayWindow();

  const [users, projectRows, active7dRows, answers, usage, recentMsgs] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("projects").select("owner_id"),
      admin
        .from("projects")
        .select("owner_id")
        .gte("last_message_at", win.since),
      admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "agent")
        .eq("status", "complete"),
      admin
        .from("usage_logs")
        .select("model, prompt_tokens, completion_tokens")
        .gte("created_at", startOfMonthISO()),
      admin.from("messages").select("created_at").gte("created_at", win.since),
    ]);

  const totalUsers = users.count ?? 0;
  const totalProjects = (projectRows.data ?? []).length;
  const activatedUsers = new Set(
    (projectRows.data ?? []).map((p) => p.owner_id),
  ).size;
  const activationRate = totalUsers ? activatedUsers / totalUsers : 0;
  const active7d = new Set(
    (active7dRows.data ?? []).map((p) => p.owner_id),
  ).size;
  const answersDelivered = answers.count ?? 0;

  const usageRows = usage.data ?? [];
  const totalTokens = usageRows.reduce(
    (s, u) => s + (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
    0,
  );
  const estCost = usageRows.reduce(
    (s, u) =>
      s + modelCost(u.model ?? "", u.prompt_tokens ?? 0, u.completion_tokens ?? 0),
    0,
  );

  const days = win.days;
  for (const m of recentMsgs.data ?? []) {
    const day = days.find((d) => d.key === (m.created_at as string).slice(0, 10));
    if (day) day.count += 1;
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Total users", value: fmt(totalUsers) },
    {
      label: "Activated users",
      value: fmt(activatedUsers),
      sub: `${pct(activationRate)} of users created a project`,
    },
    { label: "Active users · 7d", value: fmt(active7d) },
    { label: "Total projects", value: fmt(totalProjects) },
    { label: "Answers delivered", value: fmt(answersDelivered) },
    { label: "Tokens this month", value: fmt(totalTokens) },
    { label: "Est. cost this month", value: `$${estCost.toFixed(2)}` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activation and usage across the platform. Activation = a user who
          created at least one project.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tracking-tight">{c.value}</div>
            {c.sub ? (
              <div className="mt-1 text-[11px] text-muted-foreground">{c.sub}</div>
            ) : null}
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
