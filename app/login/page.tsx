import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginHero } from "@/components/auth/login-hero";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await props.searchParams;
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect("/");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginHero
        error={error}
        configured={configured}
        showDev={process.env.NODE_ENV !== "production"}
      />
    </main>
  );
}
