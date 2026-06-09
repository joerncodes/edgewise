import Link from "next/link";

export interface BarListRow {
  key: string;
  label: string;
  count: number;
  href?: string;
}

export function BarList({
  rows,
  empty,
}: {
  rows: BarListRow[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{empty ?? "Not enough data yet."}</p>
    );
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const pct = (r.count / max) * 100;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{r.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-border/60">
              <div
                className="h-full bg-brass/70 transition-colors group-hover:bg-brass"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="group block rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-accent/40"
              >
                {inner}
              </Link>
            ) : (
              <div className="group block px-2 py-1 -mx-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
