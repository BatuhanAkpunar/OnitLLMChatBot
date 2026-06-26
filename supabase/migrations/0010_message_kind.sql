-- Tag coordinator messages so the UI can tell Onit's synthesis ("wrap-up")
-- apart from plan drafts and clarify questions. Used to render a multi-role
-- run as ONE headline answer (the synthesis) with the teammate outputs
-- collapsed beneath it, instead of a wall of parallel role blocks.
alter table messages add column if not exists kind text;
