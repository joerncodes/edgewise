"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Filter, GripVertical, Inbox } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { KnifeCard } from "@/components/knife-card";
import { KnifeFilters } from "@/components/knife-filters";
import { KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
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
import { inBacklog, sortByPosition } from "@/lib/backlog";
import {
  applyFilters,
  emptyFilterState,
  filterStateIsEmpty,
  totalActiveFilters,
  type FilterState,
} from "@/lib/facets";
import type { Knife, Owner } from "@/lib/storage/types";

type SortKey = "manual" | "oldest" | "newest" | "owner";

const SORT_LABELS: Record<SortKey, string> = {
  manual: "Manual order",
  oldest: "Oldest first",
  newest: "Newest first",
  owner: "Owner A–Z",
};

export default function BacklogPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => emptyFilterState());
  const [sort, setSort] = useState<SortKey>("manual");
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

  const backlog = useMemo(() => knives.filter(inBacklog), [knives]);

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const facetFiltered = applyFilters(backlog, filters);
    const filtered = facetFiltered.filter((k) => {
      if (!needle) return true;
      const ownerName = ownerById[k.ownerId]?.name ?? k.ownerId;
      return (
        k.name.toLowerCase().includes(needle) ||
        ownerName.toLowerCase().includes(needle) ||
        (k.type ?? "").toLowerCase().includes(needle)
      );
    });

    const cmpOwner = (a: Knife, b: Knife) =>
      (ownerById[a.ownerId]?.name ?? a.ownerId).localeCompare(
        ownerById[b.ownerId]?.name ?? b.ownerId,
      );

    switch (sort) {
      case "manual":
        return sortByPosition(filtered);
      case "oldest":
        return [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "newest":
        return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "owner":
        return [...filtered].sort((a, b) => cmpOwner(a, b) || a.name.localeCompare(b.name));
    }
  }, [backlog, ownerById, filters, q, sort]);

  const now = useMemo(() => new Date(), []);

  // Drag-and-drop is only meaningful when the visual order matches
  // storage — i.e. manual sort with no filter or search narrowing it.
  const filtersActive = q.trim() !== "" || !filterStateIsEmpty(filters);
  const dndEnabled = sort === "manual" && !filtersActive;
  const dndPaused = sort === "manual" && filtersActive;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeFilterCount = totalActiveFilters(filters);

  async function persistReorder(newOrder: string[]) {
    const previous = knives;
    const positionById = new Map(newOrder.map((id, i) => [id, i + 1]));
    setKnives((curr) =>
      curr.map((k) =>
        positionById.has(k.id)
          ? { ...k, backlogPosition: positionById.get(k.id) }
          : k,
      ),
    );

    try {
      await api.reorderBacklog(newOrder);
    } catch (err) {
      setKnives(previous);
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filteredSorted.map((k) => k.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    persistReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <Inbox className="h-7 w-7" />
          Backlog
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" />
          <span className="font-mono">{backlog.length}</span>
          <span>{backlog.length === 1 ? "knife waiting" : "knives waiting"}</span>
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : backlog.length === 0 ? (
        <EmptyState
          title="Inbox zero"
          hint="Nothing waiting to be sharpened. Flag a knife with PATCH /api/knives/{id} body {&quot;backlog&quot;: true} when one shows up."
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <KnifeFilters
                knives={backlog}
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
                      knives={backlog}
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
                  setSort((typeof v === "string" ? v : "manual") as SortKey)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {(value) => SORT_LABELS[value as SortKey] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{SORT_LABELS.manual}</SelectItem>
                  <SelectItem value="oldest">{SORT_LABELS.oldest}</SelectItem>
                  <SelectItem value="newest">{SORT_LABELS.newest}</SelectItem>
                  <SelectItem value="owner">{SORT_LABELS.owner}</SelectItem>
                </SelectContent>
              </Select>
              <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
            </div>

            {dndPaused && (
              <p className="text-xs text-muted-foreground">
                Drag-and-drop is paused while a search or filter is active —
                clear them to reorder.
              </p>
            )}

            {filteredSorted.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                hint="Clear the search or change the filters."
              />
            ) : dndEnabled && viewMode === "cards" ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredSorted.map((k) => k.id)}
                  strategy={rectSortingStrategy}
                >
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSorted.map((k) => (
                      <SortableKnifeItem
                        key={k.id}
                        knife={k}
                        owner={ownerById[k.ownerId]}
                        now={now}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <KnivesView
                knives={filteredSorted}
                owners={owners}
                now={now}
                mode={viewMode}
                variant="backlog"
                onReorder={dndEnabled && viewMode === "table" ? persistReorder : undefined}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function SortableKnifeItem({
  knife,
  owner,
  now,
}: {
  knife: Knife;
  owner?: Owner;
  now: Date;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: knife.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        aria-label={`Drag to reorder ${knife.name}`}
        className="absolute right-2 top-2 z-20 flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-background/85 text-muted-foreground backdrop-blur transition-colors hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <KnifeCard knife={knife} owner={owner} now={now} />
    </li>
  );
}
