-- R9 (June 2026): per-user response language preference.
-- Idempotent: safe to re-run.

alter table public.profiles
  add column if not exists preferred_language text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('auto', 'tr', 'en'));
  end if;
end $$;
