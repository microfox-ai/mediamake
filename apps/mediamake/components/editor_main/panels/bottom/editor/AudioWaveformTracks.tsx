"use client";

import { useEffect, useMemo, useState } from "react";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { httpCache } from "@/lib/audio-cache";
import type { TimelineAudioClip } from "@/components/editor/presets/actions/engine/find-audio-media";

const DEFAULT_ROW_HEIGHT = 40;

type WaveformCache = {
  waveform: number[];
  duration: number;
};

async function fetchWaveform(src: string): Promise<WaveformCache | null> {
  const cacheKey = `audio-technical-${src}`;
  try {
    const cached = await httpCache.get(cacheKey);
    if (cached?.technicalAnalysis?.waveform) {
      return {
        waveform: cached.technicalAnalysis.waveform,
        duration:
          Number(cached.metadata?.duration) ||
          Number(cached.technicalAnalysis?.duration) ||
          0,
      };
    }
  } catch {
    // ignore cache miss
  }

  try {
    const response = await fetch("/api/media-files/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioUrl: src,
        analysisOptions: {
          extractWaveform: true,
          analyzeFrequency: false,
          detectBeats: false,
        },
      }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    try {
      await httpCache.set(cacheKey, result, undefined);
    } catch {
      // ignore
    }
    const waveform = result?.technicalAnalysis?.waveform;
    if (!Array.isArray(waveform) || waveform.length === 0) return null;
    return {
      waveform,
      duration: Number(result?.metadata?.duration) || 0,
    };
  } catch {
    return null;
  }
}

function WaveformBars({
  waveform,
  className,
}: {
  waveform: number[];
  className?: string;
}) {
  const bars = useMemo(() => {
    if (!waveform.length) return [];
    const maxBars = 120;
    const step = Math.max(1, Math.floor(waveform.length / maxBars));
    const out: number[] = [];
    for (let i = 0; i < waveform.length; i += step) {
      let sum = 0;
      let count = 0;
      for (let j = i; j < Math.min(i + step, waveform.length); j++) {
        sum += Math.abs(waveform[j] || 0);
        count++;
      }
      out.push(count > 0 ? sum / count : 0);
    }
    const peak = Math.max(...out, 0.001);
    return out.map((v) => Math.max(0.06, v / peak));
  }, [waveform]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-end gap-px overflow-hidden px-0.5 py-1",
        className,
      )}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 min-w-[1px] rounded-sm bg-violet-400/70"
          style={{ height: `${h * 100}%` }}
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
  const [data, setData] = useState<WaveformCache | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchWaveform(clip.src).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
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

  return (
    <div
      className="absolute top-1 bottom-1 rounded border border-violet-500/40 bg-violet-500/15 overflow-hidden"
      style={{ left, width, height: rowHeight - 8 }}
      title={clip.name || clip.trackName || "Audio"}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center gap-1 text-[9px] text-violet-200/60">
          <Music className="h-3 w-3 animate-pulse" />
          Loading…
        </div>
      ) : data?.waveform?.length ? (
        <WaveformBars waveform={data.waveform} />
      ) : (
        <div className="flex h-full items-center gap-1 px-1.5 text-[9px] text-violet-200/70">
          <Music className="h-3 w-3 shrink-0" />
          <span className="truncate">{clip.name || "Audio"}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Renders one read-only waveform track row per unique audio src group,
 * for use under preset / captions / reference timelines.
 */
export function AudioWaveformTracks({
  clips,
  secToPx,
  totalWidth,
  rowHeight = DEFAULT_ROW_HEIGHT,
  labelWidth,
  renderLabels = true,
}: {
  clips: TimelineAudioClip[];
  secToPx: (s: number) => number;
  totalWidth: number;
  rowHeight?: number;
  labelWidth?: number;
  /** When false, only the track rows are rendered (labels handled by parent). */
  renderLabels?: boolean;
}) {
  const grouped = useMemo(() => {
    // One row per trackName (or per src if no track name)
    const map = new Map<string, TimelineAudioClip[]>();
    for (const clip of clips) {
      const key = clip.trackName || clip.src;
      const list = map.get(key) ?? [];
      list.push(clip);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: items[0]?.trackName || items[0]?.name || "Audio",
      items,
    }));
  }, [clips]);

  if (grouped.length === 0) return null;

  return (
    <>
      {renderLabels && labelWidth != null && (
        <div className="contents">
          {/* Parent layouts usually have separate label column — use AudioWaveformTrackLabels instead */}
        </div>
      )}
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
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineAudioClip[]>();
    for (const clip of clips) {
      const key = clip.trackName || clip.src;
      const list = map.get(key) ?? [];
      list.push(clip);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: items[0]?.trackName || items[0]?.name || "Audio",
      count: items.length,
    }));
  }, [clips]);

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
              waveform · {group.count} clip{group.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
