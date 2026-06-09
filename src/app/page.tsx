"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

export default function HomePage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSessions = knives.reduce((sum, k) => sum + k.sessions.length, 0);
  const recent = knives
    .flatMap((k) => k.sessions.map((s) => ({ knife: k, session: s })))
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Knives" value={knives.length} href="/knives" />
            <Stat label="Owners" value={owners.length} href="/owners" />
            <Stat label="Sharpenings" value={totalSessions} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent sharpenings</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sharpenings yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {recent.map(({ knife, session }, i) => (
                    <li key={`${knife.id}-${i}`} className="flex items-center gap-3">
                      <span className="text-muted-foreground tabular-nums">{session.date}</span>
                      <Link href={`/knives/${knife.id}`} className="font-medium hover:underline">
                        {knife.name}
                      </Link>
                      <span className="text-muted-foreground">@ {session.angle}°</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
