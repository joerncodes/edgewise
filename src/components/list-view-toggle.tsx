"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ViewMode = "cards" | "table";

const STORAGE_KEY = "edgewise:list-view";

// Default to "cards" during SSR and first paint, then sync from
// localStorage on mount. Cross-page navigations and other tabs
// updating the value re-render through the storage subscription.
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((next: ViewMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, disabled storage).
    }
    // Same-tab subscribers don't fire on `storage`; nudge them.
    window.dispatchEvent(new Event(VIEW_MODE_EVENT));
  }, []);

  return [mode, setMode];
}

const VIEW_MODE_EVENT = "edgewise:view-mode";

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(VIEW_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VIEW_MODE_EVENT, callback);
  };
}

function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "cards" || stored === "table") return stored;
  } catch {
    // ignore
  }
  return "cards";
}

function getServerSnapshot(): ViewMode {
  return "cards";
}

export function ListViewToggle({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}) {
  return (
    <ToggleGroup
      value={[mode]}
      onValueChange={(v) => {
        const next = v[0];
        if (next === "cards" || next === "table") onModeChange(next);
      }}
      variant="outline"
      spacing={0}
      className="hidden h-9 md:inline-flex"
      aria-label="List view"
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <ToggleGroupItem value="cards" aria-label="Cards" className="h-9 px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          }
        />
        <TooltipContent>Cards</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <ToggleGroupItem value="table" aria-label="Table" className="h-9 px-2.5">
              <Rows3 className="h-4 w-4" />
            </ToggleGroupItem>
          }
        />
        <TooltipContent>Table</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
