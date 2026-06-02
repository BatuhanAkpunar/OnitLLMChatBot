import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL ?? "openai/gpt-4o-mini";

export const SUMMARY_MODEL =
  process.env.OPENROUTER_SUMMARY_MODEL ?? "openai/gpt-4o-mini";
