/**
 * Remix edits: the cut list language (make-video-music-remix skill).
 *
 * A project's video/edl.ts exports `blocks` (cuts on the beat grid), `words` (text cues anchored to
 * sung words), `sfx` (sound effects) and optionally `gfx` (graphic cuts, pre-drop tension). Pure data
 * with explicit `.ts` imports, so scripts/remix.ts loads it in Node and the scenes in Remotion.
 *
 * A block starts at a beat index of manifest.beats.list and its cuts run back to back, `b` beats
 * each (halves and quarters allowed); the song's last cut may be 'end'. `src` is a footage shot id
 * (sh#### from the first source, lm#### etc. from others: each source's footage/INDEX.md), a graphic ('@lights',
 * '@title') or '@split' (panels side by side). Footage plays at its own speed or faster (`rate` > 1,
 * `ramp`), never slower: slow motion softens the picture. The one exception is `slow(r)`, a little
 * slow motion for spoken, held passages (a bridge), never on the rap or the drops.
 */

/** How a cut enters (the previous cut plays the matching exit). */
export type Transition =
  | 'cut' // hard cut
  | 'zoom' // warp zoom: out-shot zooms into its subject, in-shot lands from the same anchor and decelerates
  | 'whip' // whip pan with horizontal motion blur (left)
  | 'whipr' // whip pan to the right
  | 'whipv' // vertical whip
  | 'spin' // rotate-zoom with blur
  | 'match' // seamless match cut: the in-shot's subject starts on the out-shot's subject (place and size)
  | 'carry' // the out-shot's subject stays over the in-shot for a moment, then flies past the camera
  | 'pass' // the out-shot's subject zooms past the camera as the in-shot appears behind it
  | 'flash' // a short white flash
  | 'impact'; // a camera hit: shake burst and punch-in

export type Fx =
  | { k: 'mono' } // black and white
  | { k: 'push'; s?: number } // slow push-in over the cut
  | { k: 'shake'; amp?: number } // camera shake driven by the kick and snare
  | { k: 'echo'; n?: number; dt?: number } // After Effects echo: trailing copies of the subject
  | { k: 'streaks' } // speed lines rushing out of the centre
  | { k: 'pop' } // the picture shrinks to a card, the subject spills over its edges
  | { k: 'ramp'; peak?: number } // speed ramp: accelerates from 1× to `peak`× into the next cut
  | { k: 'freeze'; n?: number } // impact frame: holds the first `n` frames, subject outlined in light
  | { k: 'aura' } // a white glow around the subject, pulsing with the kick
  | { k: 'slow'; r: number } // slow motion at `r`× (0.5–0.8): spoken passages only
  | { k: 'rev'; r?: number } // rewind: the take runs backwards from its offset at `r`× (a lyric that says "rewind")
  | { k: 'flat' } // no subject cutout on this cut: words and the sign-off sit over the picture (a subject that fills the frame)
  | { k: 'steps'; at: number[]; s?: number }; // punch-ins on the subject at these beat indices, `s` each

export type Cut = {
  b: number | 'end';
  src: string;
  off?: number;
  rate?: number;
  t: Transition;
  fx: Fx[];
  /** '@split': the shots of the panels, left to right, appearing one after another */
  panels?: string[];
  /** '@split': the beat each panel arrives on (equal shares of the cut when absent) */
  panelAt?: number[];
};
export type Block = { id: string; at: number; cuts: Cut[] };

const TRANSITIONS = new Set<string>(['cut', 'zoom', 'whip', 'whipr', 'whipv', 'spin', 'match', 'carry', 'pass', 'flash', 'impact']);
const parse = (mods: (Transition | Fx)[]) => ({
  t: (mods.find(m => typeof m === 'string' && TRANSITIONS.has(m)) as Transition) ?? 'cut',
  fx: mods.filter((m): m is Fx => typeof m !== 'string'),
});

/** c(beats, shot | [shot, off, rate], ...transition and fx) — e.g. c(1, 'sh0030', 'zoom', shake()) */
export const c = (b: number | 'end', s: string | [string, number?, number?], ...mods: (Transition | Fx)[]): Cut =>
  typeof s === 'string' ? { b, src: s, ...parse(mods) } : { b, src: s[0], off: s[1], rate: s[2], ...parse(mods) };

/** split(beats, [shots], ...mods): panels side by side, one arriving per equal share of the cut;
 *  splitAt(beats, [shots], [beats they arrive on], ...mods) lands each panel on its word */
export const split = (b: number, panels: string[], ...mods: (Transition | Fx)[]): Cut => ({ b, src: '@split', panels, ...parse(mods) });
export const splitAt = (b: number, panels: string[], at: number[], ...mods: (Transition | Fx)[]): Cut => ({ b, src: '@split', panels, panelAt: at, ...parse(mods) });

export const mono: Fx = { k: 'mono' };
export const push = (s = 0.08): Fx => ({ k: 'push', s });
export const shake = (amp = 1): Fx => ({ k: 'shake', amp });
export const echo = (n = 3, dt = 0.06): Fx => ({ k: 'echo', n, dt });
export const streaks: Fx = { k: 'streaks' };
export const pop: Fx = { k: 'pop' };
export const ramp = (peak = 2.2): Fx => ({ k: 'ramp', peak });
export const freeze = (n = 3): Fx => ({ k: 'freeze', n });
export const aura: Fx = { k: 'aura' };
export const slow = (r = 0.7): Fx => ({ k: 'slow', r });
export const rev = (r = 2): Fx => ({ k: 'rev', r });
export const flat: Fx = { k: 'flat' };
export const steps = (at: number[], s = 0.14): Fx => ({ k: 'steps', at, s });

export type TextStyle =
  | 'line' // a lyric line as a caption in the bottom bar, word by word
  | 'big' // one huge punch word behind the subject (with an outline over it)
  | 'front' // big, over everything
  | 'label' // small mono in the letterbox bars
  | 'sub' // typed subtitle in the bottom bar (spoken parts)
  | 'timer' // a stopwatch counting down to the cue's end
  | 'map' // a circuit map drawing itself, a car dot lapping it; `text` is the circuit's name
  | 'flank'; // two words either side of the subject, behind it, wide-spaced ("ATOMIC RAP": first word left, the rest right)

export type TextCue = {
  /** the words; '*' = the lyric line's own text */
  text: string;
  /** lyric line [query, nth], matched case-insensitively by content; the cue starts on its word `w` */
  line?: [string, number?];
  w?: number;
  /** or a fixed beat index */
  beat?: number;
  /** words of the text map to sung words from `w` on, one each; otherwise all appear at once */
  perWord?: boolean;
  style: TextStyle;
  /** beats to hold after the last word ends (defaults per style); the next cue of the layer cuts it off */
  hold?: number;
  /** or end where this lyric line starts (a timer counts down to it) */
  until?: [string, number?];
  /** never before this beat (a word held over a cut can wait for the next shot) */
  start?: number;
  /** gone by this beat at the latest (clear a word before a face or a new section) */
  end?: number;
  /** placement for overlays (big words): centre by default */
  pos?: 'bl' | 'tr' | 'bc' | 'c' | 'tl' | 'br';
  color?: 'bone' | 'red' | 'cyan' | 'acid';
  /** big words: letters [at, at + len) drawn as a periodic-table element box with atomic number `n`
   *  (Breaking Bad's credits: NAMELESS → [Na]MELESS is [0, 2, 11]) */
  el?: [at: number, len: number, n: number];
};

/** A sound effect: a file in derived/sfx/, at a beat or on a sung word. */
export type Sfx = { file: string; beat?: number; line?: [string, number?]; w?: number; gain?: number; lead?: number };

/** A start-lights sequence: one red pair per `on` beat, all out at `out` (beat indices). */
export type LightsRig = { on: number[]; out: number };
/** '@title': a logo (a white-on-transparent PNG under the project) revealed by a light sweep, then the
 *  title slamming in under it on beat `hit`, and a small line under that. */
export type TitleCard = { logo: string; text: string; sub?: string; hit: number };
export type Gfx = {
  lights?: LightsRig[];
  title?: TitleCard;
  /** [from, to] beat ranges before a drop: the frame darkens and the bars close in, released on `to` */
  tension?: [number, number][];
  /** [from, to, amount] beat ranges where the picture box pumps on every kick like a speaker cone
   *  (it punches out by `amount`, ~0.03–0.07, with a zoom blur, and settles); skipped while a
   *  transition plays, which is the beat's move already */
  pump?: [number, number, number][];
};
