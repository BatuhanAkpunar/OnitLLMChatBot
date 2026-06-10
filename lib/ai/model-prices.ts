// USD per 1M tokens (input, output) for the models we expose. Prices are
// OpenRouter list prices; unknown models cost 0 so logging never breaks.
const PRICES: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "anthropic/claude-3.5-haiku": { input: 0.8, output: 4 },
  "anthropic/claude-sonnet-4": { input: 3, output: 15 },
  "google/gemini-2.0-flash-001": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.12, output: 0.3 },
};

/** Models offered in the admin per-role model picker. */
export const MODEL_CHOICES = Object.keys(PRICES);

export function modelCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // The web-search variant ("model:online") prices like its base model.
  const base = model.replace(/:online$/, "");
  const p = PRICES[base];
  if (!p) return 0;
  return (
    (promptTokens / 1_000_000) * p.input +
    (completionTokens / 1_000_000) * p.output
  );
}
