import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatView, type Message, type Agent } from "@/components/chat/chat-view";

export default async function ProjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, last_agent_key, mode")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [{ data: messages }, { data: agents }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, agent_key, content, thinking, status")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_configs")
      .select("key, display_name, handle, color, description")
      .eq("enabled", true)
      .order("sort_order"),
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
    />
  );
}
