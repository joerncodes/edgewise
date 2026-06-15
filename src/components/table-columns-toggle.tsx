"use client";

import { Columns3 } from "lucide-react";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KnivesViewColumn } from "@/components/knives-view";

// thumbnail + name are structural — the table is useless without the name,
// and the thumbnail column is a fixed 12px gutter that doesn't bloat width.
const PINNED: KnivesViewColumn[] = ["thumbnail", "name"];

const COLUMN_LABELS: Record<KnivesViewColumn, string> = {
  thumbnail: "Thumbnail",
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

export interface TableColumnsControl {
  hideColumns: KnivesViewColumn[];
  toggleable: KnivesViewColumn[];
  isHidden: (c: KnivesViewColumn) => boolean;
  toggle: (c: KnivesViewColumn) => void;
}

export function useTableColumns({
  routeKey,
  available,
  pageHidden,
}: {
  routeKey: string;
  available: KnivesViewColumn[];
  pageHidden?: KnivesViewColumn[];
}): TableColumnsControl {
  const storageKey = `edgewise:table-columns:${routeKey}`;
  const fixed = useMemo(() => new Set(pageHidden ?? []), [pageHidden]);
  const toggleable = useMemo(
    () => available.filter((c) => !fixed.has(c) && !PINNED.includes(c)),
    [available, fixed],
  );
  const toggleableSet = useMemo(() => new Set(toggleable), [toggleable]);

  const userHiddenCsv = useSyncExternalStore(
    (cb) => subscribe(storageKey, cb),
    () => readUserHidden(storageKey),
    () => "",
  );

  const userHidden = useMemo(() => {
    if (!userHiddenCsv) return new Set<KnivesViewColumn>();
    const parts = userHiddenCsv.split(",").filter(Boolean) as KnivesViewColumn[];
    return new Set(parts.filter((c) => toggleableSet.has(c)));
  }, [userHiddenCsv, toggleableSet]);

  const toggle = useCallback(
    (c: KnivesViewColumn) => {
      const next = new Set(userHidden);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      writeUserHidden(storageKey, Array.from(next));
    },
    [storageKey, userHidden],
  );

  const hideColumns = useMemo<KnivesViewColumn[]>(
    () => [...fixed, ...userHidden],
    [fixed, userHidden],
  );

  const isHidden = useCallback((c: KnivesViewColumn) => userHidden.has(c), [userHidden]);

  return { hideColumns, toggleable, isHidden, toggle };
}

export function TableColumnsToggle({
  control,
}: {
  control: TableColumnsControl;
}) {
  const { toggleable, isHidden, toggle } = control;
  if (toggleable.length === 0) return null;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label="Toggle columns"
              className="hidden h-9 items-center justify-center rounded-md border border-input bg-background px-2.5 text-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
            >
              <Columns3 className="h-4 w-4" />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>Columns</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44">
        {toggleable.map((c) => (
          <DropdownMenuCheckboxItem
            key={c}
            checked={!isHidden(c)}
            closeOnClick={false}
            onCheckedChange={() => toggle(c)}
          >
            {COLUMN_LABELS[c]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function readUserHidden(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeUserHidden(key: string, hidden: string[]) {
  try {
    if (hidden.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, hidden.join(","));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

const EVENT = "edgewise:table-columns";

function subscribe(key: string, callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) callback();
  };
  const onCustom = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
  };
}
