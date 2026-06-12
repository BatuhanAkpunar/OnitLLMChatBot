import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { AppLanguage } from "@/lib/i18n";

export const LANG_COOKIE = "onit_lang";

/**
 * Resolves the app-UI language for this request, in priority order:
 * 1. the signed-in user's explicit choice (profiles.app_language),
 * 2. the onit_lang cookie (anonymous visitors' header toggle; also mirrored
 *    when a signed-in user saves a preference, so it survives sign-out),
 * 3. the browser's Accept-Language.
 */
export async function resolveAppLanguage(): Promise<AppLanguage> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("app_language")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.app_language === "tr" || data?.app_language === "en") {
        return data.app_language;
      }
    }
  } catch {
    // fall through to cookie/header detection
  }
  try {
    const c = await cookies();
    const v = c.get(LANG_COOKIE)?.value;
    if (v === "tr" || v === "en") return v;
  } catch {}
  try {
    const h = await headers();
    const accept = (h.get("accept-language") ?? "").toLowerCase();
    // The first language tag is the browser's primary preference.
    if (accept.trim().startsWith("tr") || /(^|,)\s*tr\b/.test(accept.split(",")[0] ?? "")) {
      return "tr";
    }
  } catch {}
  return "en";
}
