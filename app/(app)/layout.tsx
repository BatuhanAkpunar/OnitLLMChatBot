import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Signed-out visitors can still see and use the landing composer; the proxy
  // keeps them off /p/[id] and /admin. They get no sidebar or chat history.
  if (!user) {
    return <PublicShell>{children}</PublicShell>;
  }

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, last_message_at")
    .order("last_message_at", { ascending: false });

  return (
    <AppShell user={user} projects={projects ?? []}>
      {children}
    </AppShell>
  );
}
