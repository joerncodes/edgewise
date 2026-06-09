"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Knife, Owner, SharpeningSession } from "@/lib/storage/types";

type SortKey = "overdue" | "recent" | "owner" | "added";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

function ago(iso: string, now: Date): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const then = new Date(y, m - 1, d);
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return rtf.format(-days, "day");
  if (days < 60) return rtf.format(-Math.round(days / 7), "week");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

function lastSession(k: Knife): SharpeningSession | undefined {
  if (k.sessions.length === 0) return undefined;
  return [...k.sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export default function HomePage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("overdue");

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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-brass">Edgewise</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{knives.length}</span>{" "}
          {knives.length === 1 ? "knife" : "knives"}
          <span className="mx-2">·</span>
          <span className="font-mono">{owners.length}</span>{" "}
          {owners.length === 1 ? "owner" : "owners"}
        </p>
      </header>

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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overdue">Longest since sharpened</SelectItem>
            <SelectItem value="recent">Most recently sharpened</SelectItem>
            <SelectItem value="owner">Owner A–Z</SelectItem>
            <SelectItem value="added">Most recently added</SelectItem>
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
    </div>
  );
}

function KnifeCard({ knife, owner, now }: { knife: Knife; owner?: Owner; now: Date }) {
  const [showHistory, setShowHistory] = useState(false);
  const last = lastSession(knife);
  const ownerName = owner?.name ?? knife.ownerId;
  const sortedSessions = [...knife.sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article className="group flex h-full flex-col rounded-lg border border-border/70 bg-card/30 p-4 transition-colors hover:border-border">
      <Link href={`/knives/${knife.id}`} className="block space-y-3">
        <div className="font-heading text-xs uppercase tracking-wider text-brass">
          {ownerName}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight text-foreground group-hover:underline">
            {knife.name}
          </h2>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {knife.type && (
            <span className="text-muted-foreground">{knife.type}</span>
          )}
          {knife.steel && (
            <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {knife.steel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          {last ? (
            <>
              <EdgeV angle={last.angle} />
              <div className="font-mono text-sm leading-tight">
                <div className="text-foreground">{last.angle}°/side</div>
                <div className="text-xs text-muted-foreground">
                  {last.angle * 2}° inclusive
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs italic text-muted-foreground">
              No bevel recorded yet
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {last ? (
            <>
              <span className="font-mono">{formatDate(last.date)}</span>
              <span className="mx-1.5">·</span>
              <span>{ago(last.date, now)}</span>
            </>
          ) : (
            <span>Never sharpened</span>
          )}
        </div>

        {knife.notes && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {knife.notes}
          </p>
        )}
      </Link>

      {sortedSessions.length > 0 && (
        <div className="mt-3 border-t border-border/50 pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={showHistory}
          >
            <span>
              History ({sortedSessions.length}{" "}
              {sortedSessions.length === 1 ? "sharpening" : "sharpenings"})
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showHistory && "rotate-180",
              )}
            />
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-2 text-xs">
              {sortedSessions.map((s, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 font-mono">
                    <span className="text-muted-foreground">{formatDate(s.date)}</span>
                    <span className="text-foreground">{s.angle}°</span>
                  </div>
                  {s.notes && (
                    <p className="leading-snug text-muted-foreground">{s.notes}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}

function EdgeV({ angle }: { angle: number }) {
  // Knife-edge cross-section: apex pointing down, spine opening up.
  // The per-side angle is measured from the vertical centerline, so a
  // smaller angle visibly produces a narrower edge.
  const len = 24;
  const rad = (angle * Math.PI) / 180;
  const dx = len * Math.sin(rad);
  const dy = len * Math.cos(rad);
  const apex = { x: 16, y: 26 };
  return (
    <svg
      width="32"
      height="28"
      viewBox="0 0 32 28"
      aria-hidden
      className="shrink-0"
    >
      <line
        x1={apex.x}
        y1={apex.y}
        x2={apex.x - dx}
        y2={apex.y - dy}
        stroke="var(--brass)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <line
        x1={apex.x}
        y1={apex.y}
        x2={apex.x + dx}
        y2={apex.y - dy}
        stroke="var(--brass)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
