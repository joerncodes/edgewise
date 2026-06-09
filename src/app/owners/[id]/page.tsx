"use client";

import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KnifeCard } from "@/components/knife-card";
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

  const now = useMemo(() => new Date(), []);

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
          <User className="h-3 w-3" />
          All owners
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <User className="h-8 w-8" />
          {owner.name}
        </h1>
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
        <SectionLabel>
          {knives.length === 1 ? "1 knife" : `${knives.length} knives`}
        </SectionLabel>
        {knives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No knives for this owner yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knives.map((k) => (
              <li key={k.id}>
                <KnifeCard knife={k} owner={owner} now={now} />
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
