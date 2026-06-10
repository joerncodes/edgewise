"use client";

import { useState, type CSSProperties } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Image with a shadcn skeleton underlay. The skeleton fills the
// container; the <img> fades in when onLoad fires.
//
// Two layout modes via the caller:
//
// - **Locked aspect**: pass an aspect class (e.g. "aspect-[3/1]") in
//   `className`. The container has a known size, skeleton fills it,
//   no layout shift when the image arrives.
// - **Natural aspect**: pass no aspect class. The skeleton renders at
//   `loadingMinHeight` until onLoad; then the image takes its natural
//   height. Some layout shift is unavoidable here — same as a plain
//   <img> would do.
export function Photo({
  src,
  alt,
  className,
  imgClassName,
  loadingMinHeight = "12rem",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loadingMinHeight?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const fallbackStyle: CSSProperties | undefined = loaded
    ? undefined
    : { minHeight: loadingMinHeight };
  return (
    <div className={cn("relative", className)} style={fallbackStyle}>
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-[inherit]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "block w-full transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
