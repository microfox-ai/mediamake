"use client";

import { useEffect, useMemo, useState } from "react";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateBrowserWaveform,
  type BrowserWaveformResult,
} from "@/lib/browser-waveform";
import type { TimelineAudioClip } from "@/components/editor/presets/actions/engine/find-audio-media";

const DEFAULT_ROW_HEIGHT = 40;

/**
 * DOM bars (not canvas) — avoids Chrome's sad-face when the clip is wider than
 * the browser's max canvas dimension at high zoom.
 */
function WaveformBars({
  peaks,
  className,
}: {
  peaks: number[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-px overflow-hidden px-0.5",
        className,
      )}
    >
      {peaks.map((amp, i) => (
        <div
          key={i}
          className="min-w-[1px] flex-1 rounded-[1px] bg-violet-400/85"
          style={{ height: `${Math.max(8, amp * 90)}%` }}
        />
      ))}
    </div>
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

  // Cap bar count to clip pixel width so we don't render thousands of DOM nodes
  const barCount = Math.max(24, Math.min(256, Math.floor(width / 2) || 64));

  const displayPeaks = useMemo(() => {
    const peaks = data?.peaks ?? [];
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
  }, [data?.peaks, barCount]);

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
        <WaveformBars peaks={displayPeaks} />
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
