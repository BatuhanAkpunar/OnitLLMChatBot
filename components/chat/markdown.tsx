"use client";

import { memo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

function PreBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  async function copy() {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied code");
    } catch {
      toast.error("Could not copy");
    }
  }
  return (
    <div className="group/code relative">
      <button
        type="button"
        onClick={copy}
        title="Copy code"
        aria-label="Copy code"
        className="absolute right-2 top-2 z-10 rounded-md border border-border bg-card/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover/code:opacity-100"
      >
        <Copy size={13} />
      </button>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

// Memoized: markdown parsing (remark-gfm + syntax highlight) is the most
// expensive work in a message row. During streaming, setMessages fires on every
// token and re-renders the whole thread; without memo, every row would re-parse
// its markdown each token. Keyed on the content string, so only the row whose
// text actually changed re-parses; unchanged rows skip the work.
export const Markdown = memo(function Markdown({
  children,
}: {
  children: string;
}) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{ pre: PreBlock }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
