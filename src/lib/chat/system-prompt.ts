import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  Abrasive,
  Knife,
  Owner,
  SharpeningSession,
} from "@/lib/storage/types";

// Prose lives next to the code as plain Markdown so it can be edited
// without touching TypeScript. Read once at module load — the file
// is bundled into the standalone output via Next.js' tracing.
const KNIFE_CHAT_TEMPLATE = readFileSync(
  path.join(process.cwd(), "src/lib/chat/prompts/knife-chat.md"),
  "utf8",
).trim();

function fmtSession(
  s: SharpeningSession,
  abrasiveById: Record<string, Abrasive>,
): string {
  const parts: string[] = [`${s.date} @ ${s.angle}°`];
  if (s.rating !== undefined) parts.push(`rating ${s.rating}/5`);
  if (s.abrasives?.length) {
    const chain = s.abrasives
      .map((id) => {
        const a = abrasiveById[id];
        if (!a) return `?${id}`;
        const label = a.name || id;
        return a.grit ? `${label} (${a.grit})` : label;
      })
      .join(" → ");
    parts.push(`abrasives: ${chain}`);
  }
  if (s.notes) parts.push(`notes: ${s.notes}`);
  return `- ${parts.join("; ")}`;
}

function renderKnifeContext({
  knife,
  owner,
  abrasives,
}: {
  knife: Knife;
  owner: Owner | null;
  abrasives: Abrasive[];
}): string {
  const abrasiveById = Object.fromEntries(abrasives.map((a) => [a.id, a]));
  const sessions = [...knife.sessions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const lines: string[] = [
    "## Knife",
    `- Name: ${knife.name}`,
    `- Type: ${knife.type || "—"}${knife.subtype ? ` (${knife.subtype})` : ""}`,
    `- Manufacturer: ${knife.manufacturer || "—"}`,
    `- Steel: ${knife.steel || "—"}`,
    `- Handle: ${knife.handle || "—"}`,
    `- On loan: ${knife.onLoan ? "yes" : "no"}`,
    `- In backlog: ${knife.backlog ? "yes" : "no"}`,
  ];
  if (knife.notes) lines.push("", "### Notes from the owner", knife.notes);

  lines.push("", "## Owner");
  if (owner) {
    lines.push(`- Name: ${owner.name}`);
    if (owner.notes) lines.push(`- Notes: ${owner.notes}`);
  } else {
    lines.push(`- (Unknown — referenced as id ${knife.ownerId})`);
  }

  lines.push("", `## Sharpening sessions (${sessions.length})`);
  if (sessions.length === 0) {
    lines.push("- None recorded yet.");
  } else {
    for (const s of sessions) lines.push(fmtSession(s, abrasiveById));
  }

  lines.push("", `## Abrasive library (${abrasives.length})`);
  lines.push(
    "Every stone and strop the user owns. Use this when asked what they have available, or to suggest a progression for this knife.",
  );
  if (abrasives.length === 0) {
    lines.push("- (none recorded)");
  } else {
    const sorted = [...abrasives].sort((a, b) => a.grit - b.grit);
    for (const a of sorted) {
      const bits: string[] = [`${a.name} — grit ${a.grit}`];
      if (a.type) bits.push(a.type);
      if (a.compound) bits.push(`compound: ${a.compound}`);
      if (a.substrate) bits.push(`substrate: ${a.substrate}`);
      if (a.notes) bits.push(`notes: ${a.notes}`);
      lines.push(`- ${bits.join("; ")}`);
    }
  }

  return lines.join("\n");
}

export function buildKnifeChatSystemPrompt(args: {
  knife: Knife;
  owner: Owner | null;
  abrasives: Abrasive[];
}): string {
  return `${KNIFE_CHAT_TEMPLATE}\n\n${renderKnifeContext(args)}`;
}
