-- Allow a third conversation mode: "discuss" (roles weigh options/trade-offs).
alter table public.projects drop constraint if exists projects_mode_check;
alter table public.projects
  add constraint projects_mode_check check (mode in ('plan', 'build', 'discuss'));
