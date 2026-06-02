import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Sign-in failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t complete the sign-in. The link may have expired.
          Please try again.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
