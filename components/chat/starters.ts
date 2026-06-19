import { translate, type AppLanguage } from "@/lib/i18n";

/**
 * Quick-start prompts. The home hero shows concrete opening lines a new visitor
 * could actually say (2 build, 2 QA, 1 plan, 1 data); an empty chat (an existing
 * project) leads with task-oriented moves since the user already has context.
 * Each carries a category so the card can show an icon and accent.
 */
export type StarterCat = "build" | "qa" | "plan" | "data";
export type Starter = { cat: StarterCat; label: string; prompt: string };

export function getStarters(
  lang: AppLanguage,
  variant: "home" | "chat" = "home",
): Starter[] {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  if (variant === "chat") {
    return [
      { cat: "plan", label: t("starterBacklogLabel"), prompt: t("starterBacklogPrompt") },
      { cat: "qa", label: t("starterTestsLabel"), prompt: t("starterTestsPrompt") },
      { cat: "data", label: t("starterMetricsLabel"), prompt: t("starterMetricsPrompt") },
      { cat: "build", label: t("starterPrdLabel"), prompt: t("starterPrdPrompt") },
    ];
  }
  return [
    { cat: "build", label: t("starterCalLabel"), prompt: t("starterCalPrompt") },
    { cat: "build", label: t("starterHabitLabel"), prompt: t("starterHabitPrompt") },
    { cat: "qa", label: t("starterCheckoutLabel"), prompt: t("starterCheckoutPrompt") },
    { cat: "qa", label: t("starterLoginLabel"), prompt: t("starterLoginPrompt") },
    { cat: "plan", label: t("starterSprintLabel"), prompt: t("starterSprintPrompt") },
    { cat: "data", label: t("starterChurnLabel"), prompt: t("starterChurnPrompt") },
  ];
}
