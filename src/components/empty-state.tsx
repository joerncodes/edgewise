import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 px-6 py-12 text-center">
      <div className="font-heading text-base uppercase tracking-wider text-foreground/80">
        {title}
      </div>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
