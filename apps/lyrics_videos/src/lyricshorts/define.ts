/**
 * projects/<slug>/shorts/<id>/index.tsx:
 *
 *   export default defineLyricShort({ slug: 'eyesofpink', short, edl, theme });
 *
 * One composition per format in short.json, '<slug>-<id>-9x16', playing only the short's window of the
 * song (Root.tsx discovers shorts/<id>/index.tsx; `npm run render-project -- <slug> --short=<id>`).
 */
import type { ProjectDefinition } from '../kit/contract';
import { LyricShort, type LyricShortTheme } from './LyricShort';
import type { LyricShortEdl } from './spec';

/** Shorts / Reels / TikTok, Instagram's portrait grid, its feed portrait */
export const LYRIC_SHORT_FORMATS = { '9x16': [1080, 1920], '3x4': [1080, 1440], '4x5': [1080, 1350] } as const;
export type LyricShortFormat = keyof typeof LYRIC_SHORT_FORMATS;

/** shorts/<id>/short.json */
export type LyricShortSpec = {
  id: string;
  /** song seconds (downbeats) */
  from: number;
  to: number;
  formats: LyricShortFormat[];
  fps?: number;
  /** seconds of audio fade at the start (default 0) and the end (0.4) */
  fadeIn?: number;
  fadeOut?: number;
  /** the short is made to loop: its end runs back into its start (set fadeIn 0, fadeOut ~0.02 and end
   *  on a bar line; the engine keeps time-driven looks such as the light leaks out of the seam) */
  loop?: boolean;
};

export const defineLyricShort = ({ slug, short, edl, theme }: { slug: string; short: LyricShortSpec; edl: LyricShortEdl; theme: LyricShortTheme }): ProjectDefinition[] =>
  short.formats.map(format => ({
    id: `${slug}-${short.id}-${format}`,
    slug,
    fps: short.fps ?? 30,
    width: LYRIC_SHORT_FORMATS[format][0],
    height: LYRIC_SHORT_FORMATS[format][1],
    window: { from: short.from, to: short.to, fadeIn: short.fadeIn, fadeOut: short.fadeOut },
    layers: [{ scene: LyricShort, at: 'all', name: `lyric short ${short.id}`, props: { slug, edl, theme, window: { from: short.from, to: short.to }, loop: short.loop } }],
  }));
