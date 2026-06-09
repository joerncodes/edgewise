import { cn } from "@/lib/utils";
import type { DailySessionCount } from "@/lib/stats";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_LABELS = ["Mo", "We", "Fr"]; // sparse — show every other row

// Brass-tinted ramp. 0 = quiet border tone, 4+ = full brass.
const RAMP = [
  "bg-border/50 dark:bg-border-soft/60",
  "bg-brass/20",
  "bg-brass/45",
  "bg-brass/70",
  "bg-brass",
];

function cellColor(count: number): string {
  return RAMP[Math.min(count, RAMP.length - 1)];
}

export function Heatmap({ data }: { data: DailySessionCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions logged yet.</p>;
  }

  const weeks = Math.ceil(data.length / 7);

  // Month labels along the top: place a label at the column where each
  // month starts, but only if the start row falls in the first 3 weekdays
  // (otherwise it overlaps the previous month's label).
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks; col++) {
    const firstDay = data[col * 7];
    if (!firstDay) continue;
    const m = Number(firstDay.date.slice(5, 7)) - 1;
    if (m !== lastMonth) {
      monthLabels.push({ col, label: MONTH_SHORT[m] ?? "" });
      lastMonth = m;
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* month label row */}
        <div className="ml-6 grid grid-flow-col auto-cols-[0.75rem] gap-[2px] text-[10px] font-mono text-muted-foreground">
          {Array.from({ length: weeks }).map((_, col) => {
            const lbl = monthLabels.find((m) => m.col === col);
            return (
              <div key={col} className="h-3">
                {lbl?.label ?? ""}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1">
          {/* weekday labels */}
          <div className="grid grid-rows-7 gap-[2px] text-[10px] font-mono text-muted-foreground">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="flex h-3 w-4 items-center">
                {row % 2 === 0 ? WEEKDAY_LABELS[row / 2] : ""}
              </div>
            ))}
          </div>
          {/* cells */}
          <div className="grid grid-flow-col grid-rows-7 auto-cols-[0.75rem] gap-[2px]">
            {data.map((d) => (
              <div
                key={d.date}
                className={cn("h-3 w-3 rounded-[2px]", cellColor(d.count))}
                title={`${d.date}: ${d.count} ${d.count === 1 ? "session" : "sessions"}`}
                aria-label={`${d.count} ${d.count === 1 ? "session" : "sessions"} on ${d.date}`}
              />
            ))}
          </div>
        </div>
        {/* legend */}
        <div className="ml-6 mt-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>less</span>
          {RAMP.map((c, i) => (
            <div key={i} className={cn("h-3 w-3 rounded-[2px]", c)} />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
