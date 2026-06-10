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
import { Atom, Factory, GripVertical, Inbox, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { KnifeCard } from "@/components/knife-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { inBacklog, sortByPosition } from "@/lib/backlog";
import { computeFacets } from "@/lib/facets";
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
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [steelFilter, setSteelFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("manual");

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

  // Facet values come from the *backlog* slice, not all knives — a
  // steel that only shows up on sharpened knives shouldn't pad the
  // dropdown here. Same idea as `ownersWithBacklog` below.
  const facets = useMemo(() => computeFacets(backlog), [backlog]);

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = backlog.filter((k) => {
      if (ownerFilter !== "all" && k.ownerId !== ownerFilter) return false;
      if (manufacturerFilter !== "all" && k.manufacturer !== manufacturerFilter) return false;
      if (steelFilter !== "all" && k.steel !== steelFilter) return false;
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
  }, [backlog, ownerById, ownerFilter, manufacturerFilter, steelFilter, q, sort]);

  const now = useMemo(() => new Date(), []);

  // Only show the owner filter for owners that actually have backlog
  // items — otherwise the dropdown advertises empty filters.
  const ownersWithBacklog = useMemo(() => {
    const ids = new Set(backlog.map((k) => k.ownerId));
    return owners.filter((o) => ids.has(o.id));
  }, [backlog, owners]);

  // Drag-and-drop is only meaningful when the visual order matches
  // storage — i.e. manual sort with no filter or search narrowing it.
  const filtersActive =
    q.trim() !== "" ||
    ownerFilter !== "all" ||
    manufacturerFilter !== "all" ||
    steelFilter !== "all";
  const dndEnabled = sort === "manual" && !filtersActive;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filteredSorted.map((k) => k.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);

    // Optimistic update: rewrite positions locally, then persist. On
    // failure, revert by snapshotting the previous knives list.
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
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="search"
              placeholder="Search owner, name, type…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 max-w-sm flex-1 min-w-[12rem]"
            />
            {ownersWithBacklog.length > 1 && (
              <Select
                value={ownerFilter}
                onValueChange={(v) =>
                  setOwnerFilter(typeof v === "string" ? v : "all")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {(value) => (
                      <>
                        <User className="h-3.5 w-3.5" />
                        {value === "all"
                          ? "All owners"
                          : (ownerById[value as string]?.name ?? value)}
                      </>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <User className="h-3.5 w-3.5" />
                    All owners
                  </SelectItem>
                  {ownersWithBacklog.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <User className="h-3.5 w-3.5" />
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {facets.manufacturers.length > 0 && (
              <Select
                value={manufacturerFilter}
                onValueChange={(v) =>
                  setManufacturerFilter(typeof v === "string" ? v : "all")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {(value) => (
                      <>
                        <Factory className="h-3.5 w-3.5" />
                        {value === "all" ? "All makers" : (value as string)}
                      </>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <Factory className="h-3.5 w-3.5" />
                    All makers
                  </SelectItem>
                  {facets.manufacturers.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <Factory className="h-3.5 w-3.5" />
                      {f.value}
                      <span className="ml-auto pl-2 font-mono text-xs text-muted-foreground">
                        {f.count}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {facets.steels.length > 0 && (
              <Select
                value={steelFilter}
                onValueChange={(v) =>
                  setSteelFilter(typeof v === "string" ? v : "all")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {(value) => (
                      <>
                        <Atom className="h-3.5 w-3.5" />
                        {value === "all" ? "All steels" : (value as string)}
                      </>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <Atom className="h-3.5 w-3.5" />
                    All steels
                  </SelectItem>
                  {facets.steels.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <Atom className="h-3.5 w-3.5" />
                      {f.value}
                      <span className="ml-auto pl-2 font-mono text-xs text-muted-foreground">
                        {f.count}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          </div>

          {sort === "manual" && filtersActive && (
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
          ) : dndEnabled ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredSorted.map((k) => k.id)}
                strategy={rectSortingStrategy}
              >
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSorted.map((k) => (
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
        </>
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
