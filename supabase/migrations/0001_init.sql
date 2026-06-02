-- ============================================================================
-- Onit AI — core schema (idempotent). Run in the Supabase SQL editor.
-- A "project" is a chat thread: messages, snapshots and usage hang off it.
-- ============================================================================

-- ---------- shared helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (mirror of auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a new auth user signs up (Google OAuth).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- projects (chat threads) ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'build' check (mode in ('plan', 'build')),
  last_agent_key text,
  message_count integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists projects_owner_idx
  on public.projects (owner_id, last_message_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------- messages ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  agent_key text,
  content text not null default '',
  thinking text,
  status text not null default 'complete'
    check (status in ('pending', 'streaming', 'complete', 'error')),
  token_count integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_project_idx
  on public.messages (project_id, created_at);
create index if not exists messages_project_active_idx
  on public.messages (project_id, created_at) where archived = false;

-- Keep project counters fresh as messages arrive.
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.projects
     set message_count = message_count + 1,
         last_message_at = now(),
         updated_at = now()
   where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------- context_snapshots (rolling summaries) ----------
create table if not exists public.context_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  summary text not null,
  message_start integer,
  message_end integer,
  kind text not null default 'rolling'
    check (kind in ('rolling', 'project_intro')),
  created_at timestamptz not null default now()
);
create index if not exists context_snapshots_project_idx
  on public.context_snapshots (project_id, created_at);

-- ---------- agent_configs (global, admin-managed) ----------
create table if not exists public.agent_configs (
  key text primary key,
  display_name text not null,
  handle text not null,
  color text not null,
  description text,
  system_prompt text not null,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists agent_configs_set_updated_at on public.agent_configs;
create trigger agent_configs_set_updated_at
  before update on public.agent_configs
  for each row execute function public.set_updated_at();

-- ---------- usage_logs (token + cost accounting) ----------
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  model text not null,
  agent_key text,
  kind text not null default 'chat' check (kind in ('chat', 'thinking', 'summary')),
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_logs_user_idx on public.usage_logs (user_id, created_at);
create index if not exists usage_logs_created_idx on public.usage_logs (created_at);

-- ============================================================================
-- Row Level Security — every user only sees their own data.
-- Writes to context_snapshots / usage_logs / agent_configs are done by the
-- server with the service_role key (which bypasses RLS).
-- `(select auth.uid())` is wrapped in a subselect so it is evaluated once.
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.context_snapshots enable row level security;
alter table public.agent_configs enable row level security;
alter table public.usage_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- projects
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- messages (also ensure the project belongs to the user on insert)
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert to authenticated with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- context_snapshots (read own; writes via service role)
drop policy if exists "snapshots_select_own" on public.context_snapshots;
create policy "snapshots_select_own" on public.context_snapshots
  for select to authenticated using ((select auth.uid()) = owner_id);

-- usage_logs (read own; writes via service role)
drop policy if exists "usage_select_own" on public.usage_logs;
create policy "usage_select_own" on public.usage_logs
  for select to authenticated using ((select auth.uid()) = user_id);

-- agent_configs (read by any signed-in user; writes via service role only)
drop policy if exists "agent_configs_select_all" on public.agent_configs;
create policy "agent_configs_select_all" on public.agent_configs
  for select to authenticated using (true);
