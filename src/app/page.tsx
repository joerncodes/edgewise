"use client";

import { ChevronRight, Inbox, PocketKnife, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnifeCard, lastSession } from "@/components/knife-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { inBacklog } from "@/lib/backlog";
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
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

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
    const filtered = knives.filter((k) => {
      if (ownerFilter !== "all" && k.ownerId !== ownerFilter) return false;
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
        // Never-sharpened first, then oldest last-sharpened date.
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
  }, [knives, ownerById, ownerFilter, q, sort]);

  const now = useMemo(() => new Date(), []);

  const backlogCount = useMemo(
    () => knives.filter(inBacklog).length,
    [knives],
  );

  // Hero: the most recently sharpened knife with a cover image. Pinned
  // independent of sort, hidden when search or owner filter is active
  // (the hero is a landing-page focal point, not a search result).
  const isFilterActive = q.trim() !== "" || ownerFilter !== "all";
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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <PocketKnife className="h-7 w-7" />
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
      </header>

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

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search owner, name, type, steel…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 max-w-sm flex-1 min-w-[12rem]"
        />
        <Select
          value={ownerFilter}
          onValueChange={(v) => setOwnerFilter(typeof v === "string" ? v : "all")}
        >
          <SelectTrigger className="h-9">
            <SelectValue>
              {(value) => (
                <>
                  <User className="h-3.5 w-3.5" />
                  {value === "all" ? "All owners" : (ownerById[value as string]?.name ?? value)}
                </>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <User className="h-3.5 w-3.5" />
              All owners
            </SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <User className="h-3.5 w-3.5" />
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          hint="Clear the search or change the owner filter."
        />
      ) : (
        <div className="space-y-6">
          {heroKnife && (
            <div className="space-y-2 md:relative md:left-1/2 md:-translate-x-1/2 md:w-[min(80rem,calc(100vw-2rem))]">
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
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}

