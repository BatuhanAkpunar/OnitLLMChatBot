import { translate, type AppLanguage } from "@/lib/i18n";

/**
 * Quick-start prompts shown on the home hero and the empty chat state.
 * Each is a sentence the user completes, so the request arrives with intent
 * already shaped (and the matching skill's trigger words already present).
 */
export type Starter = { label: string; prompt: string };

export function getStarters(lang: AppLanguage): Starter[] {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  return [
    { label: t("starterCalorieLabel"), prompt: t("starterCaloriePrompt") },
    { label: t("starterVacationLabel"), prompt: t("starterVacationPrompt") },
    { label: t("starterMealLabel"), prompt: t("starterMealPrompt") },
    { label: t("starterHabitLabel"), prompt: t("starterHabitPrompt") },
    { label: t("starterPrdLabel"), prompt: t("starterPrdPrompt") },
    { label: t("starterTestsLabel"), prompt: t("starterTestsPrompt") },
  ];
}
