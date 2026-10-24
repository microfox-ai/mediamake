/**
 * Manifest lyrics → mediamake captions (the `inputCaptions` format of the caption presets):
 * caption times are absolute, word `start`/`end` are relative to their caption.
 */
import type { LyricLine } from '../kit/manifest';

export type MediamakeCaption = {
  id: string;
  text: string;
  start: number;
  end: number;
  duration: number;
  absoluteStart: number;
  absoluteEnd: number;
  metadata: Record<string, unknown>;
  words: {
    id: string;
    text: string;
    start: number;
    end: number;
    duration: number;
    absoluteStart: number;
    absoluteEnd: number;
    confidence: number;
  }[];
};

const r = (n: number) => Math.round(n * 1000) / 1000;

/**
 * `offset` is subtracted from every time, so captions line up with a layer that starts at
 * `offset` seconds into the song. Lines that end before the offset are dropped.
 */
export const toCaptions = (lines: LyricLine[], offset = 0): MediamakeCaption[] =>
  lines
    .filter(l => l.end > offset)
    .map(l => {
      const start = r(l.start - offset);
      const end = r(l.end - offset);
      return {
        id: l.id,
        text: l.text,
        start,
        end,
        duration: r(end - start),
        absoluteStart: start,
        absoluteEnd: end,
        metadata: l.metadata ?? {},
        words: l.words.map((w, i) => ({
          id: `${l.id}-w${i}`,
          text: w.text,
          start: r(w.start - l.start),
          end: r(w.end - l.start),
          duration: r(w.end - w.start),
          absoluteStart: r(w.start - offset),
          absoluteEnd: r(w.end - offset),
          confidence: w.conf ?? 1,
        })),
      };
    });
