"use client";

import { useState, type CSSProperties } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// The hero photo, rendered as if a blade swept down through it: the
// image is "cut" on a near-vertical diagonal and the right slab slips
// downward, with a brass hairline along the cut edge. The app is about
// an edge that cuts; this is the one place the hero says so literally.
//
// Two copies of the same image stacked: the left slab sits in flow and
// defines the box height; the right slab is absolutely positioned,
// clipped to the other side of the cut, and nudged downward. A thin
// brass band traces the cut line between them.
//
// All the feel lives in these four constants — tweak and reload.
const CUT_TOP = 54; // % across the TOP edge where the cut crosses
const CUT_BOTTOM = 46; // % across the BOTTOM edge (< top ⇒ leans left going down)
const SEAM = 0.35; // brass seam thickness, as % of width (~1.5–3px at hero sizes)
const OFFSET = 16; // px the right slab slips downward

const leftClip = `polygon(0 0, ${CUT_TOP}% 0, ${CUT_BOTTOM}% 100%, 0 100%)`;
const rightClip = `polygon(${CUT_TOP}% 0, 100% 0, 100% 100%, ${CUT_BOTTOM}% 100%)`;
const seamClip = `polygon(${CUT_TOP}% 0, ${CUT_TOP + SEAM}% 0, ${CUT_BOTTOM + SEAM}% 100%, ${CUT_BOTTOM}% 100%)`;

export function CutHero({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const fallbackStyle: CSSProperties | undefined = loaded
    ? undefined
    : { minHeight: "16rem" };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/40",
        className,
      )}
      style={fallbackStyle}
    >
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-[inherit]" />
      )}

      {/* right slab — slipped downward, lifted with a soft shadow */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn(
          "absolute left-0 top-0 block w-full transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{
          clipPath: rightClip,
          transform: `translateY(${OFFSET}px)`,
          filter: "drop-shadow(-3px 0 4px rgba(0,0,0,0.45))",
        }}
      />

      {/* brass seam tracing the cut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brass transition-opacity duration-200"
        style={{ clipPath: seamClip, opacity: loaded ? 1 : 0 }}
      />

      {/* left slab — in flow, defines the container height */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "relative block w-full transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ clipPath: leftClip }}
      />
    </div>
  );
}
