"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  ShieldStar,
  SignOut as SignOutIcon,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { ThemeToggle } from "./theme-toggle";
import { signOut } from "@/lib/auth/actions";
import { createProject } from "@/app/(app)/actions";
import type { CurrentUser } from "@/lib/auth/user";

type Project = { id: string; title: string; last_message_at: string };

export function AppSidebar({
  user,
  projects = [],
  onNavigate,
}: {
  user: CurrentUser | null;
  projects?: Project[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const initial = (user?.name ?? user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          O
        </div>
        <span className="font-semibold tracking-tight">Onit AI</span>
      </div>

      <div className="px-3">
        <form action={createProject}>
          <button
            type="submit"
            onClick={onNavigate}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus size={16} weight="bold" />
            New chat
          </button>
        </form>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-3">
        <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Projects
        </div>
        {projects.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const active = pathname === `/p/${p.id}`;
              return (
                <li key={p.id}>
                  <Link
                    href={`/p/${p.id}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <ChatCircleDots size={15} className="shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {user?.name ?? user?.email ?? "Not signed in"}
            </div>
            {user?.email ? (
              <div className="truncate text-xs text-muted-foreground">
                {user.email}
              </div>
            ) : null}
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-2 flex items-center gap-2">
          {user?.isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ShieldStar size={15} weight="bold" />
              Admin
            </Link>
          ) : null}
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <SignOutIcon size={15} weight="bold" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
