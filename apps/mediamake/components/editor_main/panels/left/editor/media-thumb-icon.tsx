"use client";

import { useState, type ReactNode } from "react";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import {
  isDirectVideoUrl,
  type VisualMediaRef,
} from "@/lib/editor/visual-media";

/**
 * 24×24 still for the first image or video on a block.
 * Extra clips show as a count on the top-right corner.
 */
export function MediaThumbIcon({
  items,
  fallback,
}: {
  items: VisualMediaRef[];
  fallback: ReactNode;
}) {
  const first = items[0];
  const stored = !first
    ? null
    : first.kind === "image"
      ? first.src
      : first.thumbnail || null;
  const generateSrc =
    first && first.kind === "video" && !stored && isDirectVideoUrl(first.src)
      ? first.src
      : null;
  const { thumbnailSrc, loading } = useVideoThumbnail(generateSrc, {
    timeInSeconds: 2,
    width: 240,
  });
  const display = stored || thumbnailSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!first) return <>{fallback}</>;

  if (!display || failedSrc === display) {
    if (loading) {
      return (
        <span
          aria-hidden
          className="inline-block h-[24px] w-[24px] shrink-0 rounded-[3px] bg-muted"
        />
      );
    }
    return <>{fallback}</>;
  }

  const count = items.length;

  return (
    <span className="relative inline-flex h-[24px] w-[24px] shrink-0">
      <img
        src={display}
        alt=""
        draggable={false}
        onError={() => setFailedSrc(display)}
        className="pointer-events-none h-[24px] w-[24px] rounded-[3px] border border-border bg-muted object-cover"
      />
      {count > 1 && (
        <span
          className="pointer-events-none absolute right-0 top-0 z-10 flex h-[12px] min-w-[12px] items-center justify-center rounded-full bg-black px-[2px] text-[8px] font-semibold leading-none text-white"
          aria-label={`${count} media`}
        >
          {count}
        </span>
      )}
    </span>
  );
}
