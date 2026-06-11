"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClockCounterClockwise,
  ChatCircleDots,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Plus,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createProject,
  renameProject,
  deleteProject,
  searchProjects,
  type ProjectHit,
} from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";

export type ProjectListItem = {
  id: string;
  title: string;
  last_message_at: string;
};

const GROUPS = ["groupToday", "groupYesterday", "groupWeek", "groupOlder"] as const;

function groupOf(dateStr: string): (typeof GROUPS)[number] {
  const d = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (d >= startToday) return "groupToday";
  if (d >= startYesterday) return "groupYesterday";
  if (d >= sevenDaysAgo) return "groupWeek";
  return "groupOlder";
}

/**
 * Chat history as a popup: a labeled top-bar button that opens a centered
 * modal with search, date groups and rename/delete per chat. Replaces the
 * old persistent sidebar.
 */
export function HistoryButton({ projects = [] }: { projects?: ProjectListItem[] }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProjectHit[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Full-text search kicks in from 3 chars; shorter queries filter titles only.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setHits(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setHits(await searchProjects(q));
      } catch {
        setHits([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  function close() {
    setOpen(false);
    setQuery("");
    setRenamingId(null);
  }

  const q = query.trim().toLowerCase();
  const filtered: ProjectListItem[] = (() => {
    if (!q) return projects;
    const map = new Map<string, ProjectListItem>();
    for (const p of projects) {
      if (p.title.toLowerCase().includes(q)) map.set(p.id, p);
    }
    for (const h of hits ?? []) if (!map.has(h.id)) map.set(h.id, h);
    return [...map.values()];
  })();

  async function commitRename(id: string) {
    const v = renameValue.trim();
    setRenamingId(null);
    if (!v) return;
    const res = await renameProject(id, v);
    if (res.ok) {
      toast.success(t("chatRenamed"));
      router.refresh();
    } else {
      toast.error(t("renameFailed"));
    }
  }

  function confirmDelete(p: ProjectListItem) {
    toast(t("deleteAsk", { title: p.title }), {
      action: {
        label: t("delete"),
        onClick: async () => {
          const res = await deleteProject(p.id);
          if (res.ok) {
            toast.success(t("chatDeleted"));
            if (pathname === `/p/${p.id}`) router.push("/");
            else router.refresh();
          } else {
            toast.error(t("deleteFailed"));
          }
        },
      },
      cancel: { label: t("cancel"), onClick: () => {} },
    });
  }

  function Row({ p }: { p: ProjectListItem }) {
    const active = pathname === `/p/${p.id}`;
    if (renamingId === p.id) {
      return (
        <li>
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => commitRename(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(p.id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
        </li>
      );
    }
    return (
      <li className="group/row relative">
        <Link
          href={`/p/${p.id}`}
          onClick={close}
          className={`flex items-center gap-2.5 rounded-xl py-2 pl-3 pr-16 text-sm transition-colors ${
            active
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          <ChatCircleDots size={15} className="shrink-0 opacity-70" />
          <span className="flex-1 truncate">{p.title}</span>
        </Link>
        <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
          <button
            type="button"
            aria-label={t("renameChat")}
            title={t("rename")}
            onClick={() => {
              setRenameValue(p.title);
              setRenamingId(p.id);
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PencilSimple size={14} />
          </button>
          <button
            type="button"
            aria-label={t("deleteChat")}
            title={t("delete")}
            onClick={() => confirmDelete(p)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash size={14} />
          </button>
        </span>
      </li>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("historyTitle")}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ClockCounterClockwise size={18} />
        <span className="hidden sm:inline">{t("history")}</span>
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={close}
                aria-hidden
              />
              <div className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border p-3">
                  <div className="relative flex-1">
                    <MagnifyingGlass
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("searchChats")}
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/15"
                    />
                  </div>
                  <form action={createProject}>
                    <button
                      type="submit"
                      onClick={close}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Plus size={15} weight="bold" />
                      {t("new")}
                    </button>
                  </form>
                  <button
                    type="button"
                    aria-label={t("close")}
                    onClick={close}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {filtered.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                      {q ? t("noChatsFound") : t("noChatsYet")}
                    </p>
                  ) : q ? (
                    <ul className="space-y-0.5">
                      {filtered.map((p) => (
                        <Row key={p.id} p={p} />
                      ))}
                    </ul>
                  ) : (
                    GROUPS.map((g) => {
                      const items = projects.filter(
                        (p) => groupOf(p.last_message_at) === g,
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={g} className="mb-3">
                          <div className="px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {t(g)}
                          </div>
                          <ul className="space-y-0.5">
                            {items.map((p) => (
                              <Row key={p.id} p={p} />
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
