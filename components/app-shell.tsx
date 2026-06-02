"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { AppSidebar } from "./app-sidebar";
import type { CurrentUser } from "@/lib/auth/user";

type Project = { id: string; title: string; last_message_at: string };

export function AppShell({
  user,
  projects,
  children,
}: {
  user: CurrentUser | null;
  projects: Project[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <AppSidebar user={user} projects={projects} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar shadow-xl">
            <AppSidebar
              user={user}
              projects={projects}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <List size={20} />
          </button>
          <span className="font-semibold tracking-tight">Onit AI</span>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
