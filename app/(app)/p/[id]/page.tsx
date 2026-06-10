import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { ChatView, type Message, type Agent } from "@/components/chat/chat-view";
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

  const [
    { data: messages },
    { data: agents },
    { data: tasks },
    { data: projects },
    { data: decisions },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, agent_key, content, thinking, status, feedback")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_configs")
      .select("key, display_name, handle, color, description")
      .eq("enabled", true)
      .order("sort_order"),
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
  ]);

  const agentList = (agents ?? []) as Agent[];

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
      user={user}
      projects={projects ?? []}
    />
  );
}
