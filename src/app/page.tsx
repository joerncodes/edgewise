"use client";

import {
  ChevronRight,
  Filter,
  Inbox,
  PocketKnife,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnifeCard, lastSession } from "@/components/knife-card";
import { KnifeFilters } from "@/components/knife-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/lib/api-client";
import { inBacklog } from "@/lib/backlog";
import {
  applyFilters,
  emptyFilterState,
  filterStateIsEmpty,
  totalActiveFilters,
  type FilterState,
} from "@/lib/facets";
import type { Knife, Owner } from "@/lib/storage/types";

type SortKey = "overdue" | "recent" | "owner" | "added";

const SORT_LABELS: Record<SortKey, string> = {
  overdue: "Longest since sharpened",
  recent: "Most recently sharpened",
  owner: "Owner A–Z",
  added: "Most recently added",
};

export default function HomePage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => emptyFilterState());
  const [sort, setSort] = useState<SortKey>("recent");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const ownerById = useMemo(
    () => Object.fromEntries(owners.map((o) => [o.id, o])),
    [owners],
  );

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const facetFiltered = applyFilters(knives, filters);
    const filtered = facetFiltered.filter((k) => {
      if (!needle) return true;
      const ownerName = ownerById[k.ownerId]?.name ?? k.ownerId;
      return (
        k.name.toLowerCase().includes(needle) ||
        ownerName.toLowerCase().includes(needle) ||
        (k.type ?? "").toLowerCase().includes(needle) ||
        (k.steel ?? "").toLowerCase().includes(needle)
      );
    });

    const cmpOwner = (a: Knife, b: Knife) =>
      (ownerById[a.ownerId]?.name ?? a.ownerId).localeCompare(
        ownerById[b.ownerId]?.name ?? b.ownerId,
      );

    const lastDate = (k: Knife) => lastSession(k)?.date ?? "";

    switch (sort) {
      case "overdue":
        return [...filtered].sort((a, b) => {
          const la = lastDate(a);
          const lb = lastDate(b);
          if (!la && !lb) return a.name.localeCompare(b.name);
          if (!la) return -1;
          if (!lb) return 1;
          return la.localeCompare(lb);
        });
      case "recent":
        return [...filtered].sort((a, b) => lastDate(b).localeCompare(lastDate(a)));
      case "owner":
        return [...filtered].sort((a, b) => cmpOwner(a, b) || a.name.localeCompare(b.name));
      case "added":
        return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [knives, ownerById, filters, q, sort]);

  const now = useMemo(() => new Date(), []);

  const backlogCount = useMemo(
    () => knives.filter(inBacklog).length,
    [knives],
  );

  // Hero is hidden while the user is actively narrowing — search text
  // or any facet selection. The hero is a landing-page focal point, not
  // a search result.
  const isFilterActive = q.trim() !== "" || !filterStateIsEmpty(filters);
  const heroKnife = useMemo(() => {
    if (isFilterActive) return undefined;
    const candidates = knives.filter((k) => k.images.length > 0 && lastSession(k));
    if (candidates.length === 0) return undefined;
    return candidates.sort((a, b) =>
      (lastSession(b)?.date ?? "").localeCompare(lastSession(a)?.date ?? ""),
    )[0];
  }, [knives, isFilterActive]);
  const gridKnives = heroKnife
    ? filteredSorted.filter((k) => k.id !== heroKnife.id)
    : filteredSorted;

  const activeFilterCount = totalActiveFilters(filters);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-44 w-auto" />
        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-brass">
            Edgewise
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <PocketKnife className="h-3.5 w-3.5" />
            <span className="font-mono">{knives.length}</span>
            <span>{knives.length === 1 ? "knife" : "knives"}</span>
            <span>·</span>
            <User className="h-3.5 w-3.5" />
            <span className="font-mono">{owners.length}</span>
            <span>{owners.length === 1 ? "owner" : "owners"}</span>
          </p>
          {backlogCount > 0 && (
            <Link
              href="/backlog"
              className="group flex items-center gap-3 rounded-md border border-brass/30 bg-brass/5 px-4 py-3 transition-colors hover:border-brass/50 hover:bg-brass/10 dark:border-brass/25 dark:bg-brass/[0.06]"
            >
              <Inbox className="h-4 w-4 text-brass" />
              <span className="text-sm text-foreground">
                <span className="font-mono">{backlogCount}</span>{" "}
                {backlogCount === 1 ? "knife" : "knives"} in the backlog
              </span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
            </Link>
          )}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <KnifeFilters
              knives={knives}
              ownerById={ownerById}
              state={filters}
              onChange={setFilters}
            />
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="search"
              placeholder="Search name, owner, type, steel…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 max-w-sm flex-1 min-w-[12rem]"
            />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9 lg:hidden">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 rounded-md bg-brass/15 px-1.5 font-mono text-[11px] text-brass">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                }
              />
              <SheetContent side="right" className="w-[88vw] sm:w-96 overflow-y-auto p-4">
                <SheetHeader className="p-0">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-2">
                  <KnifeFilters
                    knives={knives}
                    ownerById={ownerById}
                    state={filters}
                    onChange={setFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Select
              value={sort}
              onValueChange={(v) => setSort((typeof v === "string" ? v : "overdue") as SortKey)}
            >
              <SelectTrigger className="h-9">
                <SelectValue>
                  {(value) => SORT_LABELS[value as SortKey] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overdue">{SORT_LABELS.overdue}</SelectItem>
                <SelectItem value="recent">{SORT_LABELS.recent}</SelectItem>
                <SelectItem value="owner">{SORT_LABELS.owner}</SelectItem>
                <SelectItem value="added">{SORT_LABELS.added}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : knives.length === 0 ? (
            <EmptyState
              title="No knives yet"
              hint="Add your first one through the API — it'll show up here right away."
            />
          ) : filteredSorted.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              hint="Clear the search or change the filters."
            />
          ) : (
            <div className="space-y-6">
              {heroKnife && (
                <div className="space-y-2">
                  <h2 className="flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most recently sharpened
                  </h2>
                  <KnifeCard
                    knife={heroKnife}
                    owner={ownerById[heroKnife.ownerId]}
                    now={now}
                    featured
                  />
                </div>
              )}
              {gridKnives.length > 0 && (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gridKnives.map((k) => (
                    <li key={k.id}>
                      <KnifeCard
                        knife={k}
                        owner={ownerById[k.ownerId]}
                        now={now}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
