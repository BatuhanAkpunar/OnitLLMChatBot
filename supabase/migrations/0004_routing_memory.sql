-- Routing memory: remembers which roles a user assigned for which kind of
-- request, so Onit's auto-routing can learn the user's preferences over time.
-- Written/read only by the service-role client (RLS on, no policies).
create table if not exists public.routing_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null,
  roles text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'auto')),
  created_at timestamptz not null default now()
);
create index if not exists routing_memory_user_idx
  on public.routing_memory (user_id, created_at desc);

alter table public.routing_memory enable row level security;
