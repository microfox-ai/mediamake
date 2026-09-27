"use client";

import { Film, Image as ImageIcon, Music } from "lucide-react";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
import {
  detectMediaKind,
  type MediaKind,
} from "@/components/editor/presets/dataTypes/media";
import { cn } from "@/lib/utils";

/** Resolve a display name from a media item / MediaFile-shaped object. */
export function extractMediaName(item: any): string {
  if (!item || typeof item !== "object") return "";
  return (
    item.name ||
    item.title ||
    item.fileName ||
    item.metadata?.title ||
    item.metadata?.name ||
    ""
  );
}

/** Resolve a stored thumbnail URL from media metadata / item fields. */
export function extractMediaThumbnail(item: any): string {
  if (!item || typeof item !== "object") return "";
  return (
    item.thumbnail ||
    item.thumbnailUrl ||
    item.metadata?.thumbnail ||
    item.metadata?.thumbnailUrl ||
    ""
  );
}

function VideoThumbImage({
  src,
  thumbnail,
  className,
  alt,
}: {
  src: string;
  thumbnail?: string;
  className?: string;
  alt?: string;
}) {
  const { thumbnailSrc } = useVideoThumbnail(thumbnail ? null : src, {
    timeInSeconds: 2,
    width: 240,
  });
  const displaySrc = thumbnail || thumbnailSrc;

  if (displaySrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt={alt ?? "Video thumbnail"}
        className={className || "h-full w-full object-cover"}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-black/80",
        className,
      )}
    >
      <Film className="h-8 w-8 text-white/70" />
    </div>
  );
}

/**
 * Thumbnail for media-track / medias gallery cells.
 * Audio → music icon + optional name; video → stored thumbnail or client fallback.
 */
export function MediaItemThumb({
  src,
  kind,
  name,
  thumbnail,
  item,
  className,
}: {
  src?: string;
  kind?: MediaKind;
  name?: string;
  thumbnail?: string;
  /** Full media item — used to infer kind / name / thumbnail when not passed. */
  item?: any;
  className?: string;
}) {
  const resolvedSrc =
    src ||
    (typeof item === "string"
      ? item
      : item?.src || item?.filePath || item?.url || "");
  const resolvedKind = kind ?? detectMediaKind(item ?? { src: resolvedSrc });
  const resolvedName = name ?? extractMediaName(item);
  const resolvedThumb = thumbnail || extractMediaThumbnail(item);

  if (resolvedKind === "audio") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted px-2",
          className,
        )}
      >
        <Music className="h-8 w-8 shrink-0 text-muted-foreground" />
        {resolvedName ? (
          <p
            className="max-w-full truncate text-center text-[10px] font-medium leading-tight text-foreground/80"
            title={resolvedName}
          >
            {resolvedName}
          </p>
        ) : null}
      </div>
    );
  }

  if (resolvedKind === "video" && resolvedSrc) {
    return (
      <VideoThumbImage
        src={resolvedSrc}
        thumbnail={resolvedThumb || undefined}
        className={className || "h-full w-full object-cover"}
        alt={resolvedName || "Video thumbnail"}
      />
    );
  }

  if (resolvedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={resolvedName || ""}
        className={className || "h-full w-full object-cover"}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <ImageIcon className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}
