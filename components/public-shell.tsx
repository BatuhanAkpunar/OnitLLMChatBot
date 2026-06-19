import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/nav/language-toggle";
import { DevCredit } from "@/components/nav/dev-credit";
import { OrbMark } from "@/components/brand/orb";
import { SignInButton } from "@/components/auth/sign-in-button";

/**
 * Chrome for signed-out visitors: brand on the left; on the right a tidy
 * cluster of quiet controls (language, theme), the developer credit, and one
 * primary CTA. Floats over the hero so the aurora flows behind it.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between px-5">
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-opacity hover:opacity-80"
        >
          <OrbMark size={20} />
          <span className="logo-wordmark font-pixel text-[17px] tracking-tight">onit</span>
        </a>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <span className="h-5 w-px bg-border" aria-hidden />
          <DevCredit />
          <SignInButton />
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1">{children}</main>
    </div>
  );
}
