import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

/**
 * Resolves the signed-in user from verified JWT claims, or null.
 * Returns null when Supabase isn't configured (local dev placeholders).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims as {
    sub?: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };

  const email = claims.email ?? null;
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

  return {
    id: claims.sub ?? "",
    email,
    name: claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? null,
    avatarUrl:
      claims.user_metadata?.avatar_url ?? claims.user_metadata?.picture ?? null,
    isAdmin: Boolean(email && email.toLowerCase() === adminEmail),
  };
});
