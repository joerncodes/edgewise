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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ago, formatDate, KnifeCard, lastSession } from "@/components/knife-card";
import { Stars } from "@/components/stars";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/storage/ids";
import { cn } from "@/lib/utils";
import type { Knife, Owner } from "@/lib/storage/types";
import type { ViewMode } from "@/components/list-view-toggle";

export type KnivesViewColumn =
  | "thumbnail"
  | "name"
  | "owner"
  | "manufacturer"
  | "type"
  | "steel"
  | "lastSharpened"
  | "lastAngle"
  | "sessions"
  | "rating"
  | "added";

export const ALL_COLUMNS: KnivesViewColumn[] = [
  "thumbnail",
  "name",
  "owner",
  "manufacturer",
  "type",
  "steel",
  "lastSharpened",
  "lastAngle",
  "sessions",
  "rating",
];

export const BACKLOG_COLUMNS: KnivesViewColumn[] = [
  "thumbnail",
  "name",
  "owner",
  "manufacturer",
  "type",
  "steel",
  "added",
];

export function columnsForVariant(variant: "all" | "backlog"): KnivesViewColumn[] {
  return variant === "backlog" ? BACKLOG_COLUMNS : ALL_COLUMNS;
}

export function KnivesView({
  knives,
  owners,
  now,
  mode,
  variant = "all",
  hideColumns,
  gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
  renderCardItem,
  onReorder,
}: {
  knives: Knife[];
  owners: Owner[];
  now: Date;
  mode: ViewMode;
  variant?: "all" | "backlog";
  hideColumns?: KnivesViewColumn[];
  gridClassName?: string;
  // Lets the backlog page wrap each card in its dnd sortable handle.
  // Absent → render a plain <li><KnifeCard/></li>.
  renderCardItem?: (knife: Knife, owner: Owner | undefined) => React.ReactNode;
  // Table-mode dnd. When present, the table grows a drag-handle column
  // and rows can be reordered. Caller is responsible for persistence.
  onReorder?: (ids: string[]) => void;
}) {
  const ownerById = Object.fromEntries(owners.map((o) => [o.id, o]));

  if (mode === "cards") {
    return (
      <ul className={gridClassName}>
        {knives.map((k) => {
          const owner = ownerById[k.ownerId];
          if (renderCardItem) return renderCardItem(k, owner);
          return (
            <li key={k.id}>
              <KnifeCard knife={k} owner={owner} now={now} />
            </li>
          );
        })}
      </ul>
    );
  }

  const base = variant === "backlog" ? BACKLOG_COLUMNS : ALL_COLUMNS;
  const hidden = new Set(hideColumns ?? []);
  const columns = base.filter((c) => !hidden.has(c));

  return (
    <KnivesTable
      knives={knives}
      ownerById={ownerById}
      now={now}
      columns={columns}
      onReorder={onReorder}
    />
  );
}

const COLUMN_LABELS: Record<KnivesViewColumn, string> = {
  thumbnail: "",
  name: "Name",
  owner: "Owner",
  manufacturer: "Manufacturer",
  type: "Type",
  steel: "Steel",
  lastSharpened: "Last sharpened",
  lastAngle: "Last angle",
  sessions: "Sessions",
  rating: "Rating",
  added: "Added",
};

function KnivesTable({
  knives,
  ownerById,
  now,
  columns,
  onReorder,
}: {
  knives: Knife[];
  ownerById: Record<string, Owner>;
  now: Date;
  columns: KnivesViewColumn[];
  onReorder?: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || !onReorder || active.id === over.id) return;
    const ids = knives.map((k) => k.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  const body = (
    <TableBody>
      {knives.map((k) => (
        <KnifeRow
          key={k.id}
          knife={k}
          owner={ownerById[k.ownerId]}
          now={now}
          columns={columns}
          sortable={Boolean(onReorder)}
        />
      ))}
    </TableBody>
  );

  const table = (
    <Table>
      <TableHeader>
        <TableRow className="border-border/70 hover:bg-transparent">
          {onReorder && (
            <TableHead className="w-8" aria-label="Drag to reorder" />
          )}
          {columns.map((c) => (
            <TableHead
              key={c}
              className={cn(
                "font-heading text-[11px] uppercase tracking-wider text-muted-foreground",
                c === "thumbnail" && "w-12",
                c === "sessions" && "text-right",
                c === "rating" && "text-right",
              )}
            >
              {COLUMN_LABELS[c]}
            </TableHead>
          ))}
          <TableHead className="w-6" aria-hidden />
        </TableRow>
      </TableHeader>
      {onReorder ? (
        <SortableContext
          items={knives.map((k) => k.id)}
          strategy={verticalListSortingStrategy}
        >
          {body}
        </SortableContext>
      ) : (
        body
      )}
    </Table>
  );

  if (!onReorder) return table;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {table}
    </DndContext>
  );
}

function KnifeRow({
  knife,
  owner,
  now,
  columns,
  sortable,
}: {
  knife: Knife;
  owner?: Owner;
  now: Date;
  columns: KnivesViewColumn[];
  sortable: boolean;
}) {
  const router = useRouter();
  // useSortable is always rendered when sortable=true. When sortable=false
  // we still call it to keep hook order stable, but ignore the result.
  const sortableState = useSortable({ id: knife.id, disabled: !sortable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortableState;
  const last = lastSession(knife);
  const cover = knife.images[0];
  const ownerName = owner?.name ?? knife.ownerId;
  const href = `/knives/${knife.id}`;

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  return (
    <TableRow
      ref={sortable ? setNodeRef : undefined}
      style={style}
      onClick={() => router.push(href)}
      className={cn(
        "group cursor-pointer border-border/50 hover:bg-muted/40",
        isDragging && "relative z-10 bg-muted/60",
      )}
    >
      {sortable && (
        <TableCell
          className="w-8 px-1 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={`Drag to reorder ${knife.name}`}
            className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      {columns.map((c) => {
        switch (c) {
          case "thumbnail":
            return (
              <TableCell key={c} className="py-1.5">
                <div className="h-10 w-10 overflow-hidden rounded-md bg-muted/40">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={api.imageUrl(knife.id, cover.filename, "thumb")}
                      alt=""
                      className="h-10 w-10 object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </TableCell>
            );
          case "name":
            return (
              <TableCell key={c} className="font-medium text-foreground">
                <Link
                  href={href}
                  className="relative z-10 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {knife.name}
                </Link>
              </TableCell>
            );
          case "owner":
            return (
              <TableCell key={c} className="text-brass">
                <Link
                  href={`/owners/${knife.ownerId}`}
                  className="relative z-10 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ownerName}
                </Link>
              </TableCell>
            );
          case "manufacturer":
            return (
              <TableCell key={c}>
                {knife.manufacturer ? (
                  <Link
                    href={`/manufacturers/${slugify(knife.manufacturer)}`}
                    className="relative z-10 text-brass hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {knife.manufacturer}
                  </Link>
                ) : (
                  <Empty />
                )}
              </TableCell>
            );
          case "type":
            return (
              <TableCell key={c}>
                {knife.type ? (
                  <Link
                    href={`/types/${slugify(knife.type)}`}
                    className="relative z-10 text-steel hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {knife.type}
                  </Link>
                ) : (
                  <Empty />
                )}
              </TableCell>
            );
          case "steel":
            return (
              <TableCell key={c} className="font-mono text-xs uppercase tracking-wider">
                {knife.steel ? (
                  <Link
                    href={`/steels/${slugify(knife.steel)}`}
                    className="relative z-10 text-muted-foreground hover:text-foreground hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {knife.steel}
                  </Link>
                ) : (
                  <Empty />
                )}
              </TableCell>
            );
          case "lastSharpened":
            return (
              <TableCell key={c}>
                {last ? (
                  <span className="flex flex-col leading-tight">
                    <span className="font-mono text-xs">{formatDate(last.date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {ago(last.date, now)}
                    </span>
                  </span>
                ) : (
                  <Empty />
                )}
              </TableCell>
            );
          case "lastAngle":
            return (
              <TableCell key={c} className="font-mono text-xs">
                {last ? `${last.angle}°/side` : <Empty />}
              </TableCell>
            );
          case "sessions":
            return (
              <TableCell key={c} className="text-right font-mono text-xs tabular-nums">
                {knife.sessions.length}
              </TableCell>
            );
          case "rating":
            return (
              <TableCell key={c} className="text-right">
                {last?.rating !== undefined ? (
                  <span className="inline-flex justify-end">
                    <Stars value={last.rating} />
                  </span>
                ) : (
                  <Empty />
                )}
              </TableCell>
            );
          case "added":
            return (
              <TableCell key={c} className="text-xs text-muted-foreground">
                {ago(knife.createdAt.slice(0, 10), now)}
              </TableCell>
            );
        }
      })}
      <TableCell className="w-6 text-muted-foreground/40 group-hover:text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
      </TableCell>
    </TableRow>
  );
}

function Empty() {
  return <span className="text-muted-foreground/50">—</span>;
}
