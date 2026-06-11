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
  // Per-facet options. Each facet's counts are narrowed by the *other*
  // active facets — that's the cross-narrowing behaviour. Values that
  // would drop to zero stay in the list but render disabled.
  const options = useMemo(() => {
    const out: Record<FacetKey, FacetValue[]> = {
      owner: [],
      manufacturer: [],
      type: [],
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
                      onClick={() => onChange(clearFacet(state, key))}
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
                              onCheckedChange={() =>
                                onChange(toggleFilter(state, key, opt.value))
                              }
                            />
                            <span className="flex-1 leading-tight">
                              {labelFor(key, opt.value)}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {opt.count}
                            </span>
                          </label>
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
