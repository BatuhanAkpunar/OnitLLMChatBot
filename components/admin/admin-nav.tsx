"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: [string, string][] = [
  ["/admin", "Dashboard"],
  ["/admin/agents", "Agents"],
  ["/admin/usage", "Usage"],
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {items.map(([href, label]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
