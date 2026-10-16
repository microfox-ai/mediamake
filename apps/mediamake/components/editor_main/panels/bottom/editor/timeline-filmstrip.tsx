"use client";

import { useVideoFrames } from "@/hooks/use-video-frames";
import { filmstripMarks } from "@/lib/editor/filmstrip-marks";
import {
  clipStillsForInput,
  collectVisualMedia,
  isDirectVideoUrl,
  readClipStill,
  type ClipStill,
  type MediaReferenceLike,
} from "@/lib/editor/visual-media";
import { sceneBlocksFromMediaInput } from "./media-scene-blocks";

export type FilmstripSegment = {
  /** Seconds from the left edge of the block. */
  start: number;
  duration: number;
  still: ClipStill;
};

/**
 * Filmstrip slices for a preset block. A media track is split per clip.
 * A single image or video fills the block. `contentAtLeft` is how far into
 * the track content the visible left edge sits, after a head trim.
 */
export function presetFilmstripSegments(options: {
  input: unknown;
  references?: MediaReferenceLike[] | null;
  durationSec: number;
  contentAtLeft?: number;
  itemIndex?: number;
  sourceLead?: number;
}): FilmstripSegment[] {
  const duration = options.durationSec;
  if (!(duration > 0)) return [];
  const stills = clipStillsForInput(options.input, options.references);
  if (options.itemIndex != null) {
    const still = stills[options.itemIndex];
    if (!still) return [];
    return [
      {
        start: 0,
        duration,
        still: {
          ...still,
          sourceOffset: still.sourceOffset + Math.max(0, options.sourceLead ?? 0),
        },
      },
    ];
  }

  const contentAtLeft = options.contentAtLeft ?? 0;
  if (stills.some(Boolean)) {
    const layout = sceneBlocksFromMediaInput(options.input);
    const segments: FilmstripSegment[] = [];
    for (const block of layout.blocks) {
      const still = stills[block.itemIndex];
      if (!still) continue;
      const localStart = block.start - contentAtLeft;
      const start = Math.max(0, localStart);
      const end = Math.min(duration, localStart + block.duration);
      if (end - start < 0.04) continue;
      segments.push({
        start,
        duration: end - start,
        still: {
          ...still,
          sourceOffset: still.sourceOffset + Math.max(0, start - localStart),
        },
      });
    }
    if (segments.length > 0) return segments;
    const first = stills.find((still): still is ClipStill => Boolean(still));
    if (first) return [{ start: 0, duration, still: first }];
  }

  const single =
    readClipStill(options.input) ??
    (() => {
      const visual = collectVisualMedia(options.input, options.references)[0];
      return visual ? { ...visual, sourceOffset: 0 } : null;
    })();
  if (!single) return [];
  return [{ start: 0, duration, still: single }];
}

/**
 * Filmstrip for one clip. Image cells repeat the picture. Video cells show
 * the frame at each zoom mark, falling back to a stored thumbnail while
 * those frames decode.
 */
function FilmstripStrip({
  still,
  duration,
  pixelsPerSecond,
}: {
  still: ClipStill;
  duration: number;
  pixelsPerSecond: number;
}) {
  const directVideo = still.kind === "video" && isDirectVideoUrl(still.src);
  const { cellPx, marks } = filmstripMarks({
    durationSec: duration,
    pixelsPerSecond,
    sourceOffsetSec: still.kind === "video" ? still.sourceOffset : 0,
  });
  const frames = useVideoFrames(
    directVideo ? still.src : null,
    directVideo ? marks.map((mark) => mark.time) : [],
  );
  const poster = still.kind === "image" ? still.src : still.thumbnail;

  return (
    <div className="flex h-full w-max">
      {marks.map((mark) => {
        const frame = frames[mark.time.toFixed(2)];
        const src = still.kind === "image" ? still.src : frame || poster;
        return (
          <div
            key={mark.index}
            className="h-full shrink-0 bg-black/50 shadow-[inset_-1px_0_0_rgba(0,0,0,0.45)]"
            style={{ width: cellPx }}
          >
            {src ? (
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none h-full w-full object-cover"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Zoom-aware stills laid across a timeline block. */
export function TimelineFilmstrip({
  segments,
  pixelsPerSecond,
}: {
  segments: FilmstripSegment[];
  pixelsPerSecond: number;
}) {
  if (segments.length === 0 || !(pixelsPerSecond > 0)) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {segments.map((segment, index) => (
        <div
          key={`${segment.still.src}-${index}`}
          className="absolute inset-y-0 overflow-hidden"
          style={{
            left: segment.start * pixelsPerSecond,
            width: Math.max(1, segment.duration * pixelsPerSecond),
          }}
        >
          <FilmstripStrip
            still={segment.still}
            duration={segment.duration}
            pixelsPerSecond={pixelsPerSecond}
          />
        </div>
      ))}
    </div>
  );
}
