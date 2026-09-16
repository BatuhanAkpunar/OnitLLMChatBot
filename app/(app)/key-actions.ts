"use server";

import { cookies } from "next/headers";
import { GEMINI_KEY_COOKIE, looksLikeGeminiKey } from "@/lib/ai/user-key";

/**
 * Save the user's own Gemini API key into an httpOnly cookie. The key is never
 * stored in the database and never sent back to the browser after this call.
 */
export async function saveGeminiKey(
  key: string,
): Promise<{ ok: boolean; error?: "invalid" }> {
  const k = (key ?? "").trim();
  if (!looksLikeGeminiKey(k)) return { ok: false, error: "invalid" };
  (await cookies()).set(GEMINI_KEY_COOKIE, k, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return { ok: true };
}

/** Forget the stored key. */
export async function clearGeminiKey(): Promise<{ ok: boolean }> {
  (await cookies()).delete(GEMINI_KEY_COOKIE);
  return { ok: true };
}

/** Whether a key is currently stored (the value itself is never returned). */
export async function geminiKeyStatus(): Promise<{ set: boolean }> {
  const v = (await cookies()).get(GEMINI_KEY_COOKIE)?.value;
  return { set: Boolean(v && v.trim()) };
}
