/**
 * Free/Pro plan limits and pricing (Faz F). The `plan` column on profiles is the
 * source of truth; Stripe wiring comes later. Free is capped at a daily message
 * count (derived from messages.owner_id), Pro is unlimited.
 */
export const FREE_DAILY_MESSAGES = 20;
export const PRO_PRICE_USD = 9;

export type Plan = "free" | "pro";

/** UTC start of the current day, used as the daily message window boundary. */
export function startOfDayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Whether a user has hit the Free daily message cap and should be blocked.
 * Pro is never capped; an unknown or missing plan is treated as Free.
 */
export function exceedsFreeDailyLimit(
  plan: string | null | undefined,
  sentToday: number,
): boolean {
  if ((plan ?? "free") === "pro") return false;
  return sentToday >= FREE_DAILY_MESSAGES;
}
