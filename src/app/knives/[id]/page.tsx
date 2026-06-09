"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

export default function KnifeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [knife, setKnife] = useState<Knife | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getKnife(id)
      .then(async (k) => {
        setKnife(k);
        if (k.ownerId) {
          try {
            setOwner(await api.getOwner(k.ownerId));
          } catch {
            // owner may have been deleted directly via files; ignore
          }
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!knife) return <p className="text-muted-foreground">Not found.</p>;

  const sortedSessions = [...knife.sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/knives" className="text-sm text-muted-foreground hover:underline">
          ← All knives
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{knife.name}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Owner:{" "}
          {owner ? (
            <Link href={`/owners/${owner.id}`} className="hover:underline">
              {owner.name}
            </Link>
          ) : (
            <span>{knife.ownerId}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Detail label="Manufacturer" value={knife.manufacturer} />
          <Detail label="Steel" value={knife.steel} />
          <Detail
            label="Type"
            value={knife.type ? <Badge variant="secondary">{knife.type}</Badge> : ""}
          />
          {knife.notes && (
            <div>
              <div className="text-muted-foreground">Notes</div>
              <p className="mt-1 whitespace-pre-wrap">{knife.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {knife.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images ({knife.images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {knife.images.map((img) => (
                <figure key={img.filename} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={api.imageUrl(knife.id, img.filename)}
                    alt={img.caption || knife.name}
                    className="w-full rounded-md border object-cover"
                  />
                  {img.caption && (
                    <figcaption className="text-xs text-muted-foreground">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sharpening sessions ({knife.sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sortedSessions.map((s, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="tabular-nums text-muted-foreground">{s.date}</span>
                  <span className="font-medium">{s.angle}°</span>
                  {s.notes && <span className="text-muted-foreground">— {s.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
