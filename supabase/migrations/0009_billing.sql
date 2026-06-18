-- Faz F (June 2026): Free/Pro plan. Free has a daily message cap; Pro is
-- unlimited. The daily count is derived from messages.owner_id at request time,
-- so no counter column is needed. Idempotent: safe to re-run.

alter table public.profiles
  add column if not exists plan text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check
      check (plan in ('free', 'pro'));
  end if;
end $$;
