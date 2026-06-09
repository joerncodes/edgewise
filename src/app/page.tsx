"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function HomePage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const allSessions = useMemo(
    () =>
      knives
        .flatMap((k) => k.sessions.map((s) => ({ knife: k, session: s })))
        .sort((a, b) => b.session.date.localeCompare(a.session.date)),
    [knives],
  );

  const totalSessions = allSessions.length;
  const latest = allSessions[0];
  const recent = allSessions.slice(0, 8);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Edgewise</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{knives.length}</span> knives
          <span className="mx-2">·</span>
          <span className="font-mono">{owners.length}</span> owners
          <span className="mx-2">·</span>
          <span className="font-mono">{totalSessions}</span> sharpenings
          {latest && (
            <>
              <span className="mx-2">·</span>last:{" "}
              <Link
                href={`/knives/${latest.knife.id}`}
                className="text-foreground hover:underline"
              >
                {latest.knife.name}
              </Link>
              , <span className="font-mono">{formatDate(latest.session.date)}</span>
            </>
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent sharpenings
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No sharpenings yet"
            hint="Record one through the API or by creating a knife with a session."
          />
        ) : (
          <ul className="-mx-2 divide-y divide-border/70">
            {recent.map(({ knife, session }, i) => (
              <li key={`${knife.id}-${i}`}>
                <Link
                  href={`/knives/${knife.id}`}
                  className="flex items-baseline gap-4 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="w-20 shrink-0 font-mono text-muted-foreground">
                    {formatDate(session.date)}
                  </span>
                  <span className="font-medium text-foreground">{knife.name}</span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {session.angle}°
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
