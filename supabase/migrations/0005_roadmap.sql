-- Roadmap batch (June 2026): project rules, per-agent model, prompt versions,
-- message feedback, prompt A/B, persistent project tasks.
-- Idempotent: safe to re-run.

-- ---------- projects: per-project team rules (the "constitution") ----------
alter table public.projects
  add column if not exists rules text;

-- ---------- agent_configs: per-role model override ----------
alter table public.agent_configs
  add column if not exists model text;

-- ---------- agent_config_versions (prompt history; service-role only) ------
create table if not exists public.agent_config_versions (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references public.agent_configs (key) on delete cascade,
  version integer not null,
  system_prompt text not null,
  model text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists agent_config_versions_key_idx
  on public.agent_config_versions (agent_key, created_at desc);
alter table public.agent_config_versions enable row level security;

-- ---------- agent_configs: optional A/B prompt variant ----------------------
alter table public.agent_configs
  add column if not exists ab_version_id uuid references public.agent_config_versions (id) on delete set null;

-- ---------- messages: thumbs feedback + A/B variant marker ------------------
alter table public.messages
  add column if not exists feedback smallint check (feedback in (-1, 1));
alter table public.messages
  add column if not exists variant text check (variant in ('a', 'b'));

-- ---------- project_tasks (persistent backlog per chat) ---------------------
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  role_key text not null,
  task text not null,
  done_criteria text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_tasks_project_idx
  on public.project_tasks (project_id, sort);

drop trigger if exists project_tasks_set_updated_at on public.project_tasks;
create trigger project_tasks_set_updated_at
  before update on public.project_tasks
  for each row execute function public.set_updated_at();

alter table public.project_tasks enable row level security;

drop policy if exists project_tasks_select_own on public.project_tasks;
create policy project_tasks_select_own on public.project_tasks
  for select using (auth.uid() = owner_id);
drop policy if exists project_tasks_insert_own on public.project_tasks;
create policy project_tasks_insert_own on public.project_tasks
  for insert with check (auth.uid() = owner_id);
drop policy if exists project_tasks_update_own on public.project_tasks;
create policy project_tasks_update_own on public.project_tasks
  for update using (auth.uid() = owner_id);
drop policy if exists project_tasks_delete_own on public.project_tasks;
create policy project_tasks_delete_own on public.project_tasks
  for delete using (auth.uid() = owner_id);
