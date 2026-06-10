"use client";

import { useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { BorderGlow } from "@/components/ui/border-glow";
import { OrbMark } from "@/components/brand/orb";
import { signInWithGoogle, signInWithDevPassword } from "@/app/login/actions";

const ROLES: { handle: string; color: string }[] = [
  { handle: "@Analyst", color: "analyst" },
  { handle: "@ProductManager", color: "product-manager" },
  { handle: "@Developer", color: "developer" },
  { handle: "@ProjectManager", color: "project-manager" },
  { handle: "@Designer", color: "product-designer" },
  { handle: "@QA", color: "qa" },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginHero({
  error,
  configured,
  showDev,
}: {
  error?: string;
  configured: boolean;
  showDev: boolean;
}) {
  const [mode, setMode] = useState<"plan" | "build">("build");
  const [input, setInput] = useState("");

  return (
    <div className="w-full max-w-xl">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 w-fit">
          <OrbMark size={44} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to Onit AI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring in AI roles for your software team: Analyst, PM, Developer, QA and more. Sign in to
          start.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Chat-style preview: using it signs you in */}
      <form action={signInWithGoogle}>
        <BorderGlow radius={16} innerClassName="p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ask anything, or @mention a role…"
            className="max-h-40 min-h-[52px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <button
              type="button"
              onClick={() => setMode(mode === "plan" ? "build" : "plan")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${mode === "plan" ? "bg-amber-500" : "bg-emerald-500"}`}
              />
              {mode === "plan" ? "Plan mode" : "Build mode"}
            </button>
            <button
              type="submit"
              aria-label="Send"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </div>
        </BorderGlow>
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {ROLES.map((r) => (
          <span
            key={r.handle}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: `var(--agent-${r.color})` }}
            />
            {r.handle}
          </span>
        ))}
      </div>

      <form action={signInWithGoogle} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>

      {!configured ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Supabase is not configured yet. Add your Supabase environment variables to enable sign-in.
        </p>
      ) : null}

      {showDev ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-2 text-center text-xs text-muted-foreground">Dev sign-in (local only)</p>
          <form action={signInWithDevPassword} className="space-y-2">
            <input
              name="email"
              type="email"
              defaultValue="dev@onit.local"
              aria-label="Email"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
            <input
              name="password"
              type="password"
              defaultValue="Devpassword1!"
              aria-label="Password"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in (dev)
            </button>
          </form>
        </div>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
