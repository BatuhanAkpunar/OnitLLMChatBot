-- R8 (June 2026): decision memory + skill library.
-- Idempotent: safe to re-run.

-- ---------- project_decisions (decision memory per chat) --------------------
-- A decision is a constraint with a rationale: adopted decisions are injected
-- into every role's context; superseding keeps the pivot history.
create table if not exists public.project_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'adopted', 'superseded', 'dismissed')),
  context text,
  because text[] not null default '{}',
  despite text[] not null default '{}',
  constraints text[] not null default '{}',
  scope_roles text[] not null default '{}',
  supersedes_id uuid references public.project_decisions (id) on delete set null,
  source_message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_decisions_project_idx
  on public.project_decisions (project_id, created_at desc);

drop trigger if exists project_decisions_set_updated_at on public.project_decisions;
create trigger project_decisions_set_updated_at
  before update on public.project_decisions
  for each row execute function public.set_updated_at();

alter table public.project_decisions enable row level security;

drop policy if exists project_decisions_select_own on public.project_decisions;
create policy project_decisions_select_own on public.project_decisions
  for select using (auth.uid() = owner_id);
drop policy if exists project_decisions_insert_own on public.project_decisions;
create policy project_decisions_insert_own on public.project_decisions
  for insert with check (auth.uid() = owner_id);
drop policy if exists project_decisions_update_own on public.project_decisions;
create policy project_decisions_update_own on public.project_decisions
  for update using (auth.uid() = owner_id);
drop policy if exists project_decisions_delete_own on public.project_decisions;
create policy project_decisions_delete_own on public.project_decisions
  for delete using (auth.uid() = owner_id);

-- ---------- skills (PM/engineering method library) --------------------------
-- Seeded from prompts/skills/*.md (scripts/seed-skills.mjs). The orchestrator
-- sees only the catalog (title + description + best_for); the body is loaded
-- into the assigned role's system prompt for that turn only.
create table if not exists public.skills (
  key text primary key,
  title text not null,
  description text not null,
  intent text,
  skill_type text not null default 'component'
    check (skill_type in ('component', 'interactive', 'workflow')),
  best_for text[] not null default '{}',
  triggers text[] not null default '{}',
  role_keys text[] not null default '{}',
  body text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.skills enable row level security;

-- Read by any signed-in user; writes via service role only.
drop policy if exists skills_select_all on public.skills;
create policy skills_select_all on public.skills
  for select to authenticated using (true);
