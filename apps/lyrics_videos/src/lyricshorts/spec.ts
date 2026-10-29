/**
 * Lyric shorts (make-lyrics-shorts-summerstyle-boldwords): vertical shorts of a song where the sung words fill the frame top to
 * bottom, a word or two a row, each row stretched to the column's width (and the letters stretched
 * taller or squashed a little so the stack fills the height exactly), one word maybe running vertically
 * down a side, in an ultra-bold face with the footage playing inside the letters; a stack can dive
 * through one of its letters into the footage full frame.
 *
 * A short lives in projects/<slug>/shorts/<id>/: short.json (the window: song seconds, formats),
 * edl.ts (this file's language) and index.tsx (`export default defineLyricShort(...)`).
 *
 * Kept free of React/Remotion so scripts/lyric-shorts.ts (clips, checks) can import it in Node.
 * Times in the cut list are the song's beats (indices of manifest.beats.list, fractions allowed).
 */

export type Fill = 'video' | 'solid';

/** how a word's row is drawn: 'video' (the footage inside the letters) or 'solid' (flat colour, which can
 *  dissolve into the footage at `reveal`, a beat). Default: video when the row is big enough to see
 *  through (theme.type.minMask), else solid. */
export type Mark = { fill?: Fill; color?: string; reveal?: number };

/** a row by hand; `vertical` sets it down a side: 'up' turned to read bottom to top (true), 'down' top to
 *  bottom, 'upright' standing as it is, as tall as the rows beside it (a drop cap: a giant "i") */
export type RowSpec = string | ({ text: string; vertical?: boolean | 'up' | 'down' | 'upright' } & Mark);

export type StackSpec = {
  kind: 'stack';
  /** the screen's words, in the order sung: the first match inside the short's window, or [phrase, nth].
   *  Without `rows`, these are all its words and the layout groups them into rows itself. */
  find: string | [string, number];
  /** rows by hand (each row's words found in the sung words in order, from `find`'s first word); a row
   *  with `vertical` runs down the left side (first row) or the right side (last row) */
  rows?: RowSpec[];
  /** per-word looks, by the word as written in `find` (the whole row it lands in takes it) */
  marks?: Record<string, Mark>;
  /** beat the screen starts (default: as its first word shows) */
  at?: number;
  /** beat it clears (default: when the next screen starts) */
  end?: number;
  /** 'into': it starts zoomed deep inside a letter of its first word and pulls back out of the footage */
  enter?: 'cut' | 'into';
  /** 'through': dives into a letter of `through.word` (default its last word) until the footage fills the frame */
  exit?: 'cut' | 'through' | 'fade';
  /** word: the word to dive into or pull back out of; beats: how long the dive or the pull-back takes (2) */
  through?: { word?: string; beats?: number };
  /** let the layout set a word vertically (theme.type.vertical decides when not given) */
  vertical?: boolean;
  /** words over the whole footage first (black on bright footage, white on dark), flipping to the mask
   *  (the footage inside the letters) mid-line: true, false, or { flip: beat, ink } (default:
   *  theme.type.reverse decides — long screens, flipping when about half the stack is lit; the ink from
   *  the shot's brightness) */
  reverse?: boolean | { flip?: number; ink?: 'black' | 'white' };
};

/** the footage full frame, no type (after a dive, on an instrumental hit, the ending) */
export type FullSpec = { kind: 'full'; at: number; end?: number };

/**
 * A line over the whole footage, no mask (user, 2026-10-28: on fast, wordy lines "it is hard to
 * concentrate on both text and the visual … the others can come on top of the image, with neat
 * typography where there is one highlight word and small words above or below at the correct places,
 * where it does not cross the letters but sits next to it"): a lockup — its highlight word big, the words
 * before it tucked into the space above the x-height beside the tall letters, the words after it into the
 * space under the baseline beside the descenders (lockup.ts).
 */
export type CapSpec = {
  kind: 'cap';
  /** the line's words, in the order sung (as for a stack) */
  find: string | [string, number];
  /** the highlight word (default: the longest-held word that isn't a little one) */
  hi?: string;
  /** where the lockup sits: under the faces (default), over them, or mid-frame */
  place?: 'low' | 'high' | 'mid';
  /** the highlight word's colour (default white) */
  color?: string;
  at?: number;
  end?: number;
};

export type Screen = StackSpec | FullSpec | CapSpec;

export type CutSpec = {
  /** beat the cut starts; it runs to the next cut (the last one to the end of the short) */
  at: number;
  /** a shot of the footage's segregation (sh0012, or a further source's prefix: lm0012) */
  shot: string;
  /** seconds into the shot */
  in?: number;
  /** the 9:16 crop's centre across the source, 0..1 (default 0.5); y likewise (only with zoom > 1) */
  x?: number;
  y?: number;
  /** crop tighter than the full height (1 = full height) */
  zoom?: number;
  /** the subject in this cut, when it differs from the shot's in footage/faces.json: [x0, y0, x1, y1,
   *  eyes], fractions of the source frame. Without x / y / zoom the crop is framed on it (framing.ts). */
  face?: FaceBox;
  /** playback speed of the source (1 = its own speed) */
  rate?: number;
  /** black and white */
  mono?: boolean;
  /** how this cut comes in (the shot before plays the matching way out); default a hard cut */
  tr?: TransitionKind | Transition;
  /** a flash of colour on the cut (true: the theme's flash colour) */
  flash?: boolean | string;
  /** an impact shake as the cut lands (1 = strong) */
  shake?: number;
  /** twixtor on the beat (user, 2026-10-28: "some twixtors can speed up and zoom, beat box transition
   *  effects or other camera-like effects, that makes it feel good with the music"):
   *  ramp — a burst of speed on every beat gliding into slow motion before the next (0..1; the shot's
   *  own pace on average, so it needs no more footage); bump — a zoom punch on every beat (0.06 = 6 %);
   *  push — a slow camera push in over the whole cut (0.08 = 8 %) */
  ramp?: number;
  bump?: number;
  push?: number;
  /** a camera move made of the crop: the 9:16 window slides across the 16:9 source during the cut, centred
   *  on the framed position — `pan` across (fraction of the source width; + travels right, so the picture
   *  slides left), `tilt` down (+) or up (−). Cuts in a row panning the same way, the subject's eyes on the
   *  same spot at each cut, read as one continuous move (user, 2026-10-28: "if the shot is a left pan and the
   *  next is also a left pan, and you align the subject, you have a good match cut") */
  pan?: number;
  tilt?: number;
};

/**
 * Transitions, the moves of an anime shorts editor (CapCut) — made of the picture itself:
 * - velocity: the shot speeds up into the cut (×v), the next starts fast and eases to its own speed,
 *   with motion-blur trails while it races (the velocity edit)
 * - zoom: the warp zoom — a deep push into the shot with zoom blur, the next lands from it decelerating
 * - whip: a fast pan with directional blur, out one way and the next in from the other (`dir`)
 * - slash: a katana slash — the next shot is cut in along a diagonal blade of light
 * - iris: the next shot opens through a growing circle (`at`: its centre, frame fractions — an eye)
 * - dissolve: a soft blur cross-fade (gentle lines)
 * - spin: a rotate-zoom through the cut
 */
export type TransitionKind = 'cut' | 'velocity' | 'zoom' | 'whip' | 'slash' | 'iris' | 'dissolve' | 'spin';
export type Transition = {
  kind: TransitionKind;
  /** seconds: the way in (after the cut) and the way out (before it); defaults per kind */
  in?: number;
  out?: number;
  /** whip: where the picture travels; slash: the blade's direction */
  dir?: 'left' | 'right' | 'up' | 'down';
  /** iris: centre, frame fractions */
  at?: [number, number];
  /** velocity: peak speed */
  v?: number;
};

export const TRANSITION_DEFAULTS: Record<TransitionKind, { in: number; out: number }> = {
  cut: { in: 0, out: 0 },
  velocity: { in: 0.32, out: 0.28 },
  zoom: { in: 0.26, out: 0.16 },
  whip: { in: 0.2, out: 0.12 },
  slash: { in: 0.16, out: 0 },
  iris: { in: 0.3, out: 0 },
  dissolve: { in: 0.32, out: 0 },
  spin: { in: 0.26, out: 0.14 },
};
/** transitions that show the next shot over the last one (the shot before plays on under them) */
export const OVERLAP: Partial<Record<TransitionKind, true>> = { slash: true, iris: true, dissolve: true };

export const transitionOf = (tr: CutSpec['tr']): Required<Pick<Transition, 'kind' | 'in' | 'out' | 'v'>> & Transition => {
  const t = typeof tr === 'string' ? { kind: tr } : tr ?? { kind: 'cut' as const };
  const d = TRANSITION_DEFAULTS[t.kind];
  return { ...t, in: t.in ?? d.in, out: t.out ?? d.out, v: t.v ?? 3 };
};

export type LyricShortEdl = { cuts: CutSpec[]; screens: Screen[] };

// ------------------------------------------------------------------ authoring helpers

/** a screen of words: `stack('a soul of grace')` lays itself out; `stack('i do not bite', ['i do', 'not', 'bite'])` by hand */
export const stack = (find: StackSpec['find'], rowsOrOpts?: RowSpec[] | Omit<StackSpec, 'kind' | 'find'>, opts: Omit<StackSpec, 'kind' | 'find' | 'rows'> = {}): StackSpec =>
  Array.isArray(rowsOrOpts) ? { kind: 'stack', find, rows: rowsOrOpts, ...opts } : { kind: 'stack', find, ...rowsOrOpts };
export const full = (at: number, opts: Omit<FullSpec, 'kind' | 'at'> = {}): FullSpec => ({ kind: 'full', at, ...opts });
/** a line over the footage as a lockup: `cap('you call it a curse', { hi: 'curse' })` */
export const cap = (find: CapSpec['find'], opts: Omit<CapSpec, 'kind' | 'find'> = {}): CapSpec => ({ kind: 'cap', find, ...opts });
export const cut = (at: number, shot: string, opts: Omit<CutSpec, 'at' | 'shot'> = {}): CutSpec => ({ at, shot, ...opts });

// ------------------------------------------------------------------ resolving against the song

/** the parts of the manifest the resolver reads */
export type SongLike = {
  beats: { list: { t: number }[] };
  lyrics: { words: { text: string; start: number; end: number }[] }[];
  audio: { duration: number };
};

/** words show this much before their aligned start (aligned starts trail the consonants) */
export const TEXT_LEAD = 0.12;

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const beatTime = (song: SongLike, b: number): number => {
  const list = song.beats.list;
  const k = Math.floor(b);
  if (k < 0) return list[0].t + b * (list[1].t - list[0].t);
  if (k >= list.length - 1) {
    const step = list[list.length - 1].t - list[list.length - 2].t;
    return list[list.length - 1].t + (b - (list.length - 1)) * step;
  }
  return list[k].t + (b - k) * (list[k + 1].t - list[k].t);
};

export const beatAt = (song: SongLike, t: number): number => {
  const list = song.beats.list;
  let k = 0;
  while (k < list.length - 2 && list[k + 1].t <= t) k++;
  return k + (t - list[k].t) / (list[k + 1].t - list[k].t);
};

/** a shot's subject: its face box (or the subject's, where there is no face) and the y of its eye line,
 *  fractions of the source frame */
export type FaceBox = [number, number, number, number, number];

export type ResolvedWord = { text: string; sung: string; start: number; end: number; show: number };
/** a row by hand: indices into the stack's words; `reveal` in song seconds */
export type ResolvedRow = { words: number[]; vertical: false | 'up' | 'down' | 'upright'; fill?: Fill; color?: string; reveal?: number };
export type ResolvedStack = {
  kind: 'stack';
  index: number;
  start: number;
  end: number;
  words: ResolvedWord[];
  /** rows by hand, or null: the layout groups the words */
  rows: ResolvedRow[] | null;
  /** looks per word index (reveal in song seconds) */
  marks: Record<number, Mark>;
  vertical?: boolean;
  enter: 'cut' | 'into';
  exit: 'cut' | 'through' | 'fade';
  /** when the dive starts / the pull-back ends (song seconds) */
  diveFrom: number;
  pullTo: number;
  /** the word a 'through' exit dives into, and the word an 'into' entry pulls back out of */
  throughWord: number;
  intoWord: number;
  /** words over the footage first: true / false, or the flip to the mask in song seconds; undefined: the
   *  theme decides. `ink`: their colour by hand (else from the footage's brightness) */
  reverse?: boolean | number;
  ink?: 'black' | 'white';
};
export type ResolvedFull = { kind: 'full'; index: number; start: number; end: number };
export type ResolvedCap = { kind: 'cap'; index: number; start: number; end: number; words: ResolvedWord[]; hi: number; place: 'low' | 'high' | 'mid'; color?: string };
export type ResolvedScreen = ResolvedStack | ResolvedFull | ResolvedCap;
export type ResolvedCut = {
  at: number;
  shot: string;
  in: number;
  x: number;
  y: number;
  zoom: number;
  rate: number;
  mono: boolean;
  start: number;
  end: number;
  /** how it comes in, and how the next cut comes in (which decides how this one goes out) */
  tr: ReturnType<typeof transitionOf>;
  next: ReturnType<typeof transitionOf> | null;
  /** 'default': the theme's flash colour */
  flash: string | null;
  shake: number;
  /** seconds of the shot the clip file holds, from `in` (speed ramps and the tail under the next cut) */
  span: number;
  file: string;
  /** no crop by hand (x, y, zoom): framing.ts frames it on its subject */
  auto: boolean;
  face?: FaceBox;
  /** twixtor on the beat (CutSpec): ramp strength, zoom punch, camera push; the beats inside the cut,
   *  seconds from its start */
  ramp: number;
  bump: number;
  push: number;
  beats: number[];
  pan: number;
  tilt: number;
};

/**
 * Seconds into a cut's clip file at `tau` seconds into the cut: its own speed (`rate`), plus the speed
 * ramps of a velocity way in (V× easing back to 1×) and way out (1× racing up to V×, held past the cut
 * while the next shot covers it). Closed form, so Node (clip extraction) and the render agree.
 */
/** a beat ramp: fast as each beat lands, gliding slow before the next; the same footage on average */
const rampSeg = (beats: number[], D: number, tau: number) => {
  const marks = [0, ...beats.filter(b => b > 0.02 && b < D - 0.02), D];
  for (let i = 0; i + 1 < marks.length; i++) if (tau < marks[i + 1] || i + 2 === marks.length) return { a: marks[i], b: marks[i + 1], first: i === 0 && !beats.some(b => Math.abs(b) <= 0.02) };
  return { a: 0, b: D, first: true };
};
export const rampTime = (ramp: number, beats: number[], D: number, tau: number) => {
  if (!ramp || tau <= 0 || tau >= D) return tau;
  const { a, b, first } = rampSeg(beats, D, tau);
  if (first) return tau; // before the cut's first beat: its own pace
  const u = (tau - a) / (b - a);
  return a + (b - a) * ((1 - ramp) * u + ramp * (1 - (1 - u) ** 3));
};
export const rampSpeed = (ramp: number, beats: number[], D: number, tau: number) => {
  if (!ramp || tau <= 0 || tau >= D) return 1;
  const { a, b, first } = rampSeg(beats, D, tau);
  if (first) return 1;
  const u = (tau - a) / (b - a);
  return 1 - ramp + ramp * 3 * (1 - u) ** 2;
};

export const clipTime = (c: Pick<ResolvedCut, 'rate' | 'tr' | 'next' | 'start' | 'end'> & Partial<Pick<ResolvedCut, 'ramp' | 'beats'>>, tau: number) => {
  const D = c.end - c.start;
  let extra = rampTime(c.ramp ?? 0, c.beats ?? [], D, tau) - tau;
  if (c.tr.kind === 'velocity' && c.tr.in > 0) {
    const u = Math.min(1, Math.max(0, tau / c.tr.in));
    extra += ((c.tr.v - 1) * c.tr.in * (1 - (1 - u) ** 3)) / 3;
  }
  if (c.next?.kind === 'velocity' && c.next.out > 0) {
    const a = D - c.next.out;
    if (tau > a) {
      const u = Math.min(1, (tau - a) / c.next.out);
      extra += ((c.next.v - 1) * c.next.out * u ** 3) / 3 + (tau > D ? (c.next.v - 1) * (tau - D) : 0);
    }
  }
  return c.rate * (tau + extra);
};

/** how fast the picture runs at `tau` (1 = the cut's own speed): for motion-blur trails */
export const clipSpeed = (c: Pick<ResolvedCut, 'tr' | 'next' | 'start' | 'end'> & Partial<Pick<ResolvedCut, 'ramp' | 'beats'>>, tau: number) => {
  const D = c.end - c.start;
  let m = rampSpeed(c.ramp ?? 0, c.beats ?? [], D, tau);
  if (c.tr.kind === 'velocity' && tau < c.tr.in) m += (c.tr.v - 1) * (1 - tau / c.tr.in) ** 2;
  if (c.next?.kind === 'velocity' && tau > D - c.next.out) m += (c.next.v - 1) * Math.min(1, (tau - (D - c.next.out)) / c.next.out) ** 2;
  return m;
};

/** a short, stable name for a cut's clip: the same cut always maps to the same file. The clip holds
 *  `span` seconds of the shot from `in` at the source's own speed and frame rate (ramps happen in the render). */
export const clipFile = (c: { shot: string; in: number; x: number; y: number; zoom: number; mono: boolean; pan?: number; tilt?: number }, span: number) => {
  const move = c.pan || c.tilt ? [`p${(c.pan ?? 0).toFixed(3)}`, `t${(c.tilt ?? 0).toFixed(3)}`] : [];
  const key = ['v2', c.shot, c.in.toFixed(3), span.toFixed(3), c.x.toFixed(3), c.y.toFixed(3), c.zoom.toFixed(3), c.mono ? 'm' : '', ...move].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  return `${c.shot}-${h.toString(16).padStart(8, '0')}.mp4`;
};

/** clips run this much past their cut: frame rounding, and the shot playing on under the next one
 *  while a slash, iris or dissolve brings it in */
export const CLIP_PAD = 0.45;

export const resolveShort = (song: SongLike, win: { from: number; to: number }, edl: LyricShortEdl, lead = TEXT_LEAD) => {
  const warnings: string[] = [];
  const sung = song.lyrics.flatMap(l => l.words).sort((a, b) => a.start - b.start);
  const keys = sung.map(w => norm(w.text));
  const inWindow = (k: number) => sung[k].start >= win.from - 1 && sung[k].start < win.to;

  const findPhrase = (find: StackSpec['find']): number => {
    const [phrase, nth] = typeof find === 'string' ? [find, 1] : find;
    const toks = phrase.split(/\s+/).map(norm).filter(Boolean);
    let seen = 0;
    for (let k = 0; k + toks.length <= sung.length; k++) {
      if (!inWindow(k)) continue;
      if (toks.every((t, j) => keys[k + j] === t) && ++seen === nth) return k;
    }
    throw new Error(`lyric short: no "${phrase}"${nth > 1 ? ` (#${nth})` : ''} sung between ${win.from.toFixed(2)} and ${win.to.toFixed(2)} s`);
  };

  const screens: ResolvedScreen[] = [];
  edl.screens.forEach((s, index) => {
    if (s.kind === 'full') {
      screens.push({ kind: 'full', index, start: beatTime(song, s.at), end: s.end !== undefined ? beatTime(song, s.end) : NaN });
      return;
    }
    let k = findPhrase(s.find);
    const words: ResolvedWord[] = [];
    // the words as written, in order, matched to the sung words from the phrase's first word on
    const take = (tok: string, where: string) => {
      const want = norm(tok);
      let j = k;
      while (j < sung.length && j < k + 4 && keys[j] !== want) j++;
      if (j >= sung.length || keys[j] !== want) throw new Error(`lyric short: screen ${index} ${where}: "${tok}" is not sung next (next: ${sung.slice(k, k + 4).map(w => w.text).join(' ')})`);
      if (j > k) warnings.push(`screen ${index}: skipped sung "${sung.slice(k, j).map(w => w.text).join(' ')}" before "${tok}"`);
      k = j + 1;
      words.push({ text: tok, sung: sung[j].text, start: sung[j].start, end: sung[j].end, show: sung[j].start - lead });
      return words.length - 1;
    };
    if (s.kind === 'cap') {
      const phrase = typeof s.find === 'string' ? s.find : s.find[0];
      for (const tok of phrase.split(/\s+/).filter(Boolean)) take(tok, `"${phrase}"`);
      const LITTLE = new Set(['a', 'an', 'the', 'i', 'to', 'of', 'in', 'on', 'my', 'it', 'is', 'and', 'for', 'at', 'be', 'me', 'we', 'you', 'your', "i'm", "i'll", 'will', 'with', 'what', 'that', 'there', 'then', 'they', 'yeah', 'get', 'got', 'just', "don't", "you're", "i've", "let's", 'make', 'all', 'so', 'but', 'oh']);
      let hi = s.hi !== undefined ? words.findIndex(w => norm(w.text) === norm(s.hi!)) : -1;
      if (s.hi !== undefined && hi < 0) throw new Error(`lyric short: screen ${index}: no "${s.hi}" to highlight`);
      if (hi < 0) {
        const held = (w: ResolvedWord) => (LITTLE.has(norm(w.text)) ? 0 : 1) * (w.end - w.start + 0.02 * w.text.length);
        hi = words.reduce((best, w, i) => (held(w) > held(words[best]) ? i : best), 0);
      }
      screens.push({ kind: 'cap', index, start: s.at !== undefined ? beatTime(song, s.at) : words[0].show, end: s.end !== undefined ? beatTime(song, s.end) : NaN, words, hi, place: s.place ?? 'low', color: s.color });
      return;
    }
    let rows: ResolvedRow[] | null = null;
    if (s.rows) {
      rows = s.rows.map(r => {
        const spec = typeof r === 'string' ? { text: r } : r;
        const idx = spec.text.split(/\s+/).filter(Boolean).map(tok => take(tok, `row "${spec.text}"`));
        const m = spec as Mark & { vertical?: boolean | 'up' | 'down' | 'upright' };
        return { words: idx, vertical: m.vertical === true ? 'up' : m.vertical || false, fill: m.fill, color: m.color, reveal: m.reveal === undefined ? undefined : beatTime(song, m.reveal) };
      });
    } else {
      const phrase = typeof s.find === 'string' ? s.find : s.find[0];
      for (const tok of phrase.split(/\s+/).filter(Boolean)) take(tok, `"${phrase}"`);
    }
    const marks: Record<number, Mark> = {};
    for (const [word, m] of Object.entries(s.marks ?? {})) {
      const i = words.findIndex(w => norm(w.text) === norm(word));
      if (i < 0) throw new Error(`lyric short: screen ${index}: no "${word}" to mark`);
      marks[i] = { ...m, reveal: m.reveal === undefined ? undefined : beatTime(song, m.reveal) };
    }
    const wordIndex = (w: string | undefined, fallback: number) => {
      if (w === undefined) return fallback;
      const i = words.findIndex(x => norm(x.text) === norm(w));
      if (i < 0) throw new Error(`lyric short: screen ${index}: no "${w}" to dive into`);
      return i;
    };
    const start = s.at !== undefined ? beatTime(song, s.at) : words[0].show;
    const beat = beatTime(song, beatAt(song, start) + 1) - start;
    screens.push({
      kind: 'stack',
      index,
      start,
      end: s.end !== undefined ? beatTime(song, s.end) : NaN,
      words,
      rows,
      marks,
      vertical: s.vertical,
      enter: s.enter ?? 'cut',
      exit: s.exit ?? 'cut',
      diveFrom: (s.through?.beats ?? 2) * beat,
      pullTo: (s.enter === 'into' ? (s.through?.beats ?? 2) : 0) * beat,
      throughWord: wordIndex(s.exit === 'through' ? s.through?.word : undefined, words.length - 1),
      intoWord: wordIndex(s.enter === 'into' ? s.through?.word : undefined, 0),
      reverse: typeof s.reverse === 'object' ? (s.reverse.flip !== undefined ? beatTime(song, s.reverse.flip) : true) : s.reverse,
      ink: typeof s.reverse === 'object' ? s.reverse.ink : undefined,
    });
  });
  screens.sort((a, b) => a.start - b.start);
  screens.forEach((s, i) => {
    if (Number.isNaN(s.end)) s.end = screens[i + 1]?.start ?? win.to;
    if (s.kind === 'stack') {
      // the dive's length was given in beats; it ends with the screen
      s.diveFrom = s.exit === 'through' ? s.end - s.diveFrom : s.end;
      s.pullTo = s.start + s.pullTo;
      const last = Math.max(...s.words.map(w => w.show));
      if (last > s.end) warnings.push(`screen ${s.index}: its last word shows at ${last.toFixed(2)} s, after the screen ends (${s.end.toFixed(2)} s)`);
    }
    if (screens[i + 1] && s.end > screens[i + 1].start + 1e-3) warnings.push(`screen ${s.index} runs past the next screen's start`);
  });

  const sorted = [...edl.cuts].sort((a, b) => a.at - b.at);
  const cuts: ResolvedCut[] = sorted.map((c, i) => {
    const start = beatTime(song, c.at);
    const end = i + 1 < sorted.length ? beatTime(song, sorted[i + 1].at) : win.to;
    const base = { shot: c.shot, in: c.in ?? 0, x: c.x ?? 0.5, y: c.y ?? 0.5, zoom: c.zoom ?? 1, mono: !!c.mono, pan: c.pan ?? 0, tilt: c.tilt ?? 0 };
    const tr = transitionOf(c.tr);
    const next = i + 1 < sorted.length ? transitionOf(sorted[i + 1].tr) : null;
    // the beats inside the cut (a ramp bursts and a bump punches on each)
    const beats: number[] = [];
    for (let b = Math.ceil(beatAt(song, start) - 1e-3); beatTime(song, b) < end - 1e-3; b++) beats.push(beatTime(song, b) - start);
    const timing = { rate: c.rate ?? 1, tr, next, start, end, ramp: c.ramp ?? 0, beats };
    const span = clipTime(timing, end - start + CLIP_PAD);
    const flash = c.flash === true ? 'default' : c.flash || null;
    const auto = c.x === undefined && c.y === undefined && c.zoom === undefined;
    return { ...base, ...timing, at: c.at, flash, shake: c.shake ?? 0, span, file: clipFile(base, span), auto, face: c.face, bump: c.bump ?? 0, push: c.push ?? 0 };
  });
  cuts.forEach((c, i) => {
    const n = cuts[i + 1];
    if (n && OVERLAP[n.tr.kind] && n.tr.in > CLIP_PAD) warnings.push(`cut ${i + 2}: a ${n.tr.kind} longer than ${CLIP_PAD} s runs past the end of the shot before`);
  });
  if (cuts.length && cuts[0].start > win.from + 0.02) warnings.push(`no footage before ${cuts[0].start.toFixed(2)} s (the short starts at ${win.from.toFixed(2)})`);

  // a cut that moves (a transition, a flash, a shake) where the screen changes moves the whole frame —
  // the old words and shot leave together, the new ones arrive together: the screen change is snapped
  // onto the cut (within a third of a beat). Not where a dive or a pull-back already is the move.
  const whole: number[] = [];
  cuts.forEach((c, i) => {
    if (i === 0 || (c.tr.kind === 'cut' && !c.flash && !c.shake)) return;
    const beat = beatTime(song, beatAt(song, c.start) + 1) - c.start;
    const k = screens.findIndex(s => Math.abs(s.start - c.start) < beat / 3);
    if (k <= 0) return;
    const prev = screens[k - 1];
    const next = screens[k];
    if ((prev.kind === 'stack' && prev.exit === 'through') || (next.kind === 'stack' && next.enter === 'into')) return;
    prev.end = c.start;
    if (prev.kind === 'stack') prev.diveFrom = prev.end;
    next.start = c.start;
    if (next.kind === 'stack') next.pullTo = next.start;
    whole.push(i);
  });
  return { screens, cuts, whole, warnings };
};

export type ResolvedShort = ReturnType<typeof resolveShort>;
