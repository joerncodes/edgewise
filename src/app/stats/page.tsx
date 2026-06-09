"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { BarList } from "@/components/stats/bar-list";
import { MonthBars } from "@/components/stats/month-bars";
import { api } from "@/lib/api-client";
import type { Stats } from "@/lib/stats";
import { slugify } from "@/lib/storage/ids";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <BarChart3 className="h-7 w-7" />
          Stats
        </h1>
        {stats && (
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span>
              <span className="font-mono">{stats.totals.knives}</span> knives
            </span>
            <span>·</span>
            <span>
              <span className="font-mono">{stats.totals.owners}</span> owners
            </span>
            <span>·</span>
            <span>
              <span className="font-mono">{stats.totals.sessions}</span>{" "}
              {stats.totals.sessions === 1 ? "session" : "sessions"} all time
            </span>
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !stats ? (
        <EmptyState title="Couldn't load stats" />
      ) : stats.totals.knives === 0 ? (
        <EmptyState
          title="Nothing to count yet"
          hint="Add a knife and log a session to see this page light up."
        />
      ) : (
        <div className="space-y-10">
          <Section title="Sessions per month" subtitle="Last 24 months, idle months included.">
            <MonthBars data={stats.sessionsByMonth} />
          </Section>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <Section title="Sharpenings per owner">
              <BarList
                rows={stats.sessionsByOwner.map((r) => ({
                  key: r.ownerId,
                  label: r.ownerName,
                  count: r.count,
                  href: `/owners/${r.ownerId}`,
                }))}
                empty="No sessions logged yet."
              />
            </Section>

            <Section title="Most-worked knives">
              <BarList
                rows={stats.topKnivesBySessions.map((r) => ({
                  key: r.id,
                  label: r.name,
                  count: r.count,
                  href: `/knives/${r.id}`,
                }))}
                empty="No sessions logged yet."
              />
            </Section>

            <Section title="Steel mix">
              <BarList
                rows={stats.knivesBySteel.map((r) => ({
                  key: r.label,
                  label: r.label,
                  count: r.count,
                }))}
                empty="No steels recorded on any knife."
              />
            </Section>

            <Section title="Type mix">
              <BarList
                rows={stats.knivesByType.map((r) => ({
                  key: r.label,
                  label: r.label,
                  count: r.count,
                  href: `/types/${slugify(r.label)}`,
                }))}
                empty="No types recorded on any knife."
              />
            </Section>

            <Section title="Angle distribution" subtitle="Across every recorded session.">
              <BarList
                rows={stats.angleHistogram.map((r) => ({
                  key: r.bucket,
                  label: r.bucket,
                  count: r.count,
                }))}
                empty="No sessions logged yet."
              />
            </Section>

            <Section
              title="Longest gap since last sharpening"
              subtitle="Never-sharpened knives surface first."
            >
              <BarList
                rows={stats.longestGap.map((r) => ({
                  key: r.id,
                  label: r.name,
                  count: r.daysSince ?? 0,
                  href: `/knives/${r.id}`,
                }))}
                empty="Every knife has been sharpened."
              />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

