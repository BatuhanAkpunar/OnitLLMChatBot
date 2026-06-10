"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
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
    <div className="relative flex h-dvh overflow-hidden">
      {/* desktop: floating glass sidebar */}
      <aside className="relative z-10 hidden w-72 shrink-0 p-3 md:block">
        <div className="glass glass-edge h-full overflow-hidden rounded-3xl">
          <AppSidebar user={user} projects={projects} />
        </div>
      </aside>

      {/* mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 p-3">
            <div className="glass glass-edge relative h-full overflow-hidden rounded-3xl">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <X size={18} />
              </button>
              <AppSidebar
                user={user}
                projects={projects}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="glass inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          >
            <List size={20} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
