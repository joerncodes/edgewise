"use client";

import { Filter, Handshake } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnifeFilters } from "@/components/knife-filters";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
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
import {
  applyFilters,
  emptyFilterState,
  totalActiveFilters,
  type FilterState,
} from "@/lib/facets";
import type { Knife, Owner } from "@/lib/storage/types";

type SortKey = "owner" | "newest" | "oldest";

const SORT_LABELS: Record<SortKey, string> = {
  owner: "Owner A–Z",
  newest: "Most recently added",
  oldest: "Oldest first",
};

export default function OnLoanPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => emptyFilterState());
  const [sort, setSort] = useState<SortKey>("owner");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useViewMode();

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

  const onLoan = useMemo(() => knives.filter((k) => k.onLoan), [knives]);

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const facetFiltered = applyFilters(onLoan, filters);
    const filtered = facetFiltered.filter((k) => {
      if (!needle) return true;
      const ownerName = ownerById[k.ownerId]?.name ?? k.ownerId;
      return (
        k.name.toLowerCase().includes(needle) ||
        ownerName.toLowerCase().includes(needle) ||
        (k.type ?? "").toLowerCase().includes(needle) ||
        (k.subtype ?? "").toLowerCase().includes(needle)
      );
    });

    const cmpOwner = (a: Knife, b: Knife) =>
      (ownerById[a.ownerId]?.name ?? a.ownerId).localeCompare(
        ownerById[b.ownerId]?.name ?? b.ownerId,
      );

    switch (sort) {
      case "owner":
        return [...filtered].sort((a, b) => cmpOwner(a, b) || a.name.localeCompare(b.name));
      case "newest":
        return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "oldest":
        return [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
  }, [onLoan, ownerById, filters, q, sort]);

  const now = useMemo(() => new Date(), []);
  const columns = useTableColumns({ routeKey: "on-loan", available: ALL_COLUMNS });
  const activeFilterCount = totalActiveFilters(filters);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <Handshake className="h-7 w-7" />
          On loan
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <Handshake className="h-3.5 w-3.5" />
          <span className="font-mono">{onLoan.length}</span>
          <span>{onLoan.length === 1 ? "knife in the house" : "knives in the house"}</span>
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : onLoan.length === 0 ? (
        <EmptyState
          title="Nothing on loan"
          hint="Flag a knife with PATCH /api/knives/{id} body {&quot;onLoan&quot;: true}, or use the toggle on its detail page."
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <KnifeFilters
                knives={onLoan}
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
                placeholder="Search name, owner, type…"
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
                      knives={onLoan}
                      ownerById={ownerById}
                      state={filters}
                      onChange={setFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <Select
                value={sort}
                onValueChange={(v) =>
                  setSort((typeof v === "string" ? v : "owner") as SortKey)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {(value) => SORT_LABELS[value as SortKey] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{SORT_LABELS.owner}</SelectItem>
                  <SelectItem value="newest">{SORT_LABELS.newest}</SelectItem>
                  <SelectItem value="oldest">{SORT_LABELS.oldest}</SelectItem>
                </SelectContent>
              </Select>
              <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
              {viewMode === "table" && <TableColumnsToggle control={columns} />}
            </div>

            {filteredSorted.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                hint="Clear the search or change the filters."
              />
            ) : (
              <KnivesView
                knives={filteredSorted}
                owners={owners}
                now={now}
                mode={viewMode}
                hideColumns={columns.hideColumns}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
