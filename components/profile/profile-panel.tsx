"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  ShieldStar,
  SignOut as SignOutIcon,
  X,
  CaretRight,
} from "@phosphor-icons/react";
import { signOut } from "@/lib/auth/actions";
import {
  getUserStats,
  getLanguageSettings,
  setPreferredLanguage,
  setAppLanguage,
} from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";
import type { CurrentUser } from "@/lib/auth/user";
import type { PreferredLanguage } from "@/lib/ai/guardrails";
import type { AppLanguagePref, I18nKey } from "@/lib/i18n";

const THEMES: { key: string; label: I18nKey; Icon: typeof Sun }[] = [
  { key: "light", label: "themeLight", Icon: Sun },
  { key: "dark", label: "themeDark", Icon: Moon },
  { key: "system", label: "themeAuto", Icon: Monitor },
];

const MODES: { key: string; label: I18nKey }[] = [
  { key: "build", label: "modeBuild" },
  { key: "plan", label: "modePlan" },
  { key: "discuss", label: "modeDiscuss" },
];

const LANG_OPTIONS: { key: "auto" | "tr" | "en"; label: string }[] = [
  { key: "auto", label: "" }, // label resolved via t("langAuto")
  { key: "tr", label: "Türkçe" },
  { key: "en", label: "English" },
];

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
}

export function ProfilePanel({ user }: { user: CurrentUser | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [stats, setStats] = useState<{
    chats: number;
    messages: number;
    tokens: number;
    costUsd: number;
  } | null>(null);
  const [mode, setMode] = useState("build");
  const [replyLang, setReplyLang] = useState<PreferredLanguage | null>(null);
  const [appLang, setAppLang] = useState<AppLanguagePref | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      const m = localStorage.getItem("onit:defaultMode");
      if (m) setMode(m);
    } catch {}
  }, []);
  useEffect(() => {
    if (!open) return;
    setStats(null);
    getUserStats()
      .then(setStats)
      .catch(() => setStats({ chats: 0, messages: 0, tokens: 0, costUsd: 0 }));
    getLanguageSettings()
      .then(({ reply, app }) => {
        setReplyLang(reply);
        setAppLang(app);
      })
      .catch(() => {
        setReplyLang("auto");
        setAppLang("auto");
      });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pickMode(m: string) {
    setMode(m);
    try {
      localStorage.setItem("onit:defaultMode", m);
    } catch {}
  }

  function pickReplyLang(l: PreferredLanguage) {
    setReplyLang(l);
    setPreferredLanguage(l).catch(() => {});
  }

  function pickAppLang(l: AppLanguagePref) {
    setAppLang(l);
    // The server resolves the UI language per request, so refresh to apply.
    setAppLanguage(l)
      .then(() => router.refresh())
      .catch(() => {});
  }

  const name = user?.name ?? user?.email ?? "Guest";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("profileTitle")}
        aria-label={t("profileTitle")}
        className="group rounded-full ring-2 ring-transparent transition-shadow hover:ring-foreground/20"
      >
        <Avatar url={user?.avatarUrl} initial={initial} className="h-9 w-9" />
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div className="pixel-panel relative max-h-[90dvh] w-full max-w-sm overflow-y-auto bg-popover p-5 text-foreground">
                <button
                  type="button"
                  aria-label={t("close")}
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X size={16} />
                </button>

                {/* identity */}
                <div className="flex items-center gap-3">
                  <Avatar
                    url={user?.avatarUrl}
                    initial={initial}
                    className="h-12 w-12 text-base"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">
                        {name}
                      </span>
                      {user?.isAdmin ? (
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    {user?.email ? (
                      <div className="truncate text-[13px] text-muted-foreground">
                        {user.email}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* preferences: aligned label + segmented control rows */}
                <div className="mt-5 space-y-1">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("preferences")}
                  </div>

                  <PrefRow label={t("theme")}>
                    <Segmented>
                      {THEMES.map(({ key, label, Icon }) => (
                        <SegBtn
                          key={key}
                          active={mounted && theme === key}
                          onClick={() => setTheme(key)}
                          title={t(label)}
                        >
                          <Icon
                            size={14}
                            weight={
                              mounted && theme === key ? "fill" : "regular"
                            }
                          />
                          <span className="hidden sm:inline">{t(label)}</span>
                        </SegBtn>
                      ))}
                    </Segmented>
                  </PrefRow>

                  <PrefRow label={t("defaultMode")}>
                    <Segmented>
                      {MODES.map((m) => (
                        <SegBtn
                          key={m.key}
                          active={mode === m.key}
                          onClick={() => pickMode(m.key)}
                        >
                          {t(m.label)}
                        </SegBtn>
                      ))}
                    </Segmented>
                  </PrefRow>

                  <PrefRow label={t("appLanguage")}>
                    <Segmented>
                      {LANG_OPTIONS.map((l) => (
                        <SegBtn
                          key={l.key}
                          active={appLang === l.key}
                          onClick={() => pickAppLang(l.key)}
                          disabled={appLang === null}
                        >
                          {l.key === "auto" ? t("langAuto") : l.label}
                        </SegBtn>
                      ))}
                    </Segmented>
                  </PrefRow>

                  <PrefRow label={t("repliesIn")}>
                    <Segmented>
                      {LANG_OPTIONS.map((l) => (
                        <SegBtn
                          key={l.key}
                          active={replyLang === l.key}
                          onClick={() => pickReplyLang(l.key)}
                          disabled={replyLang === null}
                        >
                          {l.key === "auto" ? t("langAuto") : l.label}
                        </SegBtn>
                      ))}
                    </Segmented>
                  </PrefRow>
                </div>

                {/* usage: one quiet strip, not four boxes */}
                <div className="mt-5">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("usage")}
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-border rounded-xl border-[1.5px] border-border bg-muted/30 py-2.5">
                    <Stat
                      label={t("statChats")}
                      value={stats ? fmt(stats.chats) : "·"}
                    />
                    <Stat
                      label={t("statMessages")}
                      value={stats ? fmt(stats.messages) : "·"}
                    />
                    <Stat
                      label={t("statTokens")}
                      value={stats ? fmt(stats.tokens) : "·"}
                    />
                    <Stat
                      label={t("statCost")}
                      value={
                        stats
                          ? `$${stats.costUsd.toFixed(stats.costUsd < 1 ? 3 : 2)}`
                          : "·"
                      }
                    />
                  </div>
                </div>

                {/* account */}
                <div className="mt-5 border-t border-border pt-3">
                  {user?.isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <ShieldStar
                        size={16}
                        weight="bold"
                        className="text-muted-foreground"
                      />
                      {t("adminPanel")}
                      <CaretRight
                        size={13}
                        className="ml-auto text-muted-foreground"
                      />
                    </Link>
                  ) : null}
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <SignOutIcon size={16} weight="bold" />
                      {t("signOut")}
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PrefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[13px] text-foreground/75">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border-[1.5px] border-border bg-background/60 p-0.5">
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`pressable inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Avatar({
  url,
  initial,
  className,
}: {
  url?: string | null;
  initial: string;
  className: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-border`}
      />
    );
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-foreground/80 to-foreground/50 text-sm font-semibold text-background`}
    >
      {initial}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 text-center">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
