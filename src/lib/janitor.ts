import type { Knife, Owner } from "./storage/types";

export interface KnifeRef {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
}

export interface StaleKnifeRef extends KnifeRef {
  lastDate: string;
  daysSince: number;
}

export interface Janitor {
  noPhoto: KnifeRef[];
  noSessions: KnifeRef[];
  noSteel: KnifeRef[];
  noType: KnifeRef[];
  noManufacturer: KnifeRef[];
  noNotes: KnifeRef[];
  stale: StaleKnifeRef[];
  staleAfterDays: number;
  generatedAt: string;
}

function ref(k: Knife, ownerName: string): KnifeRef {
  return { id: k.id, name: k.name, ownerId: k.ownerId, ownerName };
}

function lastSessionDate(k: Knife): string | null {
  return k.sessions.reduce<string | null>(
    (acc, s) => (acc === null || s.date > acc ? s.date : acc),
    null,
  );
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((to.getTime() - from) / 86_400_000));
}

export function computeJanitor(
  knives: Knife[],
  owners: Owner[],
  now: Date = new Date(),
  staleAfterDays = 365,
): Janitor {
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const nameOf = (k: Knife) => ownerById.get(k.ownerId)?.name ?? k.ownerId;

  const noPhoto: KnifeRef[] = [];
  const noSessions: KnifeRef[] = [];
  const noSteel: KnifeRef[] = [];
  const noType: KnifeRef[] = [];
  const noManufacturer: KnifeRef[] = [];
  const noNotes: KnifeRef[] = [];
  const stale: StaleKnifeRef[] = [];

  for (const k of knives) {
    const r = ref(k, nameOf(k));
    if (k.images.length === 0) noPhoto.push(r);
    if (k.sessions.length === 0) noSessions.push(r);
    if (!(k.steel ?? "").trim()) noSteel.push(r);
    if (!(k.type ?? "").trim()) noType.push(r);
    if (!(k.manufacturer ?? "").trim()) noManufacturer.push(r);
    if (!(k.notes ?? "").trim()) noNotes.push(r);

    const last = lastSessionDate(k);
    if (last) {
      const days = daysBetween(last, now);
      if (days > staleAfterDays) {
        stale.push({ ...r, lastDate: last, daysSince: days });
      }
    }
  }

  const byName = (a: KnifeRef, b: KnifeRef) => a.name.localeCompare(b.name);
  noPhoto.sort(byName);
  noSessions.sort(byName);
  noSteel.sort(byName);
  noType.sort(byName);
  noManufacturer.sort(byName);
  noNotes.sort(byName);
  stale.sort((a, b) => b.daysSince - a.daysSince);

  return {
    noPhoto,
    noSessions,
    noSteel,
    noType,
    noManufacturer,
    noNotes,
    stale,
    staleAfterDays,
    generatedAt: now.toISOString(),
  };
}
