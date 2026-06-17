import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginHero } from "@/components/auth/login-hero";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * There is no login page: the landing's Sign in button covers production. This
 * route always redirects to "/", except for a dev-only e2e backdoor at
 * `/login?dev=1` (never available in production).
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; dev?: string }>;
}) {
  const { error, dev } = await props.searchParams;
  if (process.env.NODE_ENV === "production" || dev !== "1") redirect("/");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginHero error={error} configured={isSupabaseConfigured()} showDev />
    </main>
  );
}
