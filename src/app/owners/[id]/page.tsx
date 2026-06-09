"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOwner(id), api.listKnives()])
      .then(([o, k]) => {
        setOwner(o);
        setKnives(k.filter((knife) => knife.ownerId === id));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!owner) return <p className="text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <Link
          href="/owners"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All owners
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">{owner.name}</h1>
      </header>

      <section>
        <PropertyList>
          <PropertyRow label="Contact">{owner.contact}</PropertyRow>
          <PropertyRow label="Knives">
            <span className="font-mono">{knives.length}</span>
          </PropertyRow>
        </PropertyList>
      </section>

      {owner.notes && (
        <section className="space-y-3">
          <SectionLabel>Notes</SectionLabel>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{owner.notes}</p>
        </section>
      )}

      <section className="space-y-3">
        <SectionLabel>Knives ({knives.length})</SectionLabel>
        {knives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No knives for this owner yet.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-border/70">
            {knives.map((k) => (
              <li key={k.id}>
                <Link
                  href={`/knives/${k.id}`}
                  className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{k.name}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {k.sessions.length} session{k.sessions.length === 1 ? "" : "s"}
                      {k.type && (
                        <>
                          <span className="mx-1.5">·</span>
                          {k.type}
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}
