import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Render markdown with a tight, calm Tailwind treatment that fits the
// rest of the app. No prose plugin — we hand-style each block element.
// react-markdown sanitizes by default (no raw HTML), so this is safe to
// feed user-authored content from the knife/owner notes.
const COMPONENTS: Components = {
  p: ({ node: _n, ...props }) => <p className="leading-relaxed" {...props} />,
  a: ({ node: _n, ...props }) => (
    <a className="underline underline-offset-2 hover:text-foreground" {...props} />
  ),
  ul: ({ node: _n, ...props }) => (
    <ul className="my-2 list-disc space-y-1 pl-5" {...props} />
  ),
  ol: ({ node: _n, ...props }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
  ),
  li: ({ node: _n, ...props }) => <li className="leading-relaxed" {...props} />,
  h1: ({ node: _n, ...props }) => (
    <h2 className="mt-3 text-base font-semibold tracking-tight text-foreground" {...props} />
  ),
  h2: ({ node: _n, ...props }) => (
    <h3 className="mt-3 text-sm font-semibold uppercase tracking-wider text-foreground" {...props} />
  ),
  h3: ({ node: _n, ...props }) => (
    <h4 className="mt-3 text-sm font-semibold text-foreground" {...props} />
  ),
  blockquote: ({ node: _n, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-border/70 pl-3 italic text-muted-foreground"
      {...props}
    />
  ),
  code: ({ node: _n, ...props }) => (
    <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.9em]" {...props} />
  ),
  pre: ({ node: _n, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-md bg-muted/60 p-3 text-xs leading-relaxed"
      {...props}
    />
  ),
  hr: ({ node: _n, ...props }) => (
    <hr className="my-3 border-border/60" {...props} />
  ),
  strong: ({ node: _n, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
