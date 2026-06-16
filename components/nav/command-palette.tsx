"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MagnifyingGlass,
  Plus,
  Moon,
  SunDim,
  Translate,
  House,
  ChatCircleDots,
  ArrowElbowDownLeft,
} from "@phosphor-icons/react";
import { createProjectAndGetId, setAppLanguage } from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";
import type { ProjectListItem } from "@/components/nav/history-button";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  keywords?: string;
};

/**
 * ⌘K command palette — the power-user spine. Open from anywhere with ⌘K /
 * Ctrl+K: new chat, jump to a conversation, flip theme/language, go home.
 * Keyboard-first; arrow keys + Enter.
 */
export function CommandPalette({ projects = [] }: { projects?: ProjectListItem[] }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  const actions: Cmd[] = useMemo(() => {
    return [
      {
        id: "new",
        label: t("cmdNewChat"),
        icon: <Plus size={16} weight="bold" />,
        keywords: "new chat yeni sohbet",
        run: async () => {
          close();
          const { id } = await createProjectAndGetId();
          if (id) router.push(`/p/${id}`);
        },
      },
      {
        id: "home",
        label: t("cmdHome"),
        icon: <House size={16} weight="bold" />,
        keywords: "home anasayfa",
        run: () => {
          close();
          router.push("/");
        },
      },
      {
        id: "theme",
        label: t("cmdTheme"),
        hint: resolvedTheme === "dark" ? "→ light" : "→ dark",
        icon: resolvedTheme === "dark" ? <SunDim size={16} /> : <Moon size={16} />,
        keywords: "theme tema dark light karanlık",
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          close();
        },
      },
      {
        id: "lang",
        label: t("cmdLanguage"),
        hint: lang === "tr" ? "→ EN" : "→ TR",
        icon: <Translate size={16} />,
        keywords: "language dil türkçe english",
        run: async () => {
          close();
          await setAppLanguage(lang === "tr" ? "en" : "tr");
          router.refresh();
        },
      },
    ];
  }, [t, lang, resolvedTheme, router, setTheme]);

  const q = query.trim().toLowerCase();
  const projHits: Cmd[] = projects
    .filter((p) => !q || p.title.toLowerCase().includes(q))
    .slice(0, 6)
    .map((p) => ({
      id: `p-${p.id}`,
      label: p.title,
      icon: <ChatCircleDots size={16} className="opacity-70" />,
      keywords: p.title.toLowerCase(),
      run: () => {
        close();
        router.push(`/p/${p.id}`);
      },
    }));

  const actHits = actions.filter(
    (a) => !q || a.label.toLowerCase().includes(q) || a.keywords?.includes(q),
  );
  const all = [...actHits, ...projHits];
  const clampedActive = Math.min(active, Math.max(0, all.length - 1));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, all.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + all.length) % Math.max(1, all.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      all[clampedActive]?.run();
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[14vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden />
      <div className="pixel-panel relative w-full max-w-lg overflow-hidden bg-popover p-0">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <MagnifyingGlass size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("cmdPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-pixel text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {all.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("cmdEmpty")}
            </p>
          ) : (
            <>
              {actHits.length ? (
                <div className="px-2.5 pb-1 pt-2 font-pixel text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("cmdActions")}
                </div>
              ) : null}
              {actHits.map((c) => (
                <Row key={c.id} c={c} active={all[clampedActive]?.id === c.id} onHover={() => setActive(all.indexOf(c))} />
              ))}
              {projHits.length ? (
                <div className="px-2.5 pb-1 pt-2.5 font-pixel text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("cmdChats")}
                </div>
              ) : null}
              {projHits.map((c) => (
                <Row key={c.id} c={c} active={all[clampedActive]?.id === c.id} onHover={() => setActive(all.indexOf(c))} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ c, active, onHover }: { c: Cmd; active: boolean; onHover: () => void }) {
  return (
    <button
      type="button"
      onClick={c.run}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
        active ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      <span className="text-foreground/80">{c.icon}</span>
      <span className="min-w-0 flex-1 truncate">{c.label}</span>
      {c.hint ? <span className="font-mono text-[11px] text-muted-foreground">{c.hint}</span> : null}
      {active ? (
        <ArrowElbowDownLeft size={13} className="shrink-0 text-muted-foreground" />
      ) : null}
    </button>
  );
}
