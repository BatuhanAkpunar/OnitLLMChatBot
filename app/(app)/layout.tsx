import { getCurrentUser } from "@/lib/auth/user";
import { PublicShell } from "@/components/public-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Signed-out visitors can still see and use the landing composer; the proxy
  // keeps them off /p/[id] and /admin. They get no chat history.
  if (!user) {
    return <PublicShell>{children}</PublicShell>;
  }

  // Signed-in chrome is a single top bar that each page renders itself
  // (overlaid on the hero at home, stacked above the thread in a chat).
  return <div className="relative flex h-dvh flex-col">{children}</div>;
}
