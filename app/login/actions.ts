"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the Google OAuth URL for the client to navigate to. We do NOT call
// redirect() here: redirecting to an external URL from a server action is
// unreliable (it can surface as a generic error boundary). The client does
// window.location with the returned url instead.
export async function signInWithGoogle(): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  if (data.url) return { url: data.url };
  return { error: "Could not start sign-in. Please try again." };
}

// Local-only email/password sign-in for development testing (Google stays the
// only method in production).
export async function signInWithDevPassword(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    redirect("/?error=Dev+sign-in+is+disabled+in+production");
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}
