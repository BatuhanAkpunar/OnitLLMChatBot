"use client";

import Link from "next/link";
import { Plus, Command } from "@phosphor-icons/react";
import { OrbMark } from "@/components/brand/orb";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { HistoryButton, type ProjectListItem } from "./history-button";
import { CommandPalette } from "./command-palette";
import { createProject } from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";
import type { CurrentUser } from "@/lib/auth/user";

/**
 * The single piece of chrome for signed-in users: brand on the left, the
 * global actions (New chat, History popup, Profile popup) on the right.
 * Pages can slot extra page-specific tools in via `tools`, and `overlay`
 * floats the bar over hero content (home) instead of stacking above it.
 */
export function TopBar({
  user,
  projects,
  title,
  tools,
  overlay = false,
}: {
  user: CurrentUser | null;
  projects: ProjectListItem[];
  title?: string;
  tools?: React.ReactNode;
  overlay?: boolean;
}) {
  const { t } = useI18n();
  return (
    <header
      className={`z-20 flex h-14 shrink-0 items-center gap-2 px-4 ${
        overlay
          ? "absolute inset-x-0 top-0"
          : "scanlines border-b-2 border-border bg-background/85 backdrop-blur-xl"
      }`}
    >
      <Link
        href="/"
        className="pressable flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1"
      >
        <OrbMark size={22} />
        <span className="font-pixel text-[17px] tracking-tight">onit</span>
      </Link>

      {title ? (
        <>
          <span className="h-5 w-[2px] shrink-0 bg-border" aria-hidden />
          <h1 className="min-w-0 truncate font-pixel text-[13px] tracking-tight text-foreground/85">
            {title}
          </h1>
        </>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {tools}
        <CommandPalette projects={projects} />
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true }),
            )
          }
          title="⌘K"
          className="pressable hidden h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-border bg-card px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <Command size={13} weight="bold" />
          <span className="font-pixel">K</span>
        </button>
        <form action={createProject}>
          <button
            type="submit"
            title={t("newChat")}
            className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-foreground bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={18} weight="bold" />
            <span className="hidden font-pixel sm:inline">{t("newChat")}</span>
          </button>
        </form>
        <HistoryButton projects={projects} />
        <span className="ml-0.5">
          <ProfilePanel user={user} />
        </span>
      </div>
    </header>
  );
}
