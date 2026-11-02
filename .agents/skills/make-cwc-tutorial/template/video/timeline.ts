/**
 * Story v4's clock (song seconds). The voice sets it: every beat hangs on a recorded word
 * (input/vo4/vo.json), and the brand theme is placed so its big hit (18.077 s into the file) lands as
 * the logo catches fire and its final hit (25.84 s) on "Sound." and "Yours is next."
 */
import voData from '../input/vo4/vo.json';

export type VoChunk = { id: string; file: string; text: string; duration: number };
export const VO_CHUNKS = voData as VoChunk[];
export const vo = (id: string): VoChunk => {
  const c = VO_CHUNKS.find(v => v.id === id);
  if (!c) throw new Error(`no voice chunk ${id}`);
  return c;
};

/**
 * Revision 4: the voice runs on as continuous reads (input/vo-r4), and the picture is timed to their
 * words. Each read's start, and where its words begin inside it (measured from the take's silences).
 */
const R1 = 21.6; // "This is one of the many open-source skills… You pick what you love."
export const W1 = { open: 0.86, free: 2.37, easy: 3.08, copy: 5.09, paste: 7.27, name: 9.67, tell: 10.98, setup: 13.33, first: 15.65, looking: 16.6, directions: 20.44, pick: 22.11 };
const R3 = 80.8; // "Then we kept cooking… Every end screen."
export const W3 = { tested: 2.0, testedWord: 2.44, dozen: 4.88, hundred: 6.36, channels: 8.16, stories: 9.63, oneskill: 11.3, logo: 13.16, intro: 14.55, endscreen: 15.99 };
const R5 = 98.45; // "Every one of these… started with a name. Now, it can be your idea, your name. Just start."
export const W5 = { started: 1.71, now: 3.73, idea: 4.26, name: 5.68, just: 7.26 };
/** "A complete brand setup, with everything you need.": where "with" begins */
export const W_COMPLETE_WITH = 1.82;

export const T = {
  cold: { from: 0, to: 7.2, cut: 3.6, before: 4.5 },
  opener: { from: 7.2, to: 21.2 },
  skills: { from: 21.2, to: 26.3, vo: R1 },
  ritual: { from: 26.3, to: 36.9, copy: R1 + W1.copy, paste: R1 + W1.paste, name: R1 + W1.name, type: 31.9, enter: 35.0 },
  look: { from: 36.9, to: 46.0, vo: R1 + W1.first, look: R1 + W1.looking, directions: R1 + W1.directions, pick: R1 + W1.pick },
  draw: { from: 46.0, to: 60.1, draw: 46.5, again: [49.5, 52.8, 56.4], bubbles: [47.5, 50.5, 53.7, 57.3] },
  there: { from: 60.1, to: 66.5, until: 60.5, vo: 62.6, logo: 63.5 },
  alive: { from: 66.5, to: 79.8, motion: 67.1, sound: 71.1, voice: 74.4, whip: 76.3, complete: 76.5 },
  pantry: { from: 79.8, to: 101.9, glide: 80.0, step: 1.44, regroup: 80.0 + 12 * 1.44, cooking: R3, vo: R5 },
  just: { from: 101.9, to: 110.7, idea: R5 + W5.idea, name: R5 + W5.name, vo: R5 + W5.just },
  end: { from: 110.7, to: 130.7, type: 112.9, vo: 113.0 },
} as const;

export const TOTAL = 130.7;

/** Where each voice chunk starts (song seconds). */
export const VO_AT: Array<[string, number]> = [
  ['blank', 1.15],
  ['before', T.cold.before],
  ['ritual4', R1],
  ['draw', T.draw.draw],
  ['again1', T.draw.again[0]],
  ['again2', T.draw.again[1]],
  ['again3', T.draw.again[2]],
  ['until', T.there.until],
  ['there', T.there.vo],
  ['motion', T.alive.motion],
  ['sound', T.alive.sound],
  ['voice', T.alive.voice],
  ['complete4', T.alive.complete],
  ['shelf4', R3],
  ['ending4', R5],
  ['makenext', T.end.vo],
];

/** The brand theme (30 s): where each pass starts in the song, and the file offset it starts from. */
export const THEME_PEAK = 18.077;
export const THEME_FINAL = 25.84;
/** The logo animation starts this far in after the match cut: the spark is mid-burst on the cut, so the 3D spark carries straight on. */
export const LOGO_START_AT = 0.62;
export const LOGO_CATCH = T.there.logo + (0.6 - LOGO_START_AT);
/** The logo is drawn (MEDIAMAKE lands) here: the sting's lid ring (1.405 s into it) lands on it. */
export const LOGO_DRAWN = T.there.logo + (1.8 - LOGO_START_AT);
export const MUSIC = [
  { name: 'cold', at: 0, offset: THEME_PEAK - 0.6, until: T.cold.cut },
  { name: 'there', at: LOGO_CATCH - THEME_PEAK, offset: 0, until: T.alive.whip + 0.6 },
  { name: 'pantry', at: T.just.vo + 1.0 - THEME_FINAL, offset: 0, until: T.just.to },
];

/** The logo pieces of the shelf, in order. */
/** Public kits only: private channels stay off the shelf (revision 4). */
export const STATION_ORDER = [
  'inverteddevils', 'animemusiczone', 'animesoundlike', 'getintozone', 'atomicrap',
  'zonestudios', 'themoondevs', 'portal', 'microfox', 'browsehack', 'mediamake', 'cookwithclaude',
];
