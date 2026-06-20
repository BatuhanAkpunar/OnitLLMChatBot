import { translate, type AppLanguage } from "@/lib/i18n";

/**
 * Quick-start prompts shown as small chips after a lead-in line. The home hero
 * offers concrete opening lines a new visitor could say (2 build, 2 QA, 1 plan,
 * 1 data); an empty chat (an existing project) leads with task-oriented moves
 * since the user already has context. The chip shows a short label; clicking it
 * inserts the fuller prompt.
 */
export type Starter = { label: string; prompt: string };

export function getStarters(
  lang: AppLanguage,
  variant: "home" | "chat" = "home",
): Starter[] {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  if (variant === "chat") {
    return [
      { label: t("starterBacklogLabel"), prompt: t("starterBacklogPrompt") },
      { label: t("starterTestsLabel"), prompt: t("starterTestsPrompt") },
      { label: t("starterMetricsLabel"), prompt: t("starterMetricsPrompt") },
      { label: t("starterPrdLabel"), prompt: t("starterPrdPrompt") },
    ];
  }
  return [
    { label: t("starterCalLabel"), prompt: t("starterCalPrompt") },
    { label: t("starterHabitLabel"), prompt: t("starterHabitPrompt") },
    { label: t("starterCheckoutLabel"), prompt: t("starterCheckoutPrompt") },
    { label: t("starterLoginLabel"), prompt: t("starterLoginPrompt") },
    { label: t("starterSprintLabel"), prompt: t("starterSprintPrompt") },
    { label: t("starterChurnLabel"), prompt: t("starterChurnPrompt") },
  ];
}
