"use client";

import { Inbox, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { inBacklog } from "@/lib/backlog";
import type { Knife, Owner } from "@/lib/storage/types";

type SortKey = "oldest" | "newest" | "owner";

const SORT_LABELS: Record<SortKey, string> = {
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
  const [sort, setSort] = useState<SortKey>("oldest");

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
    const filtered = backlog.filter((k) => {
      if (ownerFilter !== "all" && k.ownerId !== ownerFilter) return false;
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
      case "oldest":
        return [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "newest":
        return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "owner":
        return [...filtered].sort((a, b) => cmpOwner(a, b) || a.name.localeCompare(b.name));
    }
  }, [backlog, ownerById, ownerFilter, q, sort]);

  const now = useMemo(() => new Date(), []);

  // Only show the owner filter for owners that actually have backlog
  // items — otherwise the dropdown advertises empty filters.
  const ownersWithBacklog = useMemo(() => {
    const ids = new Set(backlog.map((k) => k.ownerId));
    return owners.filter((o) => ids.has(o.id));
  }, [backlog, owners]);

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
            <Select
              value={sort}
              onValueChange={(v) =>
                setSort((typeof v === "string" ? v : "oldest") as SortKey)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue>
                  {(value) => SORT_LABELS[value as SortKey] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">{SORT_LABELS.oldest}</SelectItem>
                <SelectItem value="newest">{SORT_LABELS.newest}</SelectItem>
                <SelectItem value="owner">{SORT_LABELS.owner}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredSorted.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              hint="Clear the search or change the owner filter."
            />
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
