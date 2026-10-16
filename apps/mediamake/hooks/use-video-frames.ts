"use client";

import { useEffect, useState } from "react";
import { ALL_FORMATS, CanvasSink, Input, UrlSource } from "mediabunny";

const frameCache = new Map<string, string>();

function cacheKey(src: string, time: number): string {
  return `${src}\n${time.toFixed(2)}`;
}

function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas | null | undefined): string | null {
  if (!canvas) return null;
  let htmlCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement) {
    htmlCanvas = canvas;
  } else {
    htmlCanvas = document.createElement("canvas");
    htmlCanvas.width = canvas.width;
    htmlCanvas.height = canvas.height;
    const context = htmlCanvas.getContext("2d");
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
  }
  const url = htmlCanvas.toDataURL("image/jpeg", 0.72);
  return url || null;
}

/**
 * Stills from one video at the given source times. Frames are cached, so
 * zooming back to a mark does not decode it again.
 */
export function useVideoFrames(
  src: string | null | undefined,
  times: number[],
): Record<string, string> {
  const signature = times.map((time) => time.toFixed(2)).join(",");
  const [frames, setFrames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!src || signature.length === 0) {
      setFrames({});
      return;
    }
    const requested = signature.split(",").map((value) => Number(value));
    const seeded: Record<string, string> = {};
    const missing: number[] = [];
    for (const time of requested) {
      const hit = frameCache.get(cacheKey(src, time));
      if (hit) seeded[time.toFixed(2)] = hit;
      else missing.push(time);
    }
    setFrames(seeded);
    if (missing.length === 0) return;

    let cancelled = false;
    let input: Input | null = null;

    const load = async () => {
      try {
        input = new Input({
          formats: ALL_FORMATS,
          source: new UrlSource(src),
        });
        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack || !(await videoTrack.canDecode())) return;
        const sink = new CanvasSink(videoTrack, { width: 160 });
        let duration: number | null = null;
        try {
          const computed = await input.computeDuration();
          duration = Number.isFinite(computed) && computed > 0 ? computed : null;
        } catch {
          duration = null;
        }
        const found: Record<string, string> = {};
        for (const time of missing) {
          if (cancelled) return;
          const clamped =
            duration == null
              ? Math.max(0, time)
              : Math.min(Math.max(0, time), Math.max(0, duration - 0.05));
          const result = await sink.getCanvas(clamped);
          const url = canvasToJpeg(result?.canvas);
          if (!url) continue;
          frameCache.set(cacheKey(src, time), url);
          found[time.toFixed(2)] = url;
        }
        if (!cancelled && Object.keys(found).length > 0) {
          setFrames((prev) => ({ ...prev, ...found }));
        }
      } catch {
        // A failed decode leaves the poster or empty cells in place.
      } finally {
        if (input && typeof (input as { dispose?: () => void }).dispose === "function") {
          try {
            (input as { dispose: () => void }).dispose();
          } catch {
            // ignore
          }
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [src, signature]);

  return frames;
}
