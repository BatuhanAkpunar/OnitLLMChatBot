/**
 * Instant chat-page skeleton: shows the moment a history item is clicked,
 * while the server assembles messages, tasks and decisions.
 */
export default function ChatLoading() {
  return (
    <div className="relative flex h-dvh flex-col">
      {/* top bar ghost */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <div className="h-5 w-5 animate-pulse rounded-full bg-accent" />
        <div className="h-4 w-28 animate-pulse rounded-md bg-accent" />
        <div className="ml-auto flex items-center gap-2">
          <div className="h-8 w-20 animate-pulse rounded-xl bg-accent" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-accent" />
        </div>
      </div>

      {/* thread ghost */}
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-8">
        <div className="ml-auto h-10 w-3/5 animate-pulse rounded-2xl rounded-br-md bg-accent" />
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-accent" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 animate-pulse rounded bg-accent" />
            <div className="h-3.5 w-full animate-pulse rounded bg-accent" />
            <div className="h-3.5 w-11/12 animate-pulse rounded bg-accent" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-accent" />
          </div>
        </div>
        <div className="ml-auto h-10 w-2/5 animate-pulse rounded-2xl rounded-br-md bg-accent" />
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-accent" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 animate-pulse rounded bg-accent" />
            <div className="h-3.5 w-10/12 animate-pulse rounded bg-accent" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-accent" />
          </div>
        </div>
      </div>

      {/* composer ghost */}
      <div className="mx-auto w-full max-w-2xl px-6 pb-6">
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}
