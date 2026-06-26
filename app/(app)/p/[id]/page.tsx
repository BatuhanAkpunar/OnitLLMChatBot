import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { resolveAppLanguage } from "@/lib/i18n-server";
import { getAgentRoster } from "@/lib/agents-roster";
import { ChatView, type Message } from "@/components/chat/chat-view";
import type { ProjectTask, ProjectDecision } from "@/app/(app)/actions";

export default async function ProjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, last_agent_key, mode, rules")
    .eq("id", id)
    .single();
  if (!project) notFound();

  // Everything below is independent: one parallel round-trip instead of six.
  const [
    { data: messages },
    agentList,
    { data: tasks },
    { data: projects },
    { data: decisions },
    { data: profile },
    appLang,
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, agent_key, content, thinking, status, feedback, edited_at, kind")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    getAgentRoster(),
    supabase
      .from("project_tasks")
      .select("id, role_key, task, done_criteria, status, sort")
      .eq("project_id", id)
      .order("sort"),
    supabase
      .from("projects")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false }),
    supabase
      .from("project_decisions")
      .select(
        "id, title, status, context, because, despite, constraints, scope_roles, created_at",
      )
      .eq("project_id", id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(50),
    user
      ? supabase
          .from("profiles")
          .select("preferred_language")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    resolveAppLanguage(),
  ]);

  // Conversation language: explicit reply preference wins; otherwise follow
  // the app-UI language (so coordinator labels match what the user reads).
  const convLang =
    profile?.preferred_language === "tr" || profile?.preferred_language === "en"
      ? profile.preferred_language
      : appLang;

  return (
    <ChatView
      projectId={project.id}
      title={project.title}
      agents={agentList}
      initialMessages={(messages ?? []) as Message[]}
      defaultAgentKey={project.last_agent_key ?? agentList[0]?.key ?? "analyst"}
      initialMode={
        project.mode === "plan"
          ? "plan"
          : project.mode === "discuss"
            ? "discuss"
            : "build"
      }
      initialRules={project.rules ?? ""}
      initialTasks={(tasks ?? []) as ProjectTask[]}
      initialDecisions={(decisions ?? []) as ProjectDecision[]}
      lang={convLang}
      user={user}
      projects={projects ?? []}
    />
  );
}
