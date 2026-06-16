"use client";

import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Interactive cousin of <Stars>. Click a star to snap to an integer
// 1–5; use the number input next to it for one-decimal precision
// (3.6, 4.1, …). The data model allows any float in [1, 5]; we just
// don't try to capture 0.01 vibes on the bench.
export function StarsInput({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const safe = clamp01_5(value);

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-3", className)}>
      <div
        role="radiogroup"
        aria-label="Rating"
        className="inline-flex items-center gap-0.5"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          // How filled this particular star is, given the current value.
          // n=3 with value=3.6 → fill=1; n=4 → fill=0.6; n=5 → fill=0.
          const fill = safe === undefined ? 0 : Math.max(0, Math.min(1, safe - (n - 1)));
          const isCurrentInt = value !== undefined && Math.round(value) === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={isCurrentInt}
              aria-label={`${n} of 5`}
              onClick={() => onChange(value === n ? undefined : n)}
              className="cursor-pointer rounded-md p-0.5 transition-colors"
            >
              <FractionalStar fill={fill} className={dim} />
            </button>
          );
        })}
      </div>
      <Input
        type="number"
        inputMode="decimal"
        min={1}
        max={5}
        step={0.1}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(clamp(n, 1, 5));
        }}
        placeholder="—"
        className="h-8 w-20 text-center font-mono text-sm"
        aria-label="Fine-tune rating"
      />
      {value !== undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clamp01_5(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  return clamp(v, 0, 5);
}

// One star icon with a fractional fill 0–1. Implemented as an outlined
// star with an absolutely-positioned filled copy clipped via width.
function FractionalStar({ fill, className }: { fill: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span className={cn("relative inline-block", className)} aria-hidden>
      <Star className={cn("text-muted-foreground/30", className)} />
      <span
        className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden text-amber-500"
        style={{ width: `${pct}%` }}
      >
        <Star className={cn("fill-current text-amber-500", className)} />
      </span>
    </span>
  );
}
