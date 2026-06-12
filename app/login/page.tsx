import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginHero } from "@/components/auth/login-hero";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Production has no login page (the landing's Sign in button covers it);
 * locally this keeps the email/password form used by e2e testing.
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (process.env.NODE_ENV === "production") redirect("/");

  const { error } = await props.searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginHero error={error} configured={isSupabaseConfigured()} showDev />
    </main>
  );
}
