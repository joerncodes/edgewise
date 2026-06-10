"use client";

import { ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { rankStones } from "@/lib/stones";
import type { Knife, Stone } from "@/lib/storage/types";

export default function StonesPage() {
  const [stones, setStones] = useState<Stone[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listStones(), api.listKnives()])
      .then(([s, k]) => {
        setStones(s);
        setKnives(k);
      })
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => rankStones(stones, knives), [stones, knives]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Layers className="h-7 w-7" />
        Stones
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ranked.length === 0 ? (
        <EmptyState
          title="No stones yet"
          hint="Add one via POST /api/stones — name, grit, optional type and notes."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {ranked.map(({ stone, count }) => {
            const cover = stone.images[0];
            return (
              <li key={stone.id}>
                <Link
                  href={`/stones/${stone.id}`}
                  className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted/40">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={api.stoneImageUrl(stone.id, cover.filename, "thumb")}
                        alt=""
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Layers className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {stone.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{stone.grit}</span>
                      {stone.type && (
                        <>
                          <span>·</span>
                          <span>{stone.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {count} {count === 1 ? "session" : "sessions"}
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
