/**
 * Kinetic lyric typography for a one-picture lyric video (make-waveform-lyric-video): short screens of
 * a few words — small tracked caps that rise in letter by letter as each word is sung, and the line's
 * hero word (its <b> in metadata.htmlText) big, in a metal gradient, moving by what it means
 * (metadata.fx) and catching a glint of light; words that stamp in trace a Victorian scroll divider.
 * The screen swells on every kick and leaves with a blur when the next one lands.
 *
 * Built for Cadence (2026-10-31): "typography does not mean only a simple font selection. the word
 * should be in rhythm to the meaning of lyrics and the music beats, do proper meaningful animation.
 * the sentences are too lengthy, too tightly packed" → then "some word animations are ugly like
 * mountains bend, use high quality stuff … instead of red as prime, you can use gold, emblematic like
 * on her chest, and add some path trace animations that give victorian era feel when words stamp in":
 * every motion is a masked reveal, a soft wipe, a clean scale or a curve along a path (no letters
 * tossed on an arc, no dot embers, no drip lines, no RGB split).
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { LyricLine } from '../kit/manifest';
import { useBeat, useHit, useSongTime } from '../kit/hooks';
import { parseCaptionHtmlText } from './html-text';
import { useFontsReady } from '../remix/measure';
import { hash } from './PictureLook';
import { loadBoth, localFamily, type LyricFont } from './StackedLyrics';

/**
 * stamp: lands on the beat with a scroll divider traced under it · echo: stamps, outline ghosts
 * ripple out, divider · rise / fall: letters slide in through a mask from below / above · glow: a word
 * of light blooming in · stretch: letters drift apart as it's held · burn: burnished in left to right
 * behind a hot edge · bleed: inked in from the top, in blood · crumble: drifts away like ash ·
 * tremble: a fine shiver with a faint double · blur: a focus pull · cut: a bright slash cuts it in ·
 * type: set letter by letter · bend: the word bows along a curve · shatter: cracks along a slant.
 */
export type Fx =
  | 'stamp'
  | 'echo'
  | 'rise'
  | 'fall'
  | 'glow'
  | 'stretch'
  | 'burn'
  | 'bleed'
  | 'crumble'
  | 'tremble'
  | 'blur'
  | 'cut'
  | 'type'
  | 'bend'
  | 'shatter';

export type KineticLyricsProps = {
  /** `caps` for the small words, `hero` for the <b> word. Fonts are files in the project. */
  fonts: { caps: LyricFont; hero: LyricFont };
  /** px at 1080p: the caps small, the hero big (smaller only to fit its column). */
  size: { caps: number; hero: number };
  /** Letter spacing in em. Default 0.3 and 0.1. */
  tracking?: { caps: number; hero: number };
  /** Extra space between caps words, em. Default 0.4. */
  wordSpace?: number;
  /** The columns the screens alternate between (frame px), and the height they centre on. */
  columns: { left: { x: number; width: number }; right: { x: number; width: number } };
  y: number;
  colors: {
    caps: string;
    /** The hero's metal, top to bottom (a gradient across each letter). */
    metal: string[];
    /** Words of light (fx glow), top to bottom. */
    light?: string[];
    /** Words of blood (fx bleed), top to bottom. */
    blood?: string[];
    /** The traced dividers and the slash / crack lines. */
    ornament?: string;
    /** The glint sweeping across a hero. */
    glint?: string;
    /** Named metals for the hero, top to bottom (4 stops), added to / replacing the built-in TONES. */
    tones?: Record<string, string[]>;
  };
  /** The hero's motion when a line names none. Default 'rise'. */
  fx?: Fx;
  /** How much a screen swells on a kick. Default 0.03. */
  pulse?: number;
  /**
   * Seconds everything shows ahead of the sung times (Cadence, 2026-10-31: "the captions should appear
   * 0.3 seconds earlier"). Default 0.
   */
  advance?: number;
  /** A screen shows this long before its first word, and stays this long after its last before music. */
  lead?: number;
  hold?: number;
};

type Face = 'caps' | 'hero';
type WordBox = {
  text: string;
  start: number;
  end: number;
  face: Face;
  size: number;
  /** Each letter's x from the word's left at its own tracking, and its width. */
  xs: number[];
  ws: number[];
  width: number;
  /** Placed: the word's left edge and baseline. */
  x: number;
  baseline: number;
  /** Cap height, px. */
  cap: number;
};
type Screen = {
  index: number;
  words: WordBox[];
  hero: WordBox | undefined;
  fx: Fx;
  show: number;
  leave: number;
  cx: number;
  cy: number;
  /** The scroll divider under a stamped hero: its centre, half width and height. */
  ornament?: { x: number; y: number; hw: number };
  /** The hero's colour by meaning: a tone name, or "from>to". */
  tone?: string;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeOutQuint = (x: number) => 1 - Math.pow(1 - clamp01(x), 5);
const easeInOut = (x: number) => {
  const c = clamp01(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const easeOutBack = (x: number, s = 1.2) => {
  const c = clamp01(x) - 1;
  return 1 + c * c * ((s + 1) * c + s);
};

const mix = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(',')})`;
};

const REF = 200;
/** How far a stretching word's letters drift apart, em per letter gap. */
const STRETCH = 0.14;
/** Motions that trace a scroll divider under the word. */
const ORNAMENTED: Fx[] = ['stamp', 'echo'];

/**
 * Colours a hero word can take by its meaning (metadata.tone: a name, or "from>to" to change while
 * it's held — PITY burning ember to ash, the SUN dimming to ash). Cadence, 2026-11-01: "use expressive
 * animation (and sometimes color changes) for the highlight word or words depending on the lyrical
 * meaning". Four stops, top to bottom.
 */
export const TONES: Record<string, string[]> = {
  gold: ['#f8ead0', '#e3c48e', '#c49c60', '#8a6438'],
  light: ['#ffffff', '#fff6e0', '#f4e6c4', '#efd9a8'],
  silver: ['#ffffff', '#e3e6ee', '#b9bfcc', '#7f8696'],
  ice: ['#f4fbff', '#cfe6f5', '#9cc3dc', '#5f88a6'],
  ember: ['#fff1c9', '#ffb347', '#e8641c', '#9a2a0a'],
  ash: ['#d8d4cc', '#a9a49b', '#7a766f', '#4a4743'],
  rose: ['#ffe3e0', '#f2a7a0', '#d1706d', '#8e3a3d'],
  crimson: ['#ff5a4f', '#d4202a', '#9c0f18', '#5c050b'],
  blood: ['#e0434c', '#b81c26', '#8a0f18', '#5c080e'],
};

/**
 * A Victorian scroll divider, the right half in units of its half width (y down), drawn outward from
 * the centre: a long rule ending in a spiral scroll, a leaf curl above and a small curl below it.
 */
const SCROLL = [
  'M 0.035 0 C 0.25 0 0.55 0 0.78 -0.02 C 0.92 -0.035 0.995 0.03 0.955 0.075 C 0.925 0.11 0.865 0.09 0.87 0.055 C 0.875 0.03 0.905 0.032 0.908 0.05',
  'M 0.14 0 C 0.22 -0.075 0.35 -0.095 0.395 -0.045 C 0.425 -0.008 0.385 0.025 0.352 0.008',
  'M 0.2 0 C 0.28 0.065 0.4 0.075 0.445 0.035 C 0.465 0.015 0.45 -0.005 0.43 0.005',
];
const DIAMOND = 'M 0 -0.055 L 0.04 0 L 0 0.055 L -0.04 0 Z';
/** A unit path placed at (x, y), `hw` px per unit, mirrored when `side` is -1. */
const place = (d: string, x: number, y: number, hw: number, side = 1) =>
  d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, a, b) => `${(x + side * Number(a) * hw).toFixed(1)} ${(y + Number(b) * hw).toFixed(1)}`);

const measurer = (fonts: KineticLyricsProps['fonts']) => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (face: Face, text: string) => {
    if (!ctx && typeof document !== 'undefined') ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return { width: text.length * REF * 0.6, cap: REF * 0.7 };
    ctx.font = `${REF}px "${localFamily(fonts[face])}"`;
    const m = ctx.measureText(text);
    return { width: m.width, cap: ctx.measureText('H').actualBoundingBoxAscent };
  };
};

const layoutScreen = (
  line: LyricLine,
  index: number,
  next: LyricLine | undefined,
  p: KineticLyricsProps,
  measure: ReturnType<typeof measurer>,
): Screen => {
  const tracking = p.tracking ?? { caps: 0.3, hero: 0.1 };
  const meta = (line.metadata ?? {}) as { htmlText?: string; fx?: Fx; tone?: string };
  const parsed = parseCaptionHtmlText(meta.htmlText, line.words);
  const heroIdx = new Set(parsed?.highlightedWordIndices ?? []);
  const col = index % 2 ? p.columns.right : p.columns.left;
  const fx: Fx = meta.fx ?? p.fx ?? 'rise';
  const shown = (face: Face, t: string) => {
    const s = t.replace(/[.,!?;:]+$/u, '');
    const c = p.fonts[face].case ?? 'upper';
    return c === 'upper' ? s.toUpperCase() : c === 'lower' ? s.toLowerCase() : s;
  };
  const box = (i: number, face: Face, size: number): WordBox => {
    const w = line.words[i];
    const text = shown(face, w.text);
    const k = size / REF;
    const track = tracking[face] * size;
    const chars = [...text];
    const xs: number[] = [];
    const ws: number[] = [];
    let acc = '';
    chars.forEach((ch, j) => {
      xs.push(measure(face, acc).width * k + j * track);
      acc += ch;
      ws.push(measure(face, ch).width * k);
    });
    const width = measure(face, text).width * k + track * Math.max(0, chars.length - 1);
    return { text, start: w.start, end: w.end, face, size, xs, ws, width, x: 0, baseline: 0, cap: measure(face, 'H').cap * k };
  };
  // the hero, shrunk only to fit its column — a stretching word fitted at its widest, fully spread
  // (Cadence: "PATIENCE" ran off the frame's edge as it stretched)
  const heroI = [...heroIdx][0];
  let hero = heroI !== undefined ? box(heroI, 'hero', p.size.hero) : undefined;
  if (hero) {
    const spread = fx === 'stretch' ? STRETCH * p.size.hero * Math.max(0, hero.xs.length - 1) : 0;
    if (hero.width + spread > col.width) hero = box(heroI, 'hero', (p.size.hero * col.width) / (hero.width + spread));
  }
  const space = (p.size.caps * ((p.wordSpace ?? 0.4) + 0.3)) | 0;
  // caps before and after the hero, wrapped in the column in rows of even width (never a lone "a"
  // on a row of its own)
  const wrap = (idx: number[]) => {
    const boxes = idx.map(i => box(i, 'caps', p.size.caps));
    const total = boxes.reduce((n, b) => n + b.width, 0) + space * Math.max(0, boxes.length - 1);
    const count = Math.max(1, Math.ceil(total / col.width));
    const target = Math.min(col.width, total / count + space);
    const rows: WordBox[][] = [];
    let row: WordBox[] = [];
    let w = 0;
    for (const b of boxes) {
      const next = w + (row.length ? space : 0) + b.width;
      if (row.length && (next > col.width || (w >= target * 0.92 && rows.length < count - 1))) {
        rows.push(row);
        row = [];
        w = 0;
      }
      w += (row.length ? space : 0) + b.width;
      row.push(b);
    }
    if (row.length) rows.push(row);
    return rows;
  };
  const all = line.words.map((_, i) => i);
  const before = wrap(all.filter(i => heroI === undefined || i < heroI));
  const after = heroI === undefined ? [] : wrap(all.filter(i => i > heroI));
  const rows: WordBox[][] = [...before, ...(hero ? [[hero]] : []), ...after];
  const ornamented = !!hero && ORNAMENTED.includes(fx);
  // stack: caps rows a little apart, more air round the hero, room for a divider under a stamped one
  const capH = p.size.caps * 0.72;
  const gap = p.size.caps * 0.75;
  const heroGap = p.size.caps * 1.0;
  const ornGap = p.size.caps * 1.5;
  let y = 0;
  const baselines: number[] = [];
  let ornY = 0;
  rows.forEach((r, i) => {
    const isHero = r[0].face === 'hero';
    const prevHero = i > 0 && rows[i - 1][0].face === 'hero';
    if (i) y += prevHero && ornamented ? ornGap + heroGap : isHero || prevHero ? heroGap : gap;
    y += isHero ? r[0].cap : capH;
    baselines.push(y);
    if (isHero) ornY = y + p.size.caps * 0.95;
  });
  if (ornamented && rows[rows.length - 1][0].face === 'hero') y += ornGap;
  const top = p.y - y / 2;
  rows.forEach((r, i) => {
    const rw = r.reduce((n, b) => n + b.width, 0) + space * (r.length - 1);
    let x = col.x + (col.width - rw) / 2;
    for (const b of r) {
      b.x = x;
      b.baseline = top + baselines[i];
      x += b.width + space;
    }
  });
  const words = rows.flat();
  const first = line.words[0].start;
  const last = line.words[line.words.length - 1].end;
  const nextStart = next?.words[0]?.start ?? Infinity;
  const lead = p.lead ?? 0.12;
  const hold = p.hold ?? 0.55;
  // back-to-back screens hand over as the next lands; before music, stay `hold` after the last word
  const leave = nextStart - last < 1.2 ? nextStart - 0.04 : last + hold;
  const cx = col.x + col.width / 2;
  return {
    index,
    words,
    hero,
    fx,
    show: first - lead,
    leave,
    cx,
    cy: p.y,
    ornament: ornamented && hero ? { x: hero.x + hero.width / 2, y: top + ornY, hw: Math.min(col.width / 2, hero.width * 0.62) } : undefined,
    tone: meta.tone,
  };
};

type LetterState = { dx: number; dy: number; sx: number; sy: number; op: number; blur: number };

/** One hero letter's motion at `age` seconds after the word's start (the per-letter motions). */
const heroLetter = (fx: Fx, k: number, n: number, age: number, dur: number, frame: number, w: WordBox): LetterState => {
  const s: LetterState = { dx: 0, dy: 0, sx: 1, sy: 1, op: clamp01(age / 0.08), blur: 0 };
  switch (fx) {
    case 'rise': {
      // up from behind the baseline (the word's clip hides it until it clears)
      const a = age - k * 0.035;
      s.dy = w.size * 0.95 * (1 - easeOutQuint(a / 0.45));
      s.op = a > 0 ? 1 : 0;
      break;
    }
    case 'fall': {
      const a = age - k * 0.03;
      s.dy = -w.size * 0.95 * (1 - easeOutBack(a / 0.42, 0.9));
      s.op = a > 0 ? 1 : 0;
      break;
    }
    case 'glow': {
      const q = clamp01(age / 0.4);
      s.blur = 12 * (1 - easeOut(q));
      s.op = easeOut(q);
      break;
    }
    case 'stretch': {
      const q = easeInOut(age / Math.max(0.7, dur + 0.4));
      s.dx = (k - (n - 1) / 2) * w.size * STRETCH * q;
      s.op = clamp01(age / 0.18);
      s.blur = 3 * (1 - clamp01(age / 0.2));
      break;
    }
    case 'tremble': {
      if (age < dur + 0.3) {
        s.dx = (hash(frame * 7.13 + k * 1.7) - 0.5) * 3.2;
        s.dy = (hash(frame * 3.31 + k * 5.3) - 0.5) * 3.2;
      }
      s.op = clamp01(age / 0.1);
      break;
    }
    case 'type': {
      const step = Math.min(0.85, Math.max(0.3, dur)) / Math.max(1, n);
      const a = age - k * step;
      s.op = clamp01(a / 0.07);
      s.sx = s.sy = a > 0 ? 1 + 0.12 * (1 - easeOut(a / 0.12)) : 1;
      break;
    }
    case 'crumble': {
      s.op = clamp01(age / 0.2);
      s.blur = 4 * (1 - clamp01(age / 0.2));
      // after a held moment the letters drift down and away like ash, one after another
      const a = age - (0.55 + k * 0.06);
      if (a > 0) {
        s.dy = 40 * a + 50 * a * a;
        s.dx = (hash(k * 3.1) - 0.5) * 24 * a;
        s.blur = 6 * clamp01(a / 0.6);
        s.op = 1 - clamp01(a / 0.65);
      }
      break;
    }
    default:
      break;
  }
  return s;
};

export const KineticLyrics: React.FC<SceneProps<KineticLyricsProps>> = props => {
  const { manifest, fonts, colors } = props;
  const t = useSongTime() + (props.advance ?? 0);
  const frame = useCurrentFrame();
  const kick = Math.min(1, useHit('kick', 9));
  const { pulse } = useBeat(6);
  const { width: W, height: H } = useVideoConfig();
  const ready = useFontsReady(loadBoth(fonts.caps, fonts.hero));
  const measure = useMemo(() => measurer(fonts), [fonts]);
  const lines = manifest.lyrics;
  const screens = useMemo(
    () => (ready ? lines.map((l, i) => layoutScreen(l, i, lines[i + 1], props, measure)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, lines, measure],
  );
  if (!ready) return null;
  const ornament = colors.ornament ?? colors.metal[1] ?? '#d9b878';
  const glint = colors.glint ?? '#fff8e6';
  const family = (f: Face) => localFamily(fonts[f]);
  const live = screens.filter(s => t >= s.show - 0.02 && t <= s.leave + 0.3);
  const gradient = (id: string, stops: string[]) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map((c, i) => (
        <stop key={i} offset={stops.length > 1 ? i / (stops.length - 1) : 0} stopColor={c} />
      ))}
    </linearGradient>
  );

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id="kl-shadow" x="-30%" y="-60%" width="160%" height="220%">
            <feDropShadow dx={0} dy={3} stdDeviation={7} floodColor="#000" floodOpacity={0.85} />
          </filter>
          <filter id="kl-bloom" x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur stdDeviation={12} />
          </filter>
          <filter id="kl-trace-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation={2.5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {gradient('kl-metal', colors.metal)}
          {gradient('kl-light', colors.light ?? ['#ffffff', '#fff6e0', '#f0dcae'])}
          {gradient('kl-blood', colors.blood ?? ['#e0303a', '#a8121c', '#5e070d'])}
        </defs>
        {live.map(sc => {
          const exitP = clamp01((t - sc.leave) / 0.25);
          const h = sc.hero;
          const hAge = h ? t - h.start : -1;
          const hDur = h ? h.end - h.start : 0;
          // a small shake when a stamped word lands
          const hits = h && (sc.fx === 'stamp' || sc.fx === 'echo') && hAge > 0 && hAge < 0.4;
          const sh = hits ? Math.exp(-hAge * 14) : 0;
          const shx = sh * 5 * Math.sin(hAge * 75);
          const shy = sh * 3 * Math.cos(hAge * 61);
          const swell = 1 + (props.pulse ?? 0.03) * kick;
          const dir = sc.index % 2 ? 1 : -1;
          return (
            <g
              key={sc.index}
              filter="url(#kl-shadow)"
              opacity={1 - exitP}
              transform={`translate(${shx + dir * 30 * exitP} ${shy - 20 * exitP}) translate(${sc.cx} ${sc.cy}) scale(${swell}) translate(${-sc.cx} ${-sc.cy})`}
              style={{ filter: exitP > 0.02 ? `blur(${(6 * exitP).toFixed(2)}px)` : undefined }}
            >
              {sc.words.map((w, wi) => {
                const common = { fontFamily: family(w.face), fontSize: w.size };
                if (w.face === 'caps') {
                  // the small words rise in letter by letter on their own start
                  return (
                    <g key={wi}>
                      {[...w.text].map((ch, k) => {
                        const a = t - (w.start + k * 0.018);
                        if (a < 0) return null;
                        const q = clamp01(a / 0.18);
                        const blur = 4 * (1 - q);
                        return (
                          <text
                            key={k}
                            x={w.x + w.xs[k]}
                            y={w.baseline + 14 * (1 - easeOut(q))}
                            {...common}
                            fill={colors.caps}
                            opacity={q}
                            style={{ filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined }}
                          >
                            {ch}
                          </text>
                        );
                      })}
                    </g>
                  );
                }
                if (hAge < 0) return null;
                const fx = sc.fx;
                const chars = [...w.text];
                const n = chars.length;
                const cx = w.x + w.width / 2;
                const cy = w.baseline - w.cap / 2;
                const id = `kl-${sc.index}-${wi}`;
                // the colour by meaning: a named tone, or one changing into another while it's held
                const tones = { ...TONES, ...colors.tones };
                const toneDef = (() => {
                  if (!sc.tone) return null;
                  const [a, b] = sc.tone.split('>');
                  const from = tones[a] ?? tones.gold;
                  const to = b ? (tones[b] ?? from) : from;
                  // the change completes while the screen is up (short screens change faster)
                  const span = Math.max(0.35, Math.min(hDur + 0.5, sc.leave - (h?.start ?? 0) - 0.15));
                  const q = b ? easeInOut((hAge - 0.08) / span) : 0;
                  const stops = from.map((c, i) => (q > 0 ? mix(c, to[i] ?? c, q) : c));
                  return gradient(`${id}-tone`, stops);
                })();
                const fill = toneDef
                  ? `url(#${id}-tone)`
                  : fx === 'glow'
                    ? 'url(#kl-light)'
                    : fx === 'bleed'
                      ? 'url(#kl-blood)'
                      : 'url(#kl-metal)';
                // whole-word motion
                let ws = 1;
                let skew = 0;
                let wBlur = 0;
                let wOp = 1;
                if (fx === 'stamp' || fx === 'echo') {
                  const q = easeOut(hAge / 0.16);
                  ws = 1 + 0.45 * (1 - q);
                  wBlur = 3 * (1 - q);
                  wOp = clamp01(hAge / 0.05);
                } else if (fx === 'shatter' || fx === 'cut') {
                  wOp = fx === 'shatter' ? clamp01(hAge / 0.05) : 1;
                  if (fx === 'shatter') ws = 1 + 0.25 * (1 - easeOut(hAge / 0.12));
                } else if (fx === 'blur') {
                  const q = easeOut(hAge / 0.36);
                  ws = 1.2 - 0.2 * q;
                  skew = -16 * (1 - q);
                  wBlur = 14 * (1 - q);
                  wOp = q;
                }
                // a gentle hop on every beat while it's held
                const hop = -3 * pulse;
                const letters = (key: string, paint = fill, extra?: Partial<LetterState>, stroke?: string) =>
                  chars.map((ch, k) => {
                    const st = { ...heroLetter(fx, k, n, hAge, hDur, frame, w), ...extra };
                    if (st.op <= 0.001) return null;
                    const lx = w.x + w.xs[k] + w.ws[k] / 2;
                    return (
                      <text
                        key={`${key}${k}`}
                        x={0}
                        y={0}
                        textAnchor="middle"
                        transform={`translate(${lx + st.dx} ${w.baseline + st.dy + hop}) scale(${st.sx} ${st.sy})`}
                        {...common}
                        fill={stroke ? 'none' : paint}
                        stroke={stroke}
                        strokeWidth={stroke ? 1.2 : undefined}
                        opacity={st.op}
                        style={{ filter: st.blur > 0.3 ? `blur(${st.blur.toFixed(2)}px)` : undefined }}
                      >
                        {ch}
                      </text>
                    );
                  });
                const wordT = `translate(${cx} ${cy}) scale(${ws}) skewX(${skew}) translate(${-cx} ${-cy})`;
                const wordStyle = { filter: wBlur > 0.3 ? `blur(${wBlur.toFixed(2)}px)` : undefined };
                const top = w.baseline - w.cap - w.size * 0.3;
                const bottom = w.baseline + w.size * 0.25;
                const left = w.x - 50;
                const right = w.x + w.width + 50;
                // a band of light sweeping across the metal, once, just after it lands
                const gA = hAge - (fx === 'burn' ? 0 : 0.14);
                const gDur = fx === 'burn' ? 0.55 : 0.8;
                const g = gA / gDur;
                const band = w.width * 0.28;
                const gx = left + (right - left + band) * easeInOut(g) - band / 2;
                const glintOn = g > 0 && g < 1 && fx !== 'bleed' && fx !== 'crumble' && fx !== 'bend';
                // the body of the word, by motion
                let body: React.ReactNode;
                if (fx === 'rise' || fx === 'fall') {
                  // the mask's edge sits right at the word, so the letters never cross the caps rows
                  // (a falling "DROPS" passed through "THE APPLE" above it)
                  const mTop = fx === 'fall' ? w.baseline - w.cap - 4 : top;
                  const mBottom = fx === 'rise' ? w.baseline + w.size * 0.08 : bottom;
                  body = (
                    <>
                      <clipPath id={`${id}-m`}>
                        <rect x={left} y={mTop} width={right - left} height={mBottom - mTop} />
                      </clipPath>
                      <g clipPath={`url(#${id}-m)`}>{letters('w')}</g>
                    </>
                  );
                } else if (fx === 'burn' || fx === 'bleed') {
                  // burnished in left to right behind a hot edge, or inked in from the top
                  const q = easeInOut(hAge / (fx === 'burn' ? 0.55 : 0.6));
                  const soft = fx === 'burn' ? w.width * 0.18 : w.cap * 0.5;
                  const e = fx === 'burn' ? left - soft + (right - left + 2 * soft) * q : top - soft + (bottom - top + 2 * soft) * q;
                  body = (
                    <>
                      <linearGradient
                        id={`${id}-mg`}
                        gradientUnits="userSpaceOnUse"
                        x1={fx === 'burn' ? e - soft : 0}
                        x2={fx === 'burn' ? e : 0}
                        y1={fx === 'burn' ? 0 : e - soft}
                        y2={fx === 'burn' ? 0 : e}
                      >
                        <stop offset="0" stopColor="#fff" />
                        <stop offset="1" stopColor="#000" />
                      </linearGradient>
                      <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={left - 20} y={top - 20} width={right - left + 40} height={bottom - top + 40}>
                        <rect x={left - 20} y={top - 20} width={right - left + 40} height={bottom - top + 40} fill={`url(#${id}-mg)`} />
                      </mask>
                      <g mask={`url(#${id}-m)`}>{letters('w')}</g>
                    </>
                  );
                } else if (fx === 'bend') {
                  // the word bows along a curve as it's held, the glyphs following it smoothly
                  const q = easeInOut(hAge / Math.max(0.6, hDur + 0.3));
                  const sag = w.size * 0.2 * q;
                  const x0 = w.x - w.size * 0.4;
                  const x1 = w.x + w.width + w.size * 0.4;
                  body = (
                    <>
                      <path id={`${id}-p`} d={`M ${x0} ${w.baseline} Q ${cx} ${w.baseline - 2 * sag} ${x1} ${w.baseline}`} fill="none" />
                      <text
                        {...common}
                        fill={fill}
                        letterSpacing={w.size * (props.tracking?.hero ?? 0.1)}
                        opacity={clamp01(hAge / 0.2)}
                        transform={`translate(0 ${hop + 10 * (1 - easeOut(hAge / 0.3))})`}
                      >
                        <textPath href={`#${id}-p`} startOffset="50%" textAnchor="middle">
                          {w.text}
                        </textPath>
                      </text>
                    </>
                  );
                } else if (fx === 'shatter') {
                  // cracked along a slant: the halves part a little and stay parted
                  const e = easeOut((hAge - 0.12) / 0.3);
                  const mid = w.baseline - w.cap * 0.48;
                  const slant = w.cap * 0.22;
                  body = (
                    <>
                      <clipPath id={`${id}-t`}>
                        <polygon points={`${left},${top} ${right},${top} ${right},${mid - slant} ${left},${mid + slant}`} />
                      </clipPath>
                      <clipPath id={`${id}-b`}>
                        <polygon points={`${left},${mid + slant} ${right},${mid - slant} ${right},${bottom} ${left},${bottom}`} />
                      </clipPath>
                      <g clipPath={`url(#${id}-t)`} transform={`translate(${-6 * e} ${-2.5 * e})`}>
                        {letters('t')}
                      </g>
                      <g clipPath={`url(#${id}-b)`} transform={`translate(${6 * e} ${2.5 * e})`}>
                        {letters('b')}
                      </g>
                      {hAge > 0.1 && hAge < 0.55 && (
                        <line x1={left + 30} y1={mid + slant} x2={right - 30} y2={mid - slant} stroke={glint} strokeWidth={1.6} opacity={1 - clamp01((hAge - 0.1) / 0.45)} />
                      )}
                    </>
                  );
                } else if (fx === 'cut') {
                  // a bright slash sweeps across and the word is cut in behind it
                  const q = easeOut(hAge / 0.22);
                  const edge = left + (right - left + 60) * q;
                  body = (
                    <>
                      <clipPath id={`${id}-c`}>
                        <polygon points={`${left - 60},${top} ${edge + 30},${top} ${edge - 30},${bottom} ${left - 60},${bottom}`} />
                      </clipPath>
                      <g clipPath={`url(#${id}-c)`}>{letters('k')}</g>
                      {q < 1 && <line x1={edge + 34} y1={top} x2={edge - 34} y2={bottom} stroke={glint} strokeWidth={2} opacity={1 - q * 0.5} />}
                    </>
                  );
                } else {
                  body = letters('w');
                }
                return (
                  <g key={wi} opacity={wOp}>
                    {toneDef}
                    {fx === 'glow' && (
                      <g filter="url(#kl-bloom)" opacity={0.3 + 0.4 * (1 - clamp01(hAge / 0.6)) + 0.2 * pulse}>
                        {letters('g', toneDef ? fill : 'url(#kl-light)')}
                      </g>
                    )}
                    {fx === 'echo' &&
                      [1, 2].map(gi => {
                        const q = clamp01(hAge / 0.7);
                        return (
                          <g
                            key={`e${gi}`}
                            opacity={0.6 * (1 - q) * (1 - gi * 0.3)}
                            transform={`translate(${cx} ${cy}) scale(${1 + 0.16 * gi * easeOut(q)}) translate(${-cx} ${-cy})`}
                          >
                            {letters(`e${gi}`, fill, undefined, ornament)}
                          </g>
                        );
                      })}
                    {fx === 'tremble' && hAge < hDur + 0.3 && (
                      <g opacity={0.22} transform="translate(3 -1)">
                        {letters('d')}
                      </g>
                    )}
                    <g transform={wordT} style={wordStyle}>
                      {body}
                      {glintOn && (
                        <>
                          <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={gx - band} y1={w.baseline} x2={gx + band} y2={w.baseline - w.cap}>
                            <stop offset="0" stopColor={glint} stopOpacity={0} />
                            <stop offset="0.5" stopColor={glint} stopOpacity={0.95} />
                            <stop offset="1" stopColor={glint} stopOpacity={0} />
                          </linearGradient>
                          <g style={{ mixBlendMode: 'screen' }} opacity={Math.sin(Math.PI * clamp01(g))}>
                            {letters('s', `url(#${id}-g)`)}
                          </g>
                        </>
                      )}
                    </g>
                    {/* blood running down from a bleeding word's letters (2026-10-31: "there was 'vein'
                        word drip animation before that was smooth, use that" — the first kinetic round's) */}
                    {fx === 'bleed' &&
                      chars.map((_, k) => {
                        if (hash(k * 2.9 + sc.index) > 0.55) return null;
                        const a = hAge - 0.15 - k * 0.03;
                        if (a < 0) return null;
                        const len = 70 * easeOut(a / 0.9) * (0.5 + hash(k * 7.7));
                        const x0 = w.x + w.xs[k] + w.ws[k] * (0.3 + 0.4 * hash(k * 5.1));
                        return (
                          <line
                            key={`d${k}`}
                            x1={x0}
                            y1={w.baseline - 4}
                            x2={x0}
                            y2={w.baseline - 4 + len}
                            stroke={(colors.blood ?? ['#e0303a', '#a8121c'])[1]}
                            strokeWidth={3.2}
                            strokeLinecap="round"
                            opacity={1 - clamp01((a - 1) / 0.6)}
                          />
                        );
                      })}
                    {/* a Victorian scroll divider traced outward under a word that stamps in */}
                    {sc.ornament &&
                      (() => {
                        const o = sc.ornament;
                        const draw = (delay: number, dur: number) => easeInOut((hAge - 0.06 - delay) / dur);
                        const pop = easeOutBack((hAge - 0.04) / 0.22, 2);
                        return (
                          <g filter="url(#kl-trace-glow)">
                            {[1, -1].map(side =>
                              SCROLL.map((d, i) => {
                                const q = draw(i ? 0.18 : 0, i ? 0.5 : 0.75);
                                if (q <= 0) return null;
                                return (
                                  <path
                                    key={`${side}${i}`}
                                    d={place(d, o.x, o.y, o.hw, side)}
                                    pathLength={1}
                                    fill="none"
                                    stroke={ornament}
                                    strokeWidth={i ? 1.4 : 1.8}
                                    strokeLinecap="round"
                                    strokeDasharray="1 1"
                                    strokeDashoffset={1 - q}
                                  />
                                );
                              }),
                            )}
                            {pop > 0 && (
                              <path
                                d={place(DIAMOND, o.x, o.y, o.hw)}
                                fill={ornament}
                                transform={`translate(${o.x} ${o.y}) scale(${pop}) translate(${-o.x} ${-o.y})`}
                              />
                            )}
                          </g>
                        );
                      })()}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
