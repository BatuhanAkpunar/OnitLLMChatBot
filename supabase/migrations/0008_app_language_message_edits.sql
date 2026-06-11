-- R12 (June 2026): app-UI language preference (separate from response
-- language) + user-edited agent messages (plan documents the user revises
-- before pushing to build).
-- Idempotent: safe to re-run.

alter table public.profiles
  add column if not exists app_language text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_app_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_app_language_check
      check (app_language in ('auto', 'tr', 'en'));
  end if;
end $$;

-- Set when the user edits an agent answer in place; the edited content is
-- what flows into all later context windows.
alter table public.messages
  add column if not exists edited_at timestamptz;
