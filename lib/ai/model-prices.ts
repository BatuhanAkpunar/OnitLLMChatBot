// USD per 1M tokens (input, output) for the models we expose. Prices are
// Google AI Studio list prices; unknown models cost 0 so logging never breaks.
const PRICES: Record<string, { input: number; output: number }> = {
  "gemini-3.5-flash": { input: 1.5, output: 9 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
};

/** Models offered in the admin per-role model picker. */
export const MODEL_CHOICES = Object.keys(PRICES);

export function modelCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Legacy logs may carry an old web-search suffix ("model:online").
  const base = model.replace(/:online$/, "");
  const p = PRICES[base];
  if (!p) return 0;
  return (
    (promptTokens / 1_000_000) * p.input +
    (completionTokens / 1_000_000) * p.output
  );
}
