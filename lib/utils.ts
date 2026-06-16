import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn / MagicUI convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
