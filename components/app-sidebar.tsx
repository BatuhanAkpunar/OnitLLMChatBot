"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  ChatCircleDots,
  MagnifyingGlass,
  DotsThree,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { ProfilePanel } from "@/components/profile/profile-panel";
import {
  createProject,
  renameProject,
  deleteProject,
  searchProjects,
  type ProjectHit,
} from "@/app/(app)/actions";
import type { CurrentUser } from "@/lib/auth/user";

type Project = { id: string; title: string; last_message_at: string };

const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

function groupOf(dateStr: string): (typeof GROUPS)[number] {
  const d = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (d >= startToday) return "Today";
  if (d >= startYesterday) return "Yesterday";
  if (d >= sevenDaysAgo) return "Previous 7 days";
  return "Older";
}

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProjectHit[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

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
    if (!menuId) return;
    const close = () => setMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuId]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const q = query.trim().toLowerCase();
  const filtered: Project[] = (() => {
    if (!q) return projects;
    const map = new Map<string, Project>();
    for (const p of projects) {
      if (p.title.toLowerCase().includes(q)) map.set(p.id, p);
    }
    for (const h of hits ?? []) if (!map.has(h.id)) map.set(h.id, h);
    return [...map.values()];
  })();

  function startRename(p: Project) {
    setMenuId(null);
    setRenameValue(p.title);
    setRenamingId(p.id);
  }

  async function commitRename(id: string) {
    const v = renameValue.trim();
    setRenamingId(null);
    if (!v) return;
    const res = await renameProject(id, v);
    if (res.ok) {
      toast.success("Chat renamed");
      router.refresh();
    } else {
      toast.error("Could not rename chat");
    }
  }

  function confirmDelete(p: Project) {
    setMenuId(null);
    toast(`Delete "${p.title}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          const res = await deleteProject(p.id);
          if (res.ok) {
            toast.success("Chat deleted");
            if (pathname === `/p/${p.id}`) router.push("/");
            else router.refresh();
          } else {
            toast.error("Could not delete chat");
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }

  function Row({ p }: { p: Project }) {
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
            className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
        </li>
      );
    }
    return (
      <li className="group/row relative">
        <Link
          href={`/p/${p.id}`}
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors ${
            active
              ? "bg-white/15 font-medium text-foreground"
              : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
          }`}
        >
          <ChatCircleDots size={15} className="shrink-0 opacity-70" />
          <span className="flex-1 truncate">{p.title}</span>
        </Link>
        <button
          type="button"
          aria-label="Chat options"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuId(menuId === p.id ? null : p.id);
          }}
          className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/15 hover:text-foreground group-hover/row:opacity-100 ${
            menuId === p.id ? "opacity-100" : ""
          }`}
        >
          <DotsThree size={16} weight="bold" />
        </button>
        {menuId === p.id ? (
          <div
            className="glass-strong absolute right-1 top-9 z-20 w-36 overflow-hidden rounded-xl py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => startRename(p)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
            >
              <PencilSimple size={14} />
              Rename
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(p)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash size={14} />
              Delete
            </button>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="h-6" />

      <div className="px-3">
        <form action={createProject}>
          <button
            type="submit"
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-3 py-2.5 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus size={16} weight="bold" />
            New chat
          </button>
        </form>
      </div>

      <div className="mt-3 px-3">
        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-9 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:bg-white/10"
          />
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            {q ? "No chats found." : "No chats yet."}
          </p>
        ) : q ? (
          <ul className="space-y-0.5">
            {filtered.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          GROUPS.map((g) => {
            const items = projects.filter((p) => groupOf(p.last_message_at) === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="mb-4">
                <div className="px-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {g}
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

      <div className="border-t border-white/10 p-3">
        <ProfilePanel user={user} />
      </div>
    </div>
  );
}
