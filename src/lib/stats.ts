import type { Knife, Owner } from "./storage/types";

export interface SessionsByMonth {
  month: string; // YYYY-MM
  count: number;
}

export interface SessionsByOwner {
  ownerId: string;
  ownerName: string;
  count: number;
}

export interface KnifeBySessionCount {
  id: string;
  name: string;
  ownerId: string;
  count: number;
}

export interface CountByLabel {
  label: string;
  count: number;
}

export interface AngleBucket {
  bucket: string; // e.g. "15"
  count: number;
}

export interface DailySessionCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface OverdueEntry {
  id: string;
  name: string;
  ownerId: string;
  lastDate: string | null;
  daysSince: number | null; // null = never sharpened
}

export interface Stats {
  totals: {
    knives: number;
    owners: number;
    sessions: number;
  };
  sessionsByMonth: SessionsByMonth[];
  sessionsByOwner: SessionsByOwner[];
  topKnivesBySessions: KnifeBySessionCount[];
  knivesBySteel: CountByLabel[];
  knivesByType: CountByLabel[];
  angleHistogram: AngleBucket[];
  longestGap: OverdueEntry[];
  // Dense list of one entry per day for the rolling 53-week window
  // ending today, oldest first. Anchored to a Monday so it packs into
  // a 53-column x 7-row grid cleanly.
  dailySessionCounts: DailySessionCount[];
  generatedAt: string;
}

const MONTH_WINDOW = 24;
const HEATMAP_WEEKS = 53;

function ymKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function thisMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const ms = to.getTime() - from;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function computeStats(
  knives: Knife[],
  owners: Owner[],
  now: Date = new Date(),
): Stats {
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  // --- totals
  const totalSessions = knives.reduce((acc, k) => acc + k.sessions.length, 0);

  // --- sessions by month (dense window, gaps included)
  const monthCounts = new Map<string, number>();
  for (const k of knives) {
    for (const s of k.sessions) {
      const key = ymKey(s.date);
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
  }
  const sessionsByMonth: SessionsByMonth[] = [];
  let cursor = thisMonth(now);
  for (let i = 0; i < MONTH_WINDOW; i++) {
    sessionsByMonth.unshift({ month: cursor, count: monthCounts.get(cursor) ?? 0 });
    cursor = previousMonth(cursor);
  }

  // --- sessions by owner
  const perOwner = new Map<string, number>();
  for (const k of knives) {
    perOwner.set(k.ownerId, (perOwner.get(k.ownerId) ?? 0) + k.sessions.length);
  }
  const sessionsByOwner: SessionsByOwner[] = [...perOwner.entries()]
    .map(([ownerId, count]) => ({
      ownerId,
      ownerName: ownerById.get(ownerId)?.name ?? ownerId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.ownerName.localeCompare(b.ownerName));

  // --- top knives by session count
  const topKnivesBySessions: KnifeBySessionCount[] = [...knives]
    .map((k) => ({
      id: k.id,
      name: k.name,
      ownerId: k.ownerId,
      count: k.sessions.length,
    }))
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);

  // --- knives by steel / type — case-insensitive group, display most-common spelling
  const knivesBySteel = groupCountedLabel(knives.map((k) => k.steel));
  const knivesByType = groupCountedLabel(knives.map((k) => k.type));

  // --- angle histogram — bucket to whole degrees
  const angleCounts = new Map<number, number>();
  for (const k of knives) {
    for (const s of k.sessions) {
      const b = Math.round(s.angle);
      angleCounts.set(b, (angleCounts.get(b) ?? 0) + 1);
    }
  }
  const angleHistogram: AngleBucket[] = [...angleCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ bucket: `${bucket}°`, count }));

  // --- longest gap since last session
  const longestGap: OverdueEntry[] = knives
    .map((k) => {
      const last = k.sessions.reduce<string | null>(
        (acc, s) => (acc === null || s.date > acc ? s.date : acc),
        null,
      );
      return {
        id: k.id,
        name: k.name,
        ownerId: k.ownerId,
        lastDate: last,
        daysSince: last ? daysBetween(last, now) : null,
      };
    })
    .sort((a, b) => {
      // Never-sharpened first, then oldest last-date.
      if (a.daysSince === null && b.daysSince === null) return a.name.localeCompare(b.name);
      if (a.daysSince === null) return -1;
      if (b.daysSince === null) return 1;
      return b.daysSince - a.daysSince;
    })
    .slice(0, 10);

  // --- daily session counts for the heatmap. Anchor the window to the
  // Monday HEATMAP_WEEKS weeks before the Monday of the current week so
  // the result always fills a 53x7 grid cleanly.
  const dayCounts = new Map<string, number>();
  for (const k of knives) {
    for (const s of k.sessions) {
      dayCounts.set(s.date, (dayCounts.get(s.date) ?? 0) + 1);
    }
  }

  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  // Date.getUTCDay(): 0=Sun..6=Sat. Treat Monday as start of week.
  const dayOfWeek = (new Date(todayUtc).getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const startMs = todayUtc - (dayOfWeek + (HEATMAP_WEEKS - 1) * 7) * 86_400_000;

  const dailySessionCounts: DailySessionCount[] = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(startMs + i * 86_400_000);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
    dailySessionCounts.push({ date: iso, count: dayCounts.get(iso) ?? 0 });
  }

  return {
    totals: {
      knives: knives.length,
      owners: owners.length,
      sessions: totalSessions,
    },
    sessionsByMonth,
    sessionsByOwner,
    topKnivesBySessions,
    knivesBySteel,
    knivesByType,
    angleHistogram,
    longestGap,
    dailySessionCounts,
    generatedAt: now.toISOString(),
  };
}

function groupCountedLabel(values: (string | undefined | null)[]): CountByLabel[] {
  const buckets = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const raw of values) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    let b = buckets.get(key);
    if (!b) {
      b = { spellings: new Map(), count: 0 };
      buckets.set(key, b);
    }
    b.spellings.set(trimmed, (b.spellings.get(trimmed) ?? 0) + 1);
    b.count += 1;
  }
  return [...buckets.values()]
    .map((b) => {
      const top = [...b.spellings.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0];
      return { label: top, count: b.count };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
