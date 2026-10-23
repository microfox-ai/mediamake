import { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { getAudioData } from '@remotion/media-utils';
import { useResolvedAudioSource } from '../../waveforms/hooks/useWaveformData';
import type { WaveformAudioSource } from '../../waveforms/audio-source';
import { analyzeBeatmap } from './analyze';
import { normalizeBeatmap } from './normalize';
import type { Beatmap } from './types';

/** One analysis per audio file, shared by every atom (and every render tab frame). */
const analyses = new Map<string, Promise<Beatmap>>();

const analyzeSource = (source: string): Promise<Beatmap> => {
  let pending = analyses.get(source);
  if (!pending) {
    pending = getAudioData(source).then((data) =>
      analyzeBeatmap(data.channelWaveforms, data.sampleRate, { src: source, source: 'render' }),
    );
    pending.catch(() => analyses.delete(source));
    analyses.set(source, pending);
  }
  return pending;
};

const sameAudio = (mapSrc: string | undefined, ...candidates: string[]) => {
  if (!mapSrc) return true;
  const strip = (s: string) => s.split('?')[0].replace(/^\/+/, '');
  return candidates.some((c) => c && (c === mapSrc || strip(c).endsWith(strip(mapSrc)) || strip(mapSrc).endsWith(strip(c))));
};

export interface UseBeatmapResult {
  beatmap: Beatmap | null;
  /** Seconds of audio before this atom's first frame (`audio.start` + the AudioAtom's `startFrom`). */
  offsetSec: number;
}

/**
 * The beatmap an atom reacts to: the stored one when it belongs to this audio,
 * else an analysis of the audio done here (same code as the browser action).
 */
export function useBeatmap(audio: WaveformAudioSource | undefined, provided: unknown): UseBeatmapResult {
  const resolved = useResolvedAudioSource(audio?.src ?? '');
  const { audioStartsFrom } = resolved;
  // A ref: can point at an AudioAtom whose src is a public-folder path.
  const source =
    resolved.source && !/^(https?:|blob:|data:|\/)/i.test(resolved.source)
      ? staticFile(resolved.source)
      : resolved.source;
  const given = useMemo(() => normalizeBeatmap(provided), [provided]);
  const usable = Boolean(given && given.beats.length > 0 && sameAudio(given.src, audio?.src ?? '', source));
  const [computed, setComputed] = useState<Beatmap | null>(null);

  useEffect(() => {
    if (usable || !source) return;
    if (given && !usable) {
      console.warn(`Beatmap was made for ${given.src}, not ${source}. Analyzing the audio again.`);
    }
    let done = false;
    let cancelled = false;
    const handle = delayRender(`Analyzing beats of ${source}`, { timeoutInMilliseconds: 120000 });
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    analyzeSource(source)
      .then((map) => {
        if (!cancelled) setComputed(map);
      })
      .catch((err) => console.warn(`Beat analysis failed for ${source}:`, err))
      .finally(finish);
    return () => {
      cancelled = true;
      finish();
    };
  }, [usable, source, given]);

  return {
    beatmap: usable ? given : computed && computed.src === source ? computed : null,
    offsetSec: (audio?.start ?? 0) + (audioStartsFrom ?? 0),
  };
}
