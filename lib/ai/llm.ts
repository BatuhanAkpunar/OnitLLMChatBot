import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Bring-your-own-key: the deployed app has NO server Gemini key. Each request
 * carries the user's own key (stored server-side in an httpOnly cookie, read via
 * getUserGeminiKey and passed into `llm`). `process.env.GEMINI_API_KEY` is only a
 * fallback for local dev / self-hosting; production leaves it unset.
 */
function clientFor(apiKey?: string) {
  return createGoogleGenerativeAI({
    apiKey:
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      "",
  });
}

/** Env-based client, used only by the dev routing eval. */
export const google = clientFor();

export const DEFAULT_MODEL =
  process.env.GEMINI_DEFAULT_MODEL ?? "gemini-2.5-flash";

/** Lightweight model for routing, titles and summaries. */
export const SUMMARY_MODEL =
  process.env.GEMINI_SUMMARY_MODEL ?? "gemini-2.5-flash";

/** A DIFFERENT model used when the primary errors or times out mid-request. */
export const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.0-flash";

/**
 * Build a model handle for `model`, authenticated with the caller's `apiKey`
 * (the user's own Gemini key). Legacy agent rows may still hold OpenRouter ids
 * ("openai/gpt-4o-mini"); those fall back to the default Gemini model.
 */
export function llm(model: string, apiKey?: string) {
  return clientFor(apiKey)(model.includes("/") ? DEFAULT_MODEL : model);
}

/**
 * Disable Gemini thinking on short utility calls: a reasoning model would
 * burn a tight maxOutputTokens budget on thoughts and return empty text.
 */
export const NO_THINKING = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
} as const;
