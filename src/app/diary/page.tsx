"use client";

import { NotebookPen, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Markdown } from "@/components/markdown";
import { Stars } from "@/components/stars";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import type { Diary, DiaryEntry } from "@/lib/diary";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const name = MONTH_NAMES[m - 1] ?? m.toString();
  return `${name} ${y}`;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function DiaryPage() {
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDiary()
      .then(setDiary)
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    if (!diary) return [];
    const set = new Set<string>();
    for (const m of diary.months) set.add(m.month.slice(0, 4));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [diary]);

  const activeYear = year && years.includes(year) ? year : years[0] ?? null;

  const visibleMonths = useMemo(() => {
    if (!diary) return [];
    if (!activeYear) return diary.months;
    return diary.months.filter((m) => m.month.startsWith(`${activeYear}-`));
  }, [diary, activeYear]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <NotebookPen className="h-7 w-7" />
          Diary
        </h1>
        {diary && (
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{diary.totalSessions}</span>{" "}
            {diary.totalSessions === 1 ? "session" : "sessions"} across{" "}
            <span className="font-mono">
              {years.length >= 2 ? years.length : diary.months.length}
            </span>{" "}
            {years.length >= 2
              ? years.length === 1
                ? "year"
                : "years"
              : diary.months.length === 1
                ? "month"
                : "months"}
            .
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !diary || diary.totalSessions === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          hint="Add a sharpening session via the API and it will show up here."
        />
      ) : (
        <div className="space-y-6">
          {years.length > 1 && activeYear && (
            <Tabs value={activeYear} onValueChange={setYear} className="my-6">
              <TabsList className="h-auto gap-1 p-1">
                {years.map((y) => (
                  <TabsTrigger
                    key={y}
                    value={y}
                    className="px-5 py-2 font-mono text-base tracking-wider data-active:bg-brass data-active:font-semibold data-active:text-background data-active:shadow-md dark:data-active:bg-brass dark:data-active:text-background"
                  >
                    {y}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <div className="space-y-10">
            {visibleMonths.map((m) => (
              <section key={m.month} className="space-y-3">
                <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
                  {formatMonth(m.month)}
                </h2>
                <ol className="-mx-2 divide-y divide-border/60">
                  {m.entries.map((e, i) => (
                    <li key={`${e.knifeId}-${e.date}-${i}`}>
                      <Row entry={e} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ entry }: { entry: DiaryEntry }) {
  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/30 sm:gap-4">
      <div className="font-mono text-xs leading-relaxed text-muted-foreground tabular-nums whitespace-nowrap pt-0.5">
        {formatDate(entry.date)}
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <Link
            href={`/knives/${entry.knifeId}`}
            className="truncate font-medium text-foreground hover:underline"
          >
            {entry.knifeName}
          </Link>
          <Link
            href={`/owners/${entry.ownerId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <User className="h-3 w-3" />
            {entry.ownerName}
          </Link>
        </div>
        {entry.notes && (
          <div className="text-xs leading-snug text-muted-foreground">
            <Markdown className="space-y-1 text-xs leading-snug">
              {entry.notes}
            </Markdown>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 pt-0.5 text-xs">
        <span className="font-mono text-foreground">{entry.angle}°</span>
        {entry.rating !== undefined && <Stars value={entry.rating} />}
      </div>
    </article>
  );
}
