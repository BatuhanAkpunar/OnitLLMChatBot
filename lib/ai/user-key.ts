import { cookies } from "next/headers";

/**
 * Bring-your-own-key storage. The user's Gemini API key lives in an httpOnly
 * cookie: the browser cannot read it back (XSS cannot exfiltrate it), but it is
 * sent with every same-origin request, so any server call can authenticate the
 * Gemini request with it. Never logged, never persisted to the database.
 */
export const GEMINI_KEY_COOKIE = "onit_gk";

/** The user's Gemini key for the current request, or undefined if none set. */
export async function getUserGeminiKey(): Promise<string | undefined> {
  try {
    const v = (await cookies()).get(GEMINI_KEY_COOKIE)?.value;
    return v && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A Google AI Studio key: legacy keys look like "AIza...", newer ones like
 * "AQ.Ab8...". We only sanity-check shape (no whitespace, plausible length) and
 * let the real Gemini call reject a wrong key, rather than risk rejecting a
 * valid one with an over-strict prefix rule.
 */
export function looksLikeGeminiKey(key: string): boolean {
  const k = (key ?? "").trim();
  return k.length >= 20 && k.length <= 100 && /^[A-Za-z0-9._-]+$/.test(k);
}
