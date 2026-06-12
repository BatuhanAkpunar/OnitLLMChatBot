import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isAdmin) redirect("/");

  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
          <Link href="/admin" className="shrink-0 text-sm font-semibold">
            Onit AI <span className="text-muted-foreground">· Admin</span>
          </Link>
          <div className="flex-1">
            <AdminNav />
          </div>
          <Link
            href="/"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to app
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
