"use client";

import { ChevronRight, Gem, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { isStrop, rankAbrasives } from "@/lib/abrasives";
import type { Abrasive, Knife } from "@/lib/storage/types";

export default function AbrasivesPage() {
  const [abrasives, setAbrasives] = useState<Abrasive[]>([]);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listAbrasives(), api.listKnives()])
      .then(([a, k]) => {
        setAbrasives(a);
        setKnives(k);
      })
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => rankAbrasives(abrasives, knives), [abrasives, knives]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <Gem className="h-7 w-7" />
          Abrasives
        </h1>
        <Link href="/abrasives/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add abrasive
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ranked.length === 0 ? (
        <EmptyState
          title="No abrasives yet"
          hint="Add the first one to start tracking sharpening progressions."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {ranked.map(({ abrasive, count }) => {
            const cover = abrasive.images[0];
            const strop = isStrop(abrasive);
            return (
              <li key={abrasive.id}>
                <Link
                  href={`/abrasives/${abrasive.id}`}
                  className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted/40">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={api.abrasiveImageUrl(abrasive.id, cover.filename, "thumb")}
                        alt=""
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Gem className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {abrasive.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {strop && abrasive.compound ? (
                        <span className="truncate">{abrasive.compound}</span>
                      ) : (
                        <span className="font-mono">{abrasive.grit}</span>
                      )}
                      {abrasive.type && (
                        <>
                          <span>·</span>
                          <span>{abrasive.type}</span>
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
