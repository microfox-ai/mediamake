/**
 * The anime music video cut list (make-anime-music-video skill): what a project's video/cut.ts
 * exports and src/amv/Amv.tsx plays on the song.
 *
 * All times are song seconds. A cut list is written section by section with the helpers in
 * build.ts (beats, lyric words), then resolved into these flat lists.
 */

/** A footage source: a fast-seeking proxy of one downloaded pack, by short id ('ftw', 's2r', …). */
export type SourceId = string;

/** Colour chapters: each technique / era of the story has its own look. */
export type Grade =
  | 'teal' // default: cyan-teal with crushed blacks (Infinity, the present)
  | 'ice' // pale blue-white, childhood snow
  | 'gold' // the awakening
  | 'purple' // Hollow Purple
  | 'red' // red monochrome (Reversal Red, danger, Sukuna)
  | 'mono' // black-and-white memory
  | 'manga' // black-and-white with screentone, eyes stay blue
  | 'void' // white void, Unlimited Void
  | 'night' // deep blue night (Shibuya)
  | 'warm' // sunsets, the teacher days
  | 'clean' // the anime's own colour, punched up (contrast + saturation, no washes): the flowing edit's default
  | 'none';

/** the colours of the energy (aura, portals, liquid light) */
export type Energy = 'blue' | 'red' | 'purple' | 'gold' | 'white';

/** How a shot comes in. Transitions take a few frames from both shots. */
export type Transition =
  | 'cut'
  | 'whip-l' | 'whip-r' | 'whip-u' | 'whip-d' // directional smear along the motion
  | 'zoom' // radial burst into light
  | 'flash' // white frame
  | 'dip' // through black
  | 'eye' // an eye-shaped slit opens on the new shot (R12)
  | 'iris' // push into a point of the old shot, the new one comes out of it
  | 'glitch' // RGB split and slice displacement
  | 'shatter' // the old shot breaks into shards
  | 'fade'
  // the flowing edit (UnClonable's Darkside): the cut carries on the shape, the eye line, the motion
  | 'match' // a hard cut on a matched shape or eye line (the shot is framed to line up), with a small kick
  | 'liquid' // the old shot melts into the new one along a flowing front (GPU)
  | 'portal' // the new shot opens inside a burning ring at `portal` and pushes through (GPU)
  | 'smoke' // the new shot comes through the old one's light, broken up like smoke (GPU)
  | 'mask' // the new shot's subject (its cutout) arrives first over the old shot, then its world
  | 'blurin' // the new shot starts out of focus and pushed in, and settles (Darkside 0:14)
  | 'bloom' // the old shot blooms out, one black frame, the new one comes in RGB-split (Darkside 2:15)
  // the epic story edit
  | 'bands' // the Goten glitch: the frame breaks into horizontal bands of both shots, shoved sideways, red/blue split, a few inverted
  | 'blink' // the old TV blinking out: the old shot squeezes to a bright line, black, the new one opens from it
  // the smooth cuts (honoredone v7, GPU, real motion blur): the move carries across the cut, very fast, eased
  | 'push' // the old shot zooms in faster and faster, cut, the new one carries the zoom on and settles (ease-out)
  | 'slide-l' | 'slide-r' | 'slide-u' | 'slide-d' // the same along a direction: the picture leaves that way and the next one arrives moving the same way
  | 'warp'; // a push so deep it bends: both shots swell through a lens warp and melt into each other at the cut (the match cut's continuity)

/** the looks a strobing shot flips between (Shot.tsx STROBE) */
export type Strobe = 'none' | 'invert' | 'neg' | 'bw' | 'nbw' | 'thresh' | 'diff' | 'hot';

/** Per-shot effects. */
export type Fx =
  | 'glow' // bloom
  | 'rgb' // chromatic split, strongest on hits
  | 'impact' // inverted high-contrast impact frames on the first frames
  | 'neon' // the frame traced as glowing line art (R02/R12)
  | 'silhouette' // the subject as a black silhouette on a flat colour (needs a cutout)
  | 'rim' // glowing rim around the subject (needs a cutout)
  | 'echo' // trailing copies of the subject (needs a cutout)
  | 'arms' // fanned copies of the subject: the many-armed deity (needs a cutout)
  | 'posterize' // stepped tones
  | 'grain' // heavier film grain
  | 'tilt' // slight Dutch angle
  | 'bass'; // the bass-drop punch (Inverted Devils videos): on every drum hit in the shot a zoom punch, a jolt with motion blur, an RGB split and a flash

export type Shot = {
  id: string;
  /** song time the shot starts and ends */
  from: number;
  to: number;
  src: SourceId;
  /** source time at `from` */
  in: number;
  /** playback rate (1 = as the pack plays; twixtor packs are already slow) */
  rate?: number;
  /** speed ramp: rate goes from ramp[0] to ramp[1] across the shot (overrides rate) */
  ramp?: [number, number];
  /** the snap (speed.ts): the take runs at `rate` until `until` s into the shot, then drops into its own
   *  rate, so the slow motion arrives all of a sudden */
  snap?: { rate: number; until: number; ease?: number };
  /** the same shot flipping between looks on given song times (the Nah, I'd win strobe): inverted, black and
   *  white, threshold, a difference echo… (Shot.tsx STROBE); `glitch` splits the colours on every flip */
  strobe?: { at: number[]; looks?: Strobe[]; glitch?: boolean };
  reverse?: boolean;
  /** freeze on the source frame at this fraction of the shot (0..1) and hold */
  hold?: number;
  /** framing: focus point (0..1 of the source) and zoom (1 = the whole frame) */
  x?: number;
  y?: number;
  z?: number;
  /** zoom added over the shot (push-in; negative pulls out) */
  push?: number;
  /** pan over the shot, fractions of the frame */
  drift?: [number, number];
  /** degrees */
  rot?: number;
  flip?: boolean;
  /** shake amplitude in px (follows the kicks when `kick`) */
  shake?: number;
  kick?: boolean;
  grade?: Grade;
  fx?: Fx[];
  tin?: Transition;
  /** frames the incoming transition takes (overrides the table in Shot.tsx) */
  tlen?: number;
  /** direction the liquid / smoke front travels (screen, x right, y up) */
  dir?: [number, number];
  /** cutout (BiRefNet matte) of this shot's subject: derived/mattes/<id>.webm (+ <id>.matte.mp4) */
  matte?: string;
  /** energy pouring off the subject (needs `matte`) */
  aura?: { color?: Energy; amt?: number; dim?: number; rise?: number };
  /** liquid paint streaming over the shot: colour, direction, coverage (a number, or [from, to] across the shot) */
  paint?: { color?: Energy; dir?: [number, number]; cov?: number | [number, number] };
  /** 'portal' transition: where the ring opens on screen (0..1) and its colour */
  portal?: { x: number; y: number; color?: Energy };
  /**
   * The subject held while the world behind him changes (Darkside 0:46): this shot shows only its cutout
   * (needs `matte`), over these plates, each from its time until the next one's.
   */
  worlds?: World[];
  /** label for the shot map */
  label?: string;
  lyric?: string;
  section?: string;
  /** the sheet shot it came from ('ftw:39'): repeats across packs, match cuts */
  spec?: string;
};

/** a plate behind a held subject (Shot.worlds) */
export type World = { at: number; src: SourceId; in: number; rate?: number; x?: number; y?: number; z?: number; push?: number; grade?: Grade };

/** Words on screen. */
export type WordStyle =
  | 'kinetic' // R02: italic heavy caps in 3D, drifting on a moving camera
  | 'hero' // R02: one huge extruded word (HE'S ALSO, LITTLE TROUBLE)
  | 'serif' // R12: elegant serif line ('Honored One.')
  | 'subtitle' // dialogue-style line, spaced caps, one highlighted word
  | 'kanji' // vertical kanji column, a character per beat
  | 'behind' // giant word behind the subject's cutout (R02 'WIN')
  | 'pill' // small black pill label in front ("I'D WIN")
  | 'nameplate' // character card: kanji name, romaji, title
  | 'stamp' // one word slammed on a hit
  // the powerful set (UnClonable): big, heavy, in the scene
  | 'slam' // giant heavy words, one a beat (`beats`), each landing with a flash, an RGB split and a shake
  | 'lockup' // a thin spaced-caps line (`sub`) over a heavy italic word with a glowing outline
  | 'brush' // brush lettering a word a beat, rotated (`rot`), the `key` word coloured
  | 'outline' // a giant outlined word behind the subject (needs `matte`)
  | 'burn' // heavy letters with the energy pouring off them (GPU aura on the letters)
  | 'knockout' // the footage inside giant letters (`clip`), the rest dark
  // the epic story edit: the summerstyle shorts' type on the footage
  | 'stack'; // the line's words stacked a word or two a row, every row fitted to one column width, each word lighting as it is sung (`beats` = each word's time)

export type Words = {
  from: number;
  to: number;
  text: string;
  style: WordStyle;
  /** a second, smaller line (kinetic above/below, nameplate title) */
  sub?: string;
  /** the word to highlight (subtitle) */
  hi?: string;
  /** centre, fractions of the frame */
  x?: number;
  y?: number;
  /** height of the main line as a fraction of the frame height */
  size?: number;
  /** widest the words may be, as a fraction of the frame width (fitted styles: keep them in the free space) */
  width?: number;
  /** darken the frame behind the words while they are on (0..1; burn, over bright shots) */
  dim?: number;
  color?: string;
  accent?: string;
  /** times (song s) at which each character / word lands (kanji, stamps) */
  beats?: number[];
  /** matte to put this word behind (styles 'behind', 'outline', or any word with `behind`) */
  matte?: string;
  behind?: boolean;
  exit?: 'blur' | 'shatter' | 'cut' | 'fade' | 'dive';
  /** degrees (brush) */
  rot?: number;
  /** the word drawn in the accent colour (slam, brush, lockup) */
  key?: string;
  /** the energy of a 'burn' word */
  energy?: Energy;
  /** the footage inside a 'knockout' word */
  clip?: { src: SourceId; in: number; rate?: number };
  /** the face of a 'stack' (fonts.ts STACK_FONTS) */
  font?: string;
  /** rows of a 'stack' by hand ('|' between rows); default: a word or two a row */
  rows?: string;
  /** how a 'stack' caption moves (motion.tsx): its entrance, holds and exit, chosen for what the words mean */
  mo?: Mo;
  /** how much the line matters, so how big it may go (motion.tsx): s small, m, l, xl one word filling the screen */
  tier?: 's' | 'm' | 'l' | 'xl';
  /** the word(s) set big in the lockup (default: the line's longest word that is not a small word) */
  hero?: string;
  /** how the big word is drawn: fill (white), outline (a stroke: the picture shows through), cutout (behind the
   *  subject, its outline over him; needs the shot's matte), window (the footage inside the letters on black) */
  look?: 'fill' | 'outline' | 'cutout' | 'window';
  /** the free space under the caption (video/space.json, scripts/amv-space.py): the subject's cover and the
   *  brightness per cell, one digit 0-9 a cell */
  space?: { sub: string; luma: string; cols: number; rows: number };
  /** the footage moving under the words (Amv.tsx): default from the motion */
  bg?: Bg[];
  /** plain white letters: no shadow, no halo (honoredone rev-002: "put it in full white, with no shadow") */
  flat?: boolean;
};

/** the camera on the footage while a caption is on */
export type Bg = 'punch' | 'shake' | 'focus' | 'defocus' | 'push' | 'pull' | 'roll' | 'dim' | 'flash' | 'zoom' | 'none';

/** a letter's entrance, landing on its word's sung beat */
export type MoIn =
  | 'rise' // up out of a line (the default)
  | 'drop' // falling in, a heavy bounce (stars will fall)
  | 'assemble' // from all over the frame into place (align)
  | 'throw' // flung in sideways, motion-blurred (you can throw)
  | 'step' // a letter a footstep (walking, stepping)
  | 'pop' // springing up (souvenirs, the crew)
  | 'focus' // racked into focus from a wide blur (let 'em see, staring)
  | 'decode' // scrambled glyphs locking into the letters (Six Eyes, knowledge)
  | 'build' // drawn as outlines on guide lines, then filled (the architect, rebuild)
  | 'spin' // the word rotating into place as the camera rolls (T018)
  | 'slam' // from huge onto the frame, with an impact (Nah, I'd win)
  | 'twinkle' // the letters lit one by one with star glints (stars, cosmos)
  | 'zeno' // closing half the gap again and again, never arriving (never getting there)
  | 'creep' // one letter at a time, slowly (the tortoise, of wait)
  | 'form' // dust gathering into the letters (from the ashes)
  | 'drift' // floating down like snow (snow-white crown)
  | 'descend' // lowered heavily from above (and Earth)
  | 'flip' // turning to face us
  | 'stretch' // snapping in from a long horizontal stretch
  | 'write' // written on by a soft wipe with a pen of light at its edge (Unmatchable.)
  | 'cut'; // just there
/** effects while the caption is on: on the letters, or on the whole set of words */
export type MoHold =
  | 'tremble' | 'wave' | 'arc' | 'space' | 'reach' | 'shimmer'
  | 'breathe' | 'shake' | 'flicker' | 'glitch' | 'heat' | 'ripple'
  | 'reflect' | 'shadow' | 'infinite' | 'echo' | 'rays' | 'drip' | 'glow' | 'sweep' | 'pulse' | 'embers'
  | 'target' | 'stars' | 'band' | 'unband' | 'hollow'
  | 'zoom'; // a slow push into the words
export type MoOut =
  | 'blur' | 'fade' | 'cut' | 'fall' | 'sink' | 'rise' | 'slip' | 'flip' | 'implode'
  | 'dust' | 'burn' | 'erase' | 'dark' | 'shatter' | 'split' | 'slice' | 'smear' | 'dive'
  | 'away'; // carried off sideways (mo.dir) with motion blur, as a hand sweeps it away
export type Mo = {
  in?: MoIn;
  hold?: MoHold[];
  out?: MoOut;
  /** strength (1) */
  k?: number;
  /** copies each side ('echo') */
  echo?: number;
  /** direction of a throw */
  dir?: 1 | -1;
  /** how long the exit takes, s (the table's by default): a dive that is over in a blink (honoredone rev-003,
   *  "it should already zoom in by this point extreme fast") */
  outDur?: number;
};

/** Stock overlays (rain on glass, snow, lightning, leaks…) blended over the picture. */
export type Overlay = {
  from: number;
  to: number;
  src: string; // input/overlays/<src>.mp4
  blend?: 'screen' | 'lighten' | 'overlay' | 'soft-light' | 'hard-light' | 'multiply' | 'color-dodge' | 'color-burn' | 'difference' | 'normal';
  opacity?: number;
  /** CSS filter on the overlay (hue-rotate to recolour lightning etc.) */
  filter?: string;
  rate?: number;
  /** source time at `from` */
  in?: number;
  scale?: number;
  /** under the words (default) or over everything */
  top?: boolean;
  /** seconds it fades in and out over (0.25); 0 cuts it in and out, for an overlay cut on the beats */
  edge?: number;
};

/** Set pieces: graphics that are not footage. */
export type Piece =
  /** neon rings tunnel; drawn behind the current shot's cutout (the shot needs a matte) */
  | { kind: 'rings'; from: number; to: number; color?: string }
  | { kind: 'halo'; from: number; to: number; x: number; y: number; w: number }
  | { kind: 'constellation'; from: number; to: number; text: string; sub?: string; fall: number }
  | { kind: 'split'; from: number; to: number; top: string; bottom: string; kanji?: string[]; beats?: number[] }
  | { kind: 'voidgrid'; from: number; to: number; tiles: string[]; words: string[] }
  | { kind: 'reticle'; from: number; to: number; x: number; y: number; label?: string }
  | { kind: 'clock'; from: number; to: number; text: string }
  | { kind: 'letterbox'; from: number; to: number; ratio: number }
  | { kind: 'flash'; at: number; color?: string; frames?: number }
  | { kind: 'eyeslit'; from: number; to: number; inside: 'rings' | 'void' }
  | { kind: 'sixeyes'; from: number; to: number; tile: string; matte?: string }
  | { kind: 'shards'; at: number; frames?: number }
  | { kind: 'title'; from: number; to: number; text: string; sub?: string };

export type Sfx = { at: number; src: string; volume?: number };

export type Cut = {
  slug: string;
  /** proxies: source id → path under projects/<slug>/ */
  sources: Record<SourceId, { path: string; fps: number }>;
  shots: Shot[];
  words: Words[];
  overlays: Overlay[];
  pieces: Piece[];
  sfx: Sfx[];
  /** extra still images used by pieces (void grid tiles, six-eyes tile): id → path under projects/<slug>/ */
  stills: Record<string, string>;
  /** shots that only pieces show (the two halves of the heaven/earth split), by id */
  aux: Shot[];
  /** drum onsets (song s, scripts/amv-drums.py): what the 'bass' punches land on */
  hits?: number[];
};
