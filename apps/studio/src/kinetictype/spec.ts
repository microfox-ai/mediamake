/**
 * A kinetic-type edit as data: projects/<slug>/video/edit.json. Every shot has its own time span in the
 * video's seconds and draws one device of the make-kinetictype style. Pictures are static paths under
 * projects/ ("<slug>/input/plates/riso.png"); every picture is a square (the Midjourney plates and
 * close-ups are 1:1), placed by a focus point given as fractions of its width and height.
 */
export type XY = [number, number];

/** A cut-out (transparent PNG) or close-up placed with its point `f` at screen point `at`, `w` px wide. */
export type Cut = { src: string; at: XY; w: number; f?: XY; filter?: string };

export type SlamFields = {
  /** a solid ground (colour), or `knock`: a plate seen through the type on black, or `plate`: full-bleed behind */
  ground?: string;
  knock?: string;
  plate?: string;
  /** giant type, stacked, each row fitted to `width` (default 1040) and capped at `max` px */
  rows: string[];
  color?: string;
  stroke?: string;
  /** outline copies of the first row climbing above the stack */
  echoes?: boolean;
  /** centre of the stack (px from the top, default 960) */
  y?: number;
  width?: number;
  max?: number;
  /** a cut-out rising into the type from below (in front of it) */
  cut?: Cut;
  /** speed-line colour (none when unset) */
  lines?: string;
  /** the rotation kick at the slam, degrees (random ±4 when unset) */
  rot?: number;
  glow?: string;
  /** two inverted frames at the start: an anime impact frame */
  invertStart?: boolean;
};

type Base = { id: string; from: number; to: number; label?: string };

/** The loop's landing: out of white, the rush of the end's zoom slowing down on a plate. */
export type OpenShot = Base & { type: 'open'; plate: string; face: XY; zoom?: [number, number]; brightness?: [number, number] };
/** One giant word (or stack) slammed on a ground / knockout / plate, a cut-out rising into it. */
export type SlamShot = Base & { type: 'slam'; amp?: number } & SlamFields;
/** A word strobing black / white and growing (the beat before a drop). */
export type StrobeShot = Base & { type: 'strobe'; word: string };
/** A word spelled one letter per hit, each letter its own look; an ink bar spells the word so far. */
export type LettersShot = Base & { type: 'letters'; word: string; hits: number[]; looks: Partial<SlamFields>[]; spell?: boolean };
/** A cracked word on a ground, a cut-out punching up into it, the crack opening at `crackAt`. */
export type CrackShot = Base & { type: 'crack'; word: string; ground: string; color: string; y?: number; width?: number; cut?: Cut; crackAt: number; echoes?: boolean };
/** The word's letters bursting out of a mouth (cut.f = the mouth) and flying past; a dive into the mouth at `diveAt`. */
export type BurstShot = Base & { type: 'burst'; word: string; cut: Cut; ground?: string; diveAt: number; glow?: string };
/** Faces slammed on grounds on the hits, the word running up or down the frame behind them. */
export type FacesShot = Base & {
  type: 'faces';
  word: string;
  faces: { at: number; ground: string; cut: string; f: XY; color: string; side: 'left' | 'right'; lines?: string }[];
};
/** A cut-out (a fist, cut.f = its top) climbing out of the dark towards an outline word; a small word waits above. */
export type RiseShot = Base & { type: 'rise'; big: string; small?: string; smallAt?: number; cut: Cut; roll: number[]; blackAt?: number };
/** Every plate flashing two frames each under a cracked word shaking open, white at the end. */
export type FlashShot = Base & { type: 'flash'; word: string; plates: string[]; y?: number; white?: boolean };
/** The ending: a plate (and its cut-out in front of the type), phrases slammed one by one, the final
 *  two-line lockup with the bottom line cracking, and optionally the rush into a face burning to white. */
export type PosterShot = Base & {
  type: 'poster';
  plate: string;
  cutout?: string;
  plateW?: number;
  plateTop?: number;
  phrases: { at: number; text: string; color?: string }[];
  final: { at: number; top: string; bottom: string; crackAt?: number };
  hits?: number[];
  warp?: { at: number; face: XY };
};

export type Shot = OpenShot | SlamShot | StrobeShot | LettersShot | CrackShot | BurstShot | FacesShot | RiseShot | FlashShot | PosterShot;

export type KineticEdit = {
  version: 1;
  fps?: number;
  width?: number;
  height?: number;
  /** the small label top-left (the timecode runs top-right); none when empty */
  label?: string;
  /** white flashes over everything (the section hits) */
  flashes?: number[];
  shots: Shot[];
};
