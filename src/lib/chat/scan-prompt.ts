import { readFileSync } from "node:fs";
import path from "node:path";

// Prose lives next to the code as plain Markdown (mirrors
// system-prompt.ts). Read once at module load; bundled into the
// standalone output via Next.js tracing.
const KNIFE_SCAN_TEMPLATE = readFileSync(
  path.join(process.cwd(), "src/lib/chat/prompts/knife-scan.md"),
  "utf8",
).trim();

export function buildKnifeScanSystemPrompt(args: {
  sourceUrl?: string | null;
}): string {
  const { sourceUrl } = args;
  if (!sourceUrl) {
    return `${KNIFE_SCAN_TEMPLATE}\n\n## Source URL\n\n- None supplied. Work from the photo (and web_search if useful).`;
  }
  return `${KNIFE_SCAN_TEMPLATE}\n\n## Source URL\n\n- The user pasted this product/source page: ${sourceUrl}\n- Call \`fetch_url\` on it early if the photo alone isn't enough.`;
}
