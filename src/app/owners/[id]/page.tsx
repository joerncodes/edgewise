"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!owner) return <p className="text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owners" className="text-sm text-muted-foreground hover:underline">
          ← All owners
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{owner.name}</h1>
        {owner.contact && (
          <p className="text-sm text-muted-foreground">{owner.contact}</p>
        )}
      </div>

      {owner.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{owner.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Knives ({knives.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {knives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No knives for this owner yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {knives.map((k) => (
                <li key={k.id}>
                  <Link href={`/knives/${k.id}`} className="font-medium hover:underline">
                    {k.name}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    {k.sessions.length} session{k.sessions.length === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
