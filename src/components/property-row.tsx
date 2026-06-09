import type { ReactNode } from "react";

export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex items-baseline gap-6 py-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function PropertyList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/40">{children}</div>;
}
