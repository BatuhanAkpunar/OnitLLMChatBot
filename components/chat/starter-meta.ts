import { Cube, Bug, Kanban, ChartLineUp, type Icon } from "@phosphor-icons/react";
import type { StarterCat } from "./starters";
import type { I18nKey } from "@/lib/i18n";

/** Per-category icon, accent color, and short tag for the starter cards. */
export const STARTER_META: Record<
  StarterCat,
  { Icon: Icon; tag: I18nKey; color: string }
> = {
  build: { Icon: Cube, tag: "catBuild", color: "#8b5cf6" },
  qa: { Icon: Bug, tag: "catQa", color: "#10b981" },
  plan: { Icon: Kanban, tag: "catPlan", color: "#f59e0b" },
  data: { Icon: ChartLineUp, tag: "catData", color: "#38bdf8" },
};
