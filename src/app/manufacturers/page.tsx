"use client";

import { ChevronRight, Factory } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { groupManufacturers } from "@/lib/manufacturers";
import type { Knife } from "@/lib/storage/types";

export default function ManufacturersPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listKnives()
      .then(setKnives)
      .finally(() => setLoading(false));
  }, []);

  const manufacturers = useMemo(() => {
    return groupManufacturers(knives).sort(
      (a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName),
    );
  }, [knives]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Factory className="h-7 w-7" />
        Manufacturers
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : manufacturers.length === 0 ? (
        <EmptyState
          title="No manufacturers yet"
          hint="Add a manufacturer to a knife's frontmatter via the API and it will appear here."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {manufacturers.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/manufacturers/${m.slug}`}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <Factory className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {m.displayName}
                  </div>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {m.count} {m.count === 1 ? "knife" : "knives"}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
