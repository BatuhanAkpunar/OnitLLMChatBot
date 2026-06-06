"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
import { getUserStats } from "@/app/(app)/actions";
import type { CurrentUser } from "@/lib/auth/user";

const THEMES = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
  { key: "system", label: "System", Icon: Monitor },
];

const MODES = [
  { key: "build", label: "Build" },
  { key: "plan", label: "Plan" },
  { key: "discuss", label: "Discuss" },
];

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
}

export function ProfilePanel({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [stats, setStats] = useState<{
    chats: number;
    messages: number;
    tokens: number;
  } | null>(null);
  const [mode, setMode] = useState("build");

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
      .catch(() => setStats({ chats: 0, messages: 0, tokens: 0 }));
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

  const name = user?.name ?? user?.email ?? "Guest";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10"
      >
        <Avatar url={user?.avatarUrl} initial={initial} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          {user?.email ? (
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          ) : null}
        </div>
        <CaretRight
          size={15}
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="glass-strong glass-edge relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl p-6 text-foreground">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X size={18} />
            </button>

            {/* identity */}
            <div className="flex items-center gap-3.5">
              <Avatar
                url={user?.avatarUrl}
                initial={initial}
                className="h-14 w-14 text-lg"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-semibold">{name}</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {user?.isAdmin ? "Admin" : "Member"}
                  </span>
                </div>
                {user?.email ? (
                  <div className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </div>
                ) : null}
              </div>
            </div>

            {/* appearance */}
            <Section label="Appearance">
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(({ key, label, Icon }) => {
                  const active = mounted && theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme(key)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-colors ${
                        active
                          ? "border-foreground/30 bg-white/10 text-foreground"
                          : "border-white/10 text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* preferences */}
            <Section label="Default mode">
              <div className="inline-flex w-full items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => pickMode(m.key)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                      mode === m.key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* usage */}
            <Section label="Usage">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Chats" value={stats ? fmt(stats.chats) : "·"} />
                <Stat label="Messages" value={stats ? fmt(stats.messages) : "·"} />
                <Stat label="Tokens" value={stats ? fmt(stats.tokens) : "·"} />
              </div>
            </Section>

            {/* account */}
            <Section label="Account">
              <div className="flex flex-col gap-1.5">
                {user?.isAdmin ? (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                  >
                    <ShieldStar size={16} weight="bold" />
                    Admin panel
                    <CaretRight size={14} className="ml-auto text-muted-foreground" />
                  </Link>
                ) : null}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <SignOutIcon size={16} weight="bold" />
                    Sign out
                  </button>
                </form>
              </div>
            </Section>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
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
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-white/15`}
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

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
