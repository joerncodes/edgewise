"use client";

import { ChevronRight } from "lucide-react";
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

export default function KnivesPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerById = useMemo(
    () => Object.fromEntries(owners.map((o) => [o.id, o])),
    [owners],
  );

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brass">Knives</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : knives.length === 0 ? (
        <EmptyState
          title="No knives yet"
          hint="Create one through the API. The dashboard will pick it up immediately."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {knives.map((k) => {
            const last = k.sessions.at(-1);
            return (
              <li key={k.id}>
                <Link
                  href={`/knives/${k.id}`}
                  className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{k.name}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {ownerById[k.ownerId]?.name ?? k.ownerId}
                      {k.type && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span>{k.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground font-mono sm:block">
                    {last ? (
                      <>
                        <div>{formatDate(last.date)}</div>
                        <div className="mt-0.5">{last.angle}°</div>
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
