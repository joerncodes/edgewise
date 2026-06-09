import type { SessionsByMonth } from "@/lib/stats";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(ym: string): { short: string; isJan: boolean; year: string } {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  return { short: MONTH_SHORT[idx] ?? m, isJan: idx === 0, year: y };
}

export function MonthBars({ data }: { data: SessionsByMonth[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  if (data.every((d) => d.count === 0)) {
    return <p className="text-sm text-muted-foreground">No sharpenings recorded yet.</p>;
  }
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d) => {
          const h = (d.count / max) * 100;
          return (
            <div
              key={d.month}
              className="group relative flex-1 min-w-0"
              title={`${d.month}: ${d.count} ${d.count === 1 ? "session" : "sessions"}`}
            >
              <div
                className="w-full rounded-sm bg-brass/60 transition-colors group-hover:bg-brass"
                style={{ height: `${Math.max(h, d.count === 0 ? 0 : 4)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] font-mono text-muted-foreground">
        {data.map((d) => {
          const { isJan, year } = monthLabel(d.month);
          return (
            <div key={d.month} className="flex-1 min-w-0 text-center">
              {isJan ? year : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
