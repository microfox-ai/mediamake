"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateBrowserWaveform,
  type BrowserWaveformResult,
} from "@/lib/browser-waveform";
import type { TimelineAudioClip } from "@/components/editor/presets/actions/engine/find-audio-media";

const DEFAULT_ROW_HEIGHT = 40;

/** High-resolution peaks so zooming in reveals shape instead of stretching bars. */
const PEAK_RESOLUTION = 8192;
/** 1px stroke + 1px gap. Pitch stays fixed so zoom adds detail instead of width. */
const BAR_PITCH = 2;
const BAR_WIDTH = 1;
/** Stay under Chrome's max canvas size when a clip is very wide at high zoom. */
const TILE_PX = 4096;
const BAR_COLOR = "rgba(167, 139, 250, 0.9)";

function samplePeak(peaks: number[], startT: number, endT: number): number {
  const n = peaks.length;
  if (n === 0) return 0;
  const i0 = Math.max(0, Math.min(n - 1, Math.floor(startT * n)));
  const i1 = Math.max(i0 + 1, Math.min(n, Math.ceil(endT * n)));
  let max = 0;
  for (let i = i0; i < i1; i++) {
    const v = peaks[i] ?? 0;
    if (v > max) max = v;
  }
  return max;
}

/**
 * Thin 1px strokes, tiled across canvases so a zoomed-in clip never widens
 * the bars (and never exceeds the browser's max canvas dimension).
 */
function WaveformBars({
  peaks,
  className,
}: {
  peaks: number[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let lastW = -1;
    let lastH = -1;

    const draw = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;
      if (width === lastW && height === lastH && host.childElementCount > 0) {
        return;
      }
      lastW = width;
      lastH = height;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const tileCount = Math.max(1, Math.ceil(width / TILE_PX));
      host.replaceChildren();

      for (let t = 0; t < tileCount; t++) {
        const origin = t * TILE_PX;
        const tileW = Math.min(TILE_PX, width - origin);
        const canvas = document.createElement("canvas");
        canvas.style.width = `${tileW}px`;
        canvas.style.height = `${height}px`;
        canvas.style.display = "block";
        canvas.style.flexShrink = "0";
        canvas.width = Math.max(1, Math.floor(tileW * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = BAR_COLOR;

        for (let x = 0; x < tileW; x += BAR_PITCH) {
          const g0 = origin + x;
          const amp = samplePeak(peaks, g0 / width, (g0 + BAR_PITCH) / width);
          const barH = Math.max(1, amp * height * 0.92);
          ctx.fillRect(x, (height - barH) / 2, BAR_WIDTH, barH);
        }
        host.appendChild(canvas);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    return () => observer.disconnect();
  }, [peaks]);

  return (
    <div
      ref={hostRef}
      className={cn("flex h-full w-full overflow-hidden", className)}
    />
  );
}

function AudioWaveformClip({
  clip,
  secToPx,
  rowHeight,
}: {
  clip: TimelineAudioClip;
  secToPx: (s: number) => number;
  rowHeight: number;
}) {
  const [data, setData] = useState<BrowserWaveformResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void generateBrowserWaveform(clip.src, PEAK_RESOLUTION).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
      if (!result) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [clip.src]);

  const duration =
    clip.duration && clip.duration > 0
      ? clip.duration
      : data?.duration && data.duration > 0
        ? data.duration
        : 8;

  const left = secToPx(clip.start);
  const width = Math.max(8, secToPx(duration));
  const innerH = Math.max(12, rowHeight - 8);
  const peaks = data?.peaks ?? [];

  return (
    <div
      className="absolute top-1 bottom-1 rounded border border-violet-500/40 bg-violet-500/10 overflow-hidden"
      style={{ left, width, height: innerH }}
      title={clip.name || clip.trackName || "Audio"}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center gap-1 text-[9px] text-violet-200/60">
          <Music className="h-3 w-3 animate-pulse" />
          Decoding…
        </div>
      ) : peaks.length > 0 ? (
        <WaveformBars peaks={peaks} />
      ) : (
        <div className="flex h-full items-center gap-1 px-1.5 text-[9px] text-violet-200/70">
          <Music className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {error ? "Waveform unavailable" : clip.name || "Audio"}
          </span>
        </div>
      )}
    </div>
  );
}

function groupClips(clips: TimelineAudioClip[]) {
  const map = new Map<string, TimelineAudioClip[]>();
  for (const clip of clips) {
    const key = clip.src;
    const list = map.get(key) ?? [];
    list.push(clip);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: items[0]?.trackName || items[0]?.name || "Audio",
    items,
  }));
}

/**
 * Renders one read-only waveform track row per unique audio src,
 * peaks decoded locally in the browser via Web Audio.
 */
export function AudioWaveformTracks({
  clips,
  secToPx,
  totalWidth,
  rowHeight = DEFAULT_ROW_HEIGHT,
}: {
  clips: TimelineAudioClip[];
  secToPx: (s: number) => number;
  totalWidth: number;
  rowHeight?: number;
  labelWidth?: number;
  renderLabels?: boolean;
}) {
  const grouped = useMemo(() => groupClips(clips), [clips]);

  if (grouped.length === 0) return null;

  return (
    <>
      {grouped.map((group) => (
        <div
          key={group.key}
          className="relative shrink-0 border-b border-border/40 bg-violet-500/5"
          style={{ height: rowHeight, width: totalWidth, minWidth: "100%" }}
        >
          {group.items.map((clip) => (
            <AudioWaveformClip
              key={clip.id}
              clip={clip}
              secToPx={secToPx}
              rowHeight={rowHeight}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/** Label column rows matching AudioWaveformTracks groups. */
export function AudioWaveformTrackLabels({
  clips,
  rowHeight = DEFAULT_ROW_HEIGHT,
}: {
  clips: TimelineAudioClip[];
  rowHeight?: number;
}) {
  const grouped = useMemo(() => groupClips(clips), [clips]);

  if (grouped.length === 0) return null;

  return (
    <>
      {grouped.map((group) => (
        <div
          key={group.key}
          className="flex items-center gap-1 px-2 border-b border-border/40 bg-violet-500/5"
          style={{ height: rowHeight }}
        >
          <Music className="h-3 w-3 shrink-0 text-violet-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold truncate" title={group.label}>
              {group.label}
            </p>
            <p className="text-[9px] text-muted-foreground/50 truncate">
              waveform · {group.items.length} clip
              {group.items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
