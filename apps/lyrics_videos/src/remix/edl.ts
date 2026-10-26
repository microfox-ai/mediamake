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
 * '@title') or '@split' (panels side by side; stacked top to bottom in a vertical frame). Footage plays at its own speed or faster (`rate` > 1,
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
  | 'impact' // a camera hit: shake burst and punch-in
  | 'liquid' // the picture melts: a flowing displacement swells into the cut and settles out of it (fast cuts, a "high")
  | 'flow'; // match on movement: the out-shot's subject keeps moving the way it moved, smeared, and the in-shot carries the move on from the same place and size

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
  | { k: 'hold' } // when the take runs out, its last frame holds to the end of the cut (an ending on a face)
  | { k: 'steps'; at: number[]; s?: number; to?: [number, number] } // punch-ins on the subject (or on `to`, window fractions: the eyes) at these beat indices, `s` each
  // vertical frames (shorts): the wide picture is reframed around its subject unless a cut says otherwise
  | { k: 'aim'; x: number; to?: number } // reframe on this point of the wide picture (0–1 across it), panning to `to` over the cut
  | { k: 'band'; y?: number; h?: number }; // a box across the frame, centred or at `y` (0–1 down it): the whole wide picture as a strip (sharp: no crop), or `h` tall over its width (1 = square), reframed on the subject

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
  /** '@flashes': a blacked-out screen lit only by flashes, [beat, strength 0–1] each (a kick ≈ 1, a hat ≈ 0.3) */
  flashes?: [number, number][];
};
export type Block = { id: string; at: number; cuts: Cut[] };

const TRANSITIONS = new Set<string>(['cut', 'zoom', 'whip', 'whipr', 'whipv', 'spin', 'match', 'carry', 'pass', 'flash', 'impact', 'liquid', 'flow']);
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
/** a blackout lit only by flashes on the beat (a drop's punches without pictures) */
export const flashes = (b: number, at: [number, number][], ...mods: (Transition | Fx)[]): Cut => ({ b, src: '@flashes', flashes: at, ...parse(mods) });

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
export const hold: Fx = { k: 'hold' };
export const steps = (at: number[], s = 0.14, to?: [number, number]): Fx => ({ k: 'steps', at, s, to });
export const aim = (x: number, to?: number): Fx => ({ k: 'aim', x, to });
export const band = (y?: number, h?: number): Fx => ({ k: 'band', y, h });

/** shorts: block `b` with its cuts [i, j) (0-based: cut id 'v2.9' is index 8) replaced by `cuts`, which
 *  must last as many beats (so the blocks after it keep their beats) */
export const swap = (b: Block, i: number, j: number, cuts: Cut[]): Block => {
  const beats = (cs: Cut[]) => cs.reduce((a, x) => a + (x.b === 'end' ? 0 : x.b), 0);
  const old = b.cuts.slice(i, j);
  if (Math.abs(beats(old) - beats(cuts)) > 1e-6) throw new Error(`swap in ${b.id}: cuts ${i + 1}–${j} last ${beats(old)} beats, the new ones ${beats(cuts)}`);
  return { ...b, cuts: [...b.cuts.slice(0, i), ...cuts, ...b.cuts.slice(j)] };
};

export type TextStyle =
  | 'line' // a lyric line as a caption in the bottom bar, word by word
  | 'big' // one huge punch word behind the subject (with an outline over it)
  | 'front' // big, over everything
  | 'label' // small mono in the letterbox bars
  | 'sub' // typed subtitle in the bottom bar (spoken parts)
  | 'timer' // a stopwatch counting down to the cue's end
  | 'map' // a circuit map drawing itself, a car dot lapping it; `text` is the circuit's name
  | 'flank' // two words either side of the subject, behind it, wide-spaced ("ATOMIC RAP": first word left, the rest right)
  | 'comic' // a punch word in a comic-book caption box (tilted, bordered, comic lettering) in the top corner away from the subject: the picture stays clear
  | 'decal' // words printed on the subject (a chest print), following its movement; `at` places it
  | 'bar' // a punch word in the letterbox bar above the picture (in the meter's place), streaking in with afterimages: bold, and the picture stays clear
  | 'plane' // a punch word set into the shot in 3D perspective (on a wall, the floor, a board, or hanging in its depth): `at`, `size`, `tilt`; it lives on the cut it is sung on
  | 'glass' // big frosted-glass letters in front: the picture behind them blurred and lit, a thin bright edge; no cutout, so nothing flickers across fast cuts
  | 'ko' // knockout: the window goes black but for the word's letters, which show the picture; at the cue's end the letters grow until the picture fills the frame (diving through a letter)
  | 'stack' // lines (text split on '/') stacked and each fitted to the width of `area`, each slamming in on its sung word (`ws`), in front
  | 'flow'; // rhythmic motion typography: the line's words small at the centre (the line font), each arriving as it is sung while the row glides left, older words fading (the bottom caption steps aside)

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
  /** placement for overlays: centre by default; big words move into the top/bottom band ('t…'/'b…')
   *  and the left/right half ('…l'/'…r'), smaller (two faces in the frame) */
  pos?: 'bl' | 'tr' | 'bc' | 'c' | 'tl' | 'br';
  /** the theme's colours; 'fire' is a true red for words over flames (theme.colors.fire, or #FF3B30) where
   *  the theme's 'red' slot holds its accent */
  color?: 'bone' | 'red' | 'cyan' | 'acid' | 'fire';
  /** 'flank': the subject's left and right edges as fractions of the window, when its cutout is a
   *  crowd rather than one person (the words then sit outside these edges) */
  box?: [number, number] | [number, number, number];
  /** 'decal': where the print sits when the cue starts (window fractions); it then follows the subject.
   *  'plane': the word's centre on its surface */
  at?: [number, number];
  /** 'decal' / 'comic' / 'plane' / 'flank': the letters' height as a fraction of the window's */
  size?: number;
  /** 'plane': the surface's turn in degrees [rx, ry, rz] — rx > 0 lays the word back toward a floor
   *  (its top farther away), ry > 0 turns it like a wall receding to the left (< 0: to the right), rz
   *  rolls it in the picture */
  tilt?: [number, number, number];
  /** 'flank': letter spacing in em (default 1.1) */
  track?: number;
  /** big words: set in the theme's script font (fonts.script) instead of the punch font (an elegant word) */
  font?: 'script';
  /** big words: the glyph words "X", "✓" and "▶" drawn as pen strokes (CROSS ME → X ME, TASK ✓, PLAY ▶) */
  drawX?: boolean;
  /** big and plane words act out their meaning (quicksilverxkingpin rev-003: "that cross me was excellent,
   *  think of ideas like that"): 'streak' races in with afterimages (FAST); 'bite' gets a bite taken out
   *  (SNACK); 'slice' is cut in two along a slash (CHOP); 'dodge' letters jump aside from a bullet streak
   *  (MISSED); 'hop' letters hop (TIME HOP); 'drop' letters fall away (DROP); 'stamp' slams down like a
   *  rubber stamp (NOT TODAY); 'shake' trembles red-hot (RAGE); 'erase' is wiped away (BLANK PAGE);
   *  'gauge' fills up from the bottom (GOLDEN GAUGE); 'explode' bursts apart in slow motion (WORLD);
   *  'dissolve' vanishes letter by letter (DISAPPEAR); 'twinkle' flickers like stars (MILKY WAY); 'push'
   *  shows all but the first letter, which slides in at beat `pushAt` and shoves the rest along (EARS → YEARS);
   *  'glitch' lands with a colour split and a torn slice, like a skip in time (NEVER PAST); 'shiver' trembles
   *  and then calms (FEAR); 'drift' letters float apart, weightless (DRIFTING); 'slide' fades in sliding a
   *  little to the left and keeps gliding (DIVINE, rev-005: "just a little left slide is enough"); 'twist'
   *  letters spin into place one after another (LIGHT YEARS on a spin cut, rev-006: "a twist matching the
   *  video"); 'liquid' melts and wavers more and more, as if getting high (HIGH, rev-006) */
  act?: 'streak' | 'bite' | 'slice' | 'dodge' | 'hop' | 'drop' | 'stamp' | 'shake' | 'erase' | 'gauge' | 'explode' | 'dissolve' | 'twinkle'
    | 'push' | 'glitch' | 'shiver' | 'drift' | 'slide' | 'twist' | 'liquid';
  /** act 'push': the beat the first letter arrives on */
  pushAt?: number;
  /** 'stack': the sung word (its index in the line) each '/'-separated line lands on */
  ws?: number[];
  /** 'stack': the box the column fills [x0, y0, x1, y1] (window fractions): each line as wide as it, the
   *  whole column shrunk to fit its height */
  area?: [number, number, number, number];
  /** 'stack': 'multiply' prints the letters into a bright part of the picture (a sky): they show over light
   *  and vanish behind anything dark in front of it (curtains, a window's frame); no dimming, flash or glow */
  blend?: 'multiply';
  /** 'ko': seconds the dive through the letters takes at the cue's end (default 0.3) */
  koZoom?: number;
  /** 'ko': how it ends — 'dive' through a letter into the next cut (default), or 'fall': the letters drop
   *  away one by one and leave the black (DROP, when the next cut is a dark stage) */
  koOut?: 'dive' | 'fall';
  /** big words: split around the subject — the first `split` letters left of its cutout, the rest right of
   *  it, as tall as the subject (quicksilverxkingpin rev-005: "ears about the height of his silhouette; the
   *  Y on the left of him, EARS on the right"); with act 'push' the left part slides in at `pushAt` */
  split?: number;
  /** big words: move with the subject (its cutout's centre) from where they landed, as if carried by it */
  follow?: boolean;
  /** 'plane': each word lands like a knock on a door — a thump and a shudder — instead of sliding in */
  knock?: boolean;
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
export type TitleCard = {
  logo: string; text: string; sub?: string; hit: number;
  /** the logo's width in the lockup (px at 1080p, default 540) and the title's size (default 150):
   *  a wide wordmark next to a short title wants a bigger logo and a smaller title */
  logoW?: number; size?: number;
};
export type Gfx = {
  lights?: LightsRig[];
  title?: TitleCard;
  /** [from, to] beat ranges before a drop: the frame darkens and the bars close in, released on `to` */
  tension?: [number, number][];
  /** how tension looks: 'bars' (default) close in from top and bottom; 'smoke' is green chemical smoke
   *  creeping in from the edges with element symbols drifting through it (Breaking Bad's credits) */
  tensionStyle?: 'bars' | 'smoke';
  /** the top bar's meter: 'revs' (default) slanted rev lights on the bass; 'ecg' a heart monitor trace
   *  beating on the kicks, which flatlines from beat `flatline` on; 'bolt' a lightning bolt with speed
   *  lines either side that charge outward with the bass and crackle on the kicks (a speedster) */
  meter?: { kind: 'revs' | 'ecg' | 'bolt'; flatline?: number };
  /** [from, to, amount] beat ranges where the picture box pumps on every kick like a speaker cone
   *  (it punches out by `amount`, ~0.03–0.07, with a zoom blur, and settles); skipped while a
   *  transition plays, which is the beat's move already */
  pump?: [number, number, number][];
  /** the picture itself takes on a vocal effect (a reverb, a remix), nothing drawn over it: on every
   *  vocal onset it swells like a drop and echoes of the frame spread out from `at` (window fractions,
   *  default the centre), fading like the reverb tail, while the picture flows gently; beats `from`–`to` */
  reverb?: { from: number; to: number; at?: [number, number] }[];
  /** vertical frames: [from, to, h?, y?] beat ranges whose cuts sit in a box across the frame (`band`):
   *  the whole wide picture as a strip, or `h` tall over its width (0.9: a near-square box, enlarged ~1.2×),
   *  sharp where a full-frame reframe would be blown up */
  band?: [number, number, number?, number?][];
};
