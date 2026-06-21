import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Stars } from "@/components/stars";
import { cn } from "@/lib/utils";
import type { SharpeningSession } from "@/lib/storage/types";

// "Am I getting better at sharpening *this* knife?" — a compact gauge
// readout of session ratings over time. Inline SVG, no charting library
// (see docs/todos/rating-sparkline.md and the heatmap precedent).
//
// Designed into the app's brass-and-steel workshop identity: steel
// gradation rules give the height meaning (out of 5, like a sharpening
// guide's scale), a brass apex line over a "blade body" fill carries the
// trend, and the latest point reads as the current edge.
//
// Ratings are rounded to the nearest half-step so the dots agree with the
// stars shown on each session (see Stars in stars.tsx).

const MAX_POINTS = 12; // trim older sessions to keep it readable

// SVG plot geometry. viewBox units; the <svg> scales to its container.
const W = 320;
const H = 92;
const PAD_L = 16; // room for the rating-scale numerals
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 14;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

function halfStep(value: number): number {
  return Math.round(value * 2) / 2;
}

// Rating (1..5) → vertical position, top of the plot is 5.
function ratingToY(value: number): number {
  return PAD_T + INNER_H * (1 - (value - 1) / 4);
}

export function RatingSparkline({
  sessions,
  className,
}: {
  sessions: SharpeningSession[];
  className?: string;
}) {
  // Oldest → newest, rated only, most recent MAX_POINTS kept. X is the
  // session index (the Nth time it was sharpened), not the date — the
  // date is already in the sessions table below, and index avoids long
  // flat gaps when a knife sits unused for months.
  const rated = sessions
    .filter((s) => typeof s.rating === "number")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_POINTS);

  // Two points isn't a trend, and an empty chart is just noise.
  if (rated.length < 3) return null;

  const points = rated.map((s, i) => {
    const value = halfStep(s.rating as number);
    const x = PAD_L + (INNER_W * i) / (rated.length - 1);
    return { x, y: ratingToY(value), value, date: s.date };
  });

  const first = points[0];
  const latest = points[points.length - 1];
  const latestRaw = rated[rated.length - 1].rating as number;
  const delta = latest.value - first.value;

  // Precise polyline length so the draw-on animation finishes cleanly.
  let edgeLen = 0;
  for (let i = 1; i < points.length; i++) {
    edgeLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  const linePath = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const baseY = ratingToY(1);
  const areaPath = `${linePath} L${latest.x},${baseY} L${first.x},${baseY} Z`;

  // Faint steel scale lines + numerals at each rating step.
  const ticks = [1, 2, 3, 4, 5];

  const trend =
    delta > 0
      ? { Icon: ArrowUpRight, tone: "text-brass", label: `+${delta % 1 ? delta.toFixed(1) : delta}` }
      : delta < 0
        ? { Icon: ArrowDownRight, tone: "text-steel", label: delta % 1 ? delta.toFixed(1) : `${delta}` }
        : { Icon: Minus, tone: "text-muted-foreground", label: "±0" };

  return (
    <div
      className={cn(
        "rounded-lg border border-brass/20 bg-card/60 px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Edge progression
        </span>
        <span className={cn("inline-flex items-center gap-1 font-mono text-xs tabular-nums", trend.tone)}>
          <trend.Icon className="h-3.5 w-3.5" />
          {trend.label}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        style={{ "--edge-len": edgeLen } as React.CSSProperties}
        role="img"
        aria-label={`Rating across the last ${rated.length} rated sharpenings: from ${first.value.toFixed(
          1,
        )} to ${latest.value.toFixed(1)} out of 5.`}
      >
        <defs>
          <linearGradient id="spark-blade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* rating scale: steel gradation rules, numerals on the left */}
        {ticks.map((t) => {
          const y = ratingToY(t);
          const edge = t === 5; // the ceiling reads a touch stronger
          return (
            <g key={t}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                className={edge ? "stroke-steel/30" : "stroke-steel/12"}
                strokeWidth={1}
                strokeDasharray={edge ? undefined : "2 4"}
              />
              <text
                x={PAD_L - 5}
                y={y + 2.5}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[7px] tabular-nums"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* blade body under the apex line */}
        <path d={areaPath} fill="url(#spark-blade)" />

        {/* the apex line — draws on once like the stroke of a hone */}
        <path
          d={linePath}
          fill="none"
          className="spark-edge stroke-brass"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* earlier sessions: hollow brass-deep dots */}
        {points.slice(0, -1).map((p) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r={2.4}
            className="fill-card stroke-brass-deep"
            strokeWidth={1.5}
          >
            <title>{`${formatDate(p.date)}: ${p.value.toFixed(1)} / 5`}</title>
          </circle>
        ))}

        {/* the current edge: filled brass dot with a soft halo */}
        <circle cx={latest.x} cy={latest.y} r={6} className="fill-brass/15" />
        <circle cx={latest.x} cy={latest.y} r={3.4} className="fill-brass">
          <title>{`${formatDate(latest.date)}: ${latest.value.toFixed(1)} / 5`}</title>
        </circle>
      </svg>

      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {rated.length} sharpenings
        </span>
        <Stars value={latestRaw} />
      </div>
    </div>
  );
}
