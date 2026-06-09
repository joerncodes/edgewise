"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

export default function KnivesPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerById = useMemo(
    () => Object.fromEntries(owners.map((o) => [o.id, o])),
    [owners],
  );

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Knives</h1>
        <span className="text-sm text-muted-foreground">
          Create / edit via the API — see <code>docs/api.md</code>.
        </span>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : knives.length === 0 ? (
        <p className="text-muted-foreground">No knives yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last sharpened</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {knives.map((k) => {
              const last = k.sessions.at(-1);
              return (
                <TableRow key={k.id}>
                  <TableCell>
                    <Link href={`/knives/${k.id}`} className="font-medium hover:underline">
                      {k.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ownerById[k.ownerId]?.name ?? k.ownerId}
                  </TableCell>
                  <TableCell>
                    {k.type && <Badge variant="secondary">{k.type}</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {last ? `${last.date} @ ${last.angle}°` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{k.sessions.length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
