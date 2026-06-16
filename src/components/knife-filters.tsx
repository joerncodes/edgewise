"use client";

import { Atom, Factory, Grip, Handshake, Tags, User } from "lucide-react";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FACET_KEYS,
  clearFacet,
  emptyFilterState,
  facetOptions,
  filterStateIsEmpty,
  toggleFilter,
  type FacetKey,
  type FacetValue,
  type FilterState,
} from "@/lib/facets";
import { cn } from "@/lib/utils";
import type { Knife, Owner } from "@/lib/storage/types";

interface FacetMeta {
  key: FacetKey;
  title: string;
  Icon: typeof User;
}

// Visible accordions. `subtype` is a real FacetKey but doesn't get its
// own accordion — it renders nested under the Type values it's observed
// against, so "Pocket Knife → folder" reads as one group.
const FACETS: FacetMeta[] = [
  { key: "owner", title: "Owner", Icon: User },
  { key: "manufacturer", title: "Manufacturer", Icon: Factory },
  { key: "type", title: "Type", Icon: Tags },
  { key: "steel", title: "Steel", Icon: Atom },
  { key: "handle", title: "Handle", Icon: Grip },
];

export function KnifeFilters({
  knives,
  ownerById,
  state,
  onChange,
  onLoanOnly = false,
  onOnLoanOnlyChange,
}: {
  knives: Knife[];
  ownerById: Record<string, Owner>;
  state: FilterState;
  onChange: (s: FilterState) => void;
  onLoanOnly?: boolean;
  onOnLoanOnlyChange?: (v: boolean) => void;
}) {
  const onLoanCount = knives.reduce((n, k) => (k.onLoan ? n + 1 : n), 0);
  const showOnLoanToggle = Boolean(onOnLoanOnlyChange) && onLoanCount > 0;

  // For nesting subtypes under their type. Counts are narrowed by every
  // facet *except* type and subtype themselves, so the row count under
  // each type reflects the same baseline as the parent type count.
  const subtypesByType = useMemo(() => {
    const baseline = knives.filter((k) => {
      for (const key of FACET_KEYS) {
        if (key === "type" || key === "subtype") continue;
        const sel = state[key];
        if (sel.size === 0) continue;
        const v =
          key === "owner"
            ? k.ownerId
            : key === "manufacturer"
              ? k.manufacturer
              : key === "steel"
                ? k.steel
                : k.handle;
        if (typeof v !== "string" || !v.trim()) return false;
        if (!sel.has(v.trim())) return false;
      }
      return true;
    });
    const out = new Map<string, Map<string, number>>();
    for (const k of baseline) {
      const t = (k.type ?? "").trim();
      const s = (k.subtype ?? "").trim();
      if (!t || !s) continue;
      let m = out.get(t);
      if (!m) {
        m = new Map();
        out.set(t, m);
      }
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return out;
  }, [knives, state]);
  // Per-facet options. Each facet's counts are narrowed by the *other*
  // active facets — that's the cross-narrowing behaviour. Values that
  // would drop to zero stay in the list but render disabled.
  const options = useMemo(() => {
    const out: Record<FacetKey, FacetValue[]> = {
      owner: [],
      manufacturer: [],
      type: [],
      subtype: [],
      steel: [],
      handle: [],
    };
    for (const key of FACET_KEYS) out[key] = facetOptions(knives, state, key);
    return out;
  }, [knives, state]);

  // Hide facets whose master list is empty. A fresh install shouldn't
  // show four empty accordions.
  const visibleFacets = FACETS.filter((f) => options[f.key].length > 0);

  // Default open: any facet with active selections, plus the first
  // visible one if nothing is active yet.
  const defaultOpen = useMemo(() => {
    const open = visibleFacets
      .filter((f) => state[f.key].size > 0)
      .map((f) => f.key as string);
    if (open.length === 0 && visibleFacets[0]) open.push(visibleFacets[0].key);
    return open;
  }, [visibleFacets, state]);

  function labelFor(key: FacetKey, value: string): string {
    if (key === "owner") return ownerById[value]?.name ?? value;
    return value;
  }

  // Subtypes are tied to their parent type in the UI. When a type is
  // unticked (or the whole Type facet is cleared), drop any subtype
  // selections that were nested under it — otherwise they linger as
  // invisible "subtype=folder" filters with no parent checkbox in
  // sight.
  function clearSubtypesUnder(s: FilterState, typeValue: string): FilterState {
    const subs = subtypesByType.get(typeValue);
    if (!subs || subs.size === 0 || s.subtype.size === 0) return s;
    const nextSubtype = new Set(s.subtype);
    let changed = false;
    for (const sv of subs.keys()) {
      if (nextSubtype.delete(sv)) changed = true;
    }
    return changed ? { ...s, subtype: nextSubtype } : s;
  }

  if (visibleFacets.length === 0 && !showOnLoanToggle) {
    return (
      <p className="text-xs text-muted-foreground">
        No filterable values yet.
      </p>
    );
  }

  const anyActive = !filterStateIsEmpty(state) || onLoanOnly;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
          Filters
        </h2>
        {anyActive && (
          <button
            type="button"
            onClick={() => {
              onChange(emptyFilterState());
              onOnLoanOnlyChange?.(false);
            }}
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      {showOnLoanToggle && (
        <label
          htmlFor="f-on-loan"
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-sm hover:bg-muted/40"
        >
          <Checkbox
            id="f-on-loan"
            checked={onLoanOnly}
            onCheckedChange={(v) => onOnLoanOnlyChange?.(Boolean(v))}
          />
          <Handshake className="h-3.5 w-3.5" />
          <span className="flex-1 leading-tight">On loan only</span>
          <span className="font-mono text-xs text-muted-foreground">
            {onLoanCount}
          </span>
        </label>
      )}
      <Accordion multiple defaultValue={defaultOpen} className="w-full">
        {visibleFacets.map(({ key, title, Icon }) => {
          const selected = state[key];
          const opts = options[key];
          // Count of *possible* options under the current narrowing —
          // i.e. values that still have at least one matching knife.
          // Updates as other facets tighten, so an empty number means
          // "this facet would empty the result if you pick anything".
          const possibleCount = opts.reduce(
            (n, o) => (o.count > 0 ? n + 1 : n),
            0,
          );
          return (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>
                <span className="flex flex-1 items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{title}</span>
                  <span className="ml-1 rounded-md bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                    {possibleCount}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {selected.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        let next = clearFacet(state, key);
                        if (key === "type") next = clearFacet(next, "subtype");
                        onChange(next);
                      }}
                      className="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Clear
                    </button>
                  )}
                  <ul className="space-y-1.5">
                    {opts.map((opt) => {
                      const id = `f-${key}-${opt.value}`;
                      const checked = selected.has(opt.value);
                      const zero = opt.count === 0 && !checked;
                      const subs =
                        key === "type"
                          ? [...(subtypesByType.get(opt.value)?.entries() ?? [])].sort(
                              (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
                            )
                          : [];
                      return (
                        <li key={opt.value}>
                          <label
                            htmlFor={id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 text-sm",
                              zero && "cursor-not-allowed opacity-50",
                            )}
                          >
                            <Checkbox
                              id={id}
                              checked={checked}
                              disabled={zero}
                              onCheckedChange={() => {
                                let next = toggleFilter(state, key, opt.value);
                                // unticking a type → drop its tied subtypes
                                if (key === "type" && checked) {
                                  next = clearSubtypesUnder(next, opt.value);
                                }
                                onChange(next);
                              }}
                            />
                            <span className="flex-1 leading-tight">
                              {labelFor(key, opt.value)}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {opt.count}
                            </span>
                          </label>
                          {subs.length > 0 && (
                            <ul className="ml-6 mt-1 space-y-1 border-l border-border/60 pl-2">
                              {subs.map(([sv, sc]) => {
                                const sid = `f-subtype-${opt.value}-${sv}`;
                                // A subtype row is "active" only when both
                                // its parent type and the subtype itself
                                // are selected — that's the tied AND we
                                // want ("Pocket Knife → folder").
                                const schecked =
                                  state.subtype.has(sv) && selected.has(opt.value);
                                return (
                                  <li key={sv}>
                                    <label
                                      htmlFor={sid}
                                      className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      <Checkbox
                                        id={sid}
                                        checked={schecked}
                                        onCheckedChange={() => {
                                          let next = state;
                                          if (schecked) {
                                            next = toggleFilter(next, "subtype", sv);
                                          } else {
                                            if (!next.type.has(opt.value)) {
                                              next = toggleFilter(next, "type", opt.value);
                                            }
                                            if (!next.subtype.has(sv)) {
                                              next = toggleFilter(next, "subtype", sv);
                                            }
                                          }
                                          onChange(next);
                                        }}
                                      />
                                      <span className="flex-1 leading-tight">
                                        {sv}
                                      </span>
                                      <span className="font-mono text-[11px]">
                                        {sc}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
