import { Atom, Factory, Grip, Tags } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/lib/storage/ids";
import { cn } from "@/lib/utils";
import type { Knife } from "@/lib/storage/types";

// The knife's metadata as color-coded chips: brass for manufacturer,
// steel-tone for type/subtype, neutral mono for steel and handle.
// Shared by the card and the detail page so the two stay in sync — this
// is the app's primary vocabulary for "what is this knife", and it
// should read the same wherever it appears.
//
// `className` is merged onto the wrapper (the card passes `relative z-10`
// so the chips sit above its full-card overlay link).
export function KnifeChips({
  knife,
  className,
}: {
  knife: Pick<Knife, "manufacturer" | "type" | "subtype" | "steel" | "handle">;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-xs",
        className,
      )}
    >
      {knife.manufacturer && (
        <Link
          href={`/manufacturers/${slugify(knife.manufacturer)}`}
          className="inline-flex items-center gap-1 rounded-md border border-brass/40 bg-brass/10 px-1.5 py-0.5 text-brass hover:bg-brass/20"
        >
          <Factory className="h-3 w-3" />
          {knife.manufacturer}
        </Link>
      )}
      {knife.type && (
        <Link
          href={`/types/${slugify(knife.type)}`}
          className="inline-flex items-center gap-1 rounded-md border border-steel/40 bg-steel/10 px-1.5 py-0.5 text-steel hover:bg-steel/20"
        >
          <Tags className="h-3 w-3" />
          {knife.type}
        </Link>
      )}
      {knife.type && knife.subtype && (
        <Link
          href={`/types/${slugify(knife.type)}?subtype=${encodeURIComponent(knife.subtype)}`}
          className="inline-flex items-center rounded-md border border-steel/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-steel/80 hover:bg-steel/10"
        >
          {knife.subtype}
        </Link>
      )}
      {knife.steel && (
        <Link
          href={`/steels/${slugify(knife.steel)}`}
          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Atom className="h-3 w-3" />
          {knife.steel}
        </Link>
      )}
      {knife.handle && (
        <Link
          href={`/handles/${slugify(knife.handle)}`}
          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
        >
          <Grip className="h-3 w-3" />
          {knife.handle}
        </Link>
      )}
    </div>
  );
}
