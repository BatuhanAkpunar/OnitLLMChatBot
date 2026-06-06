import {
  MagnifyingGlass,
  ChartLineUp,
  Code,
  Kanban,
  PenNib,
  Bug,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

const ICONS: Record<string, Icon> = {
  analyst: MagnifyingGlass,
  product_manager: ChartLineUp,
  developer: Code,
  project_manager: Kanban,
  product_designer: PenNib,
  qa: Bug,
};

// First-person personas give each role an identity the user can connect with.
const PERSONAS: Record<string, string> = {
  analyst: "I turn fuzzy ideas into clear, buildable specs.",
  product_manager: "I decide what's worth building, and why.",
  developer: "I design and build it, cleanly.",
  project_manager: "I keep the work on track and shipping.",
  product_designer: "I make it simple and a joy to use.",
  qa: "I break things before your users do.",
};

export function roleIcon(key: string): Icon {
  return ICONS[key] ?? UsersThree;
}

export function rolePersona(key: string, fallback?: string | null): string {
  return PERSONAS[key] ?? fallback ?? "";
}
