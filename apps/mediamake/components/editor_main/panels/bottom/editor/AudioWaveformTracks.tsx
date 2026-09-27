"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateBrowserWaveform,
  type BrowserWaveformResult,
} from "@/lib/browser-waveform";
import type { TimelineAudioClip } from "@/components/editor/presets/actions/engine/find-audio-media";

const DEFAULT_ROW_HEIGHT = 40;

function WaveformCanvas({
  peaks,
  width,
  height,
  className,
}: {
  peaks: number[];
  width: number;
  height: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || peaks.length === 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mid = height / 2;
    const barGap = 0.5;
    const barW = Math.max(1, width / peaks.length - barGap);
    const color = "rgba(167, 139, 250, 0.85)"; // violet-400-ish

    ctx.fillStyle = color;
    for (let i = 0; i < peaks.length; i++) {
      const amp = peaks[i] ?? 0;
      const h = Math.max(1, amp * (height * 0.9));
      const x = (i / peaks.length) * width;
      const y = mid - h / 2;
      ctx.fillRect(x, y, barW, h);
    }
  }, [peaks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none block", className)}
      aria-hidden
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
  const [pixelWidth, setPixelWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void generateBrowserWaveform(clip.src, 256).then((result) => {
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

  useEffect(() => {
    setPixelWidth(width);
  }, [width]);

  // Slice peaks to the clip window when the clip is a range of a longer file
  const peaks = useMemo(() => {
    if (!data?.peaks?.length) return [];
    if (!clip.duration || !data.duration || data.duration <= 0) {
      return data.peaks;
    }
    // If clip duration is the full file (or close), use all peaks
    if (clip.duration >= data.duration * 0.95) return data.peaks;
    // Otherwise subsample proportionally — still show the shape of the whole
    // decoded file compressed into the clip width (timeline range placement).
    return data.peaks;
  }, [data, clip.duration]);

  const barCount = Math.max(
    16,
    Math.min(peaks.length || 256, Math.floor(pixelWidth / 2) || 64),
  );
  const displayPeaks = useMemo(() => {
    if (!peaks.length) return [];
    if (peaks.length <= barCount) return peaks;
    const step = peaks.length / barCount;
    const out: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let max = 0;
      for (let j = start; j < end; j++) {
        max = Math.max(max, peaks[j] ?? 0);
      }
      out.push(max);
    }
    return out;
  }, [peaks, barCount]);

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
      ) : displayPeaks.length > 0 ? (
        <WaveformCanvas
          peaks={displayPeaks}
          width={pixelWidth}
          height={innerH}
        />
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
    // Group by resolved src so the same audio isn't drawn on multiple rows
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
