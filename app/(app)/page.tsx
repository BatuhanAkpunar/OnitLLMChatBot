import { createProject } from "./actions";

export default function HomePage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-semibold">
          O
        </div>
        <h1 className="text-lg font-semibold tracking-tight">
          Start a conversation
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Create a chat and bring in AI roles like @Analyst, @ProductManager,
          @Developer, @QA — each with its own expertise.
        </p>
        <form action={createProject} className="mt-5">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            New chat
          </button>
        </form>
      </div>
    </div>
  );
}
