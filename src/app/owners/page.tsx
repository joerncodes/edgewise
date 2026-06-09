"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import type { Owner } from "@/lib/storage/types";

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listOwners()
      .then(setOwners)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Owners</h1>
        <span className="text-sm text-muted-foreground">
          Create / edit via the API — see <code>docs/api.md</code>.
        </span>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : owners.length === 0 ? (
        <p className="text-muted-foreground">No owners yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/owners/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{o.contact || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
