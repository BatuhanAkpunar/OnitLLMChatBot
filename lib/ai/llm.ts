import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** Gemini via Google AI Studio (GEMINI_API_KEY). */
export const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    "",
});

// gemini-3.5-flash is the newest model but is frequently overloaded (503
// "high demand"), which left users with empty answers. We default to the
// stable, generally-available gemini-2.5-flash and fall back to gemini-2.0-flash
// if it ever errors, so the app keeps working through any single-model outage.
// All overridable via env.
export const DEFAULT_MODEL =
  process.env.GEMINI_DEFAULT_MODEL ?? "gemini-2.5-flash";

/** Lightweight model for thinking bubbles, titles and summaries. */
export const SUMMARY_MODEL =
  process.env.GEMINI_SUMMARY_MODEL ?? "gemini-2.5-flash";

/** A DIFFERENT model used when the primary errors or times out mid-request. */
export const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.0-flash";

/** Legacy agent rows may still hold OpenRouter ids ("openai/gpt-4o-mini"). */
export function llm(model: string) {
  return google(model.includes("/") ? DEFAULT_MODEL : model);
}

/**
 * Disable Gemini thinking on short utility calls: a reasoning model would
 * burn a tight maxOutputTokens budget on thoughts and return empty text.
 */
export const NO_THINKING = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
} as const;
