"use client";

import { ChevronRight, Plus, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { Owner } from "@/lib/storage/types";

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listOwners()
      .then(setOwners)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <User className="h-7 w-7" />
          Owners
        </h1>
        <Link href="/owners/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add owner
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : owners.length === 0 ? (
        <EmptyState
          title="No owners yet"
          hint="Add the first one so you can start logging their knives."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {owners.map((o) => (
            <li key={o.id}>
              <Link
                href={`/owners/${o.id}`}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{o.name}</div>
                  {o.contact && (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.contact}
                    </div>
                  )}
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
