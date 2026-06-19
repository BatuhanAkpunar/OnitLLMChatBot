import { translate, type AppLanguage } from "@/lib/i18n";

/**
 * Quick-start prompts. The home hero shows concrete app ideas to get a brand-new
 * visitor going; an empty chat (an existing project) leads with product tasks
 * since the user already has context.
 */
export type Starter = { label: string; prompt: string };

export function getStarters(
  lang: AppLanguage,
  variant: "home" | "chat" = "home",
): Starter[] {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  if (variant === "chat") {
    return [
      { label: t("starterPrdLabel"), prompt: t("starterPrdPrompt") },
      { label: t("starterTestsLabel"), prompt: t("starterTestsPrompt") },
      { label: t("starterProblemLabel"), prompt: t("starterProblemPrompt") },
      { label: t("starterFlowLabel"), prompt: t("starterFlowPrompt") },
    ];
  }
  return [
    { label: t("starterCalorieLabel"), prompt: t("starterCaloriePrompt") },
    { label: t("starterVacationLabel"), prompt: t("starterVacationPrompt") },
    { label: t("starterMealLabel"), prompt: t("starterMealPrompt") },
    { label: t("starterHabitLabel"), prompt: t("starterHabitPrompt") },
    { label: t("starterPrdLabel"), prompt: t("starterPrdPrompt") },
    { label: t("starterTestsLabel"), prompt: t("starterTestsPrompt") },
  ];
}
