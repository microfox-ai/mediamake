/**
 * Stacked lyric typography for a one-picture lyric video (make-waveform-lyric-video): each line a
 * small stack of rows — small tracked caps that wrap in a column, the line's hero word (its <b> in
 * metadata.htmlText) big in a second face — placed beside the subject or at the centre bottom,
 * words filling in as they are sung. Built on Devil in the Details (2026-10-30) after the caption
 * presets were rejected on two projects; every option is a note the user gave there.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { LyricLine } from '../kit/manifest';
import { asset, useHit, useSongTime } from '../kit/hooks';
import { parseCaptionHtmlText } from './html-text';
import { useFontsReady } from '../remix/measure';

/** A font from a file under projects/ (e.g. "<slug>/fonts/BebasNeue.ttf"): Google font loads time
 * out when many render tabs fetch them at once, so a project keeps its two faces as files. */
export type LyricFont = { family: string; file: string; case?: 'upper' | 'lower' | 'as-is' };

const loaded = new Map<string, Promise<void>>();
// a plain identifier: SVG's font-family can't read an unquoted name with punctuation in it
const localFamily = (f: LyricFont) => `lyrics-${f.family.replace(/[^A-Za-z0-9]+/g, '-')}`;
const loadFont = (f: LyricFont): Promise<void> => {
  const key = `${f.family}|${f.file}`;
  let p = loaded.get(key);
  if (!p) {
    p =
      typeof document === 'undefined'
        ? Promise.resolve()
        : (() => {
            const face = new FontFace(localFamily(f), `url(${asset(f.file)})`);
            document.fonts.add(face);
            return face.load().then(() => undefined);
          })();
    loaded.set(key, p);
  }
  return p;
};
const both = new Map<string, Promise<unknown>>();
const loadBoth = (a: LyricFont, b: LyricFont) => {
  const key = `${a.file}|${b.file}`;
  if (!both.has(key)) both.set(key, Promise.all([loadFont(a), loadFont(b)]));
  return both.get(key)!;
};

type Face = 'caps' | 'hero';
type Fonts = Record<Face, LyricFont>;
type Side = 'left' | 'right';
/** Where a stack stands: a side column (chorus lines), or the centre bottom (the rest). */
type Place = Side | 'center';

export type StackedLyricsProps = {
  /** The two faces: `caps` for the line (small, tracked), `hero` for its <b> word (big). */
  fonts: Fonts;
  /** The two columns beside her, frame px. Lines alternate between them, rows centred in the column. */
  columns: Record<Side, { x: number; width: number }>;
  /** The band the stacks are centred in, and the tallest a stack may be. */
  band: { center: number; maxHeight: number };
  /**
   * The caps at one small size, wrapping inside the column; the hero word big (smaller only when it
   * wouldn't fit). 2026-10-30: "width fitting is not done neatly … keep the bebas neue in small size
   * and rocksalt in big size".
   */
  size: { caps: number; hero: number };
  colors: {
    /** Words not sung yet: a hollow outline you can read ahead. */
    outline: string;
    sung: string;
    hero: string;
    heroOutline: string;
  };
  /** A line slides in this long before its first word, and leaves this long after its last when music follows. */
  lead?: number;
  hold?: number;
  /** Degrees the whole stack leans (caps and hero together). */
  heroTilt?: number;
  /** Letter spacing in em: the caps and the hero word (2026-10-30: "add spacing to the highlighted
   * font … having spacing makes it readable"). Default 0.06 and 0.09. */
  tracking?: { caps: number; hero: number };
  /**
   * Space round the hero row (× the caps size) and between caps rows (× the row size). Default 0.3
   * and 0.22: tight for a leaning condensed stack; an upright, wide-tracked serif stack needs more air
   * (Cadence, 2026-10-31: the hero's pop touched the row under it).
   */
  leading?: { hero?: number; rows?: number };
  /**
   * From this song second (or the start of this section label) on, no stacks: each line alone at the
   * centre bottom (baseline `y`) in the hero face, `color`, its words lighting as they are sung; the word
   * matching `hero` set at `heroSize`, the rest at `size`. 2026-10-30: "put all in rock salt, divide
   * it like this: the fine print. / the details / Yeah / The Devil (only word that's very big) / is in
   * the details."
   */
  power?: { from: number | string; y: number; size: number; heroSize: number; hero: string; color: string };
  /**
   * Every line but the chorus (lyrics metadata.section "chorus"): a stack at the same sizes, centred on
   * `x` in a column `width` wide, its bottom at `bottom`, all white (`hero` / `heroOutline` replace the
   * red). 2026-10-30: "put everything in white (do not change size), and put everything at bottom
   * center, except chorus sections, keep them as is (in their current positions and colors)".
   */
  center?: { x: number; width: number; bottom: number; hero: string; heroOutline: string };
};

type Word = { text: string; start: number; end: number };
type Row = {
  face: Face;
  words: number[];
  texts: string[];
  size: number;
  /** each word's x offset in the row, and the row's width (px at `size`) */
  xs: number[];
  width: number;
  ascent: number;
  descent: number;
  /** filled in by the stack: the baseline and the row's left edge */
  baseline: number;
  left: number;
};
type Stack = {
  line: number;
  side: Place;
  col: { x: number; width: number };
  rows: Row[];
  words: Word[];
  hero: Set<number>;
  top: number;
  bottom: number;
};

const REF = 200;
const DEFAULT_TRACKING = { caps: 0.06, hero: 0.09 };

/** Measuring and setting text in the two faces, once the fonts are loaded. */
const typesetter = (fonts: Fonts, tracking: { caps: number; hero: number }) => {
  let ctx: CanvasRenderingContext2D | null = null;
  const metrics = (face: Face, text: string) => {
    if (!ctx && typeof document !== 'undefined') ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return { width: text.length * REF * 0.45, ascent: REF * 0.7, descent: REF * 0.1 };
    ctx.font = `${REF}px "${localFamily(fonts[face])}"`;
    const m = ctx.measureText(text);
    return { width: m.width, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
  };
  /** The caps in upper case, the hero word lower case (unless the font says), trailing punctuation
   * gone (the type carries the pause). */
  const shown = (face: Face, text: string) => {
    const t = text.replace(/[.,!?;:]+$/u, '');
    const c = fonts[face].case ?? (face === 'caps' ? 'upper' : 'lower');
    return c === 'upper' ? t.toUpperCase() : c === 'lower' ? t.toLowerCase() : t;
  };
  return { metrics, shown, tracking, family: (face: Face) => localFamily(fonts[face]) };
};
type Typesetter = ReturnType<typeof typesetter>;

/** A row at `size`, shrunk only if it would run past `width`. */
const setRow = (ts: Typesetter, face: Face, words: number[], all: Word[], width: number, max: number): Row => {
  const { metrics, shown } = ts;
  const texts = words.map(i => shown(face, all[i].text));
  const full = metrics(face, texts.join(' '));
  // the letters are tracked open (tracking em after every letter, as SVG letter-spacing draws it),
  // and a condensed caps face's own space is tight: open it a little so words never touch
  const track = REF * ts.tracking[face];
  const space = metrics(face, 'a a').width - metrics(face, 'aa').width + (face === 'caps' ? REF * 0.12 : 0);
  const wordWidths = texts.map(t => metrics(face, t).width + track * [...t].length);
  const natural = wordWidths.reduce((a, b) => a + b, 0) + space * (texts.length - 1);
  const size = Math.min(max, (width / natural) * REF);
  const k = size / REF;
  let pen = 0;
  const xs = wordWidths.map(w => {
    const x = pen;
    pen += w + space;
    return x * k;
  });
  return { face, words, texts, size, xs, width: natural * k, ascent: full.ascent * k, descent: full.descent * k, baseline: 0, left: 0 };
};

/** A run of plain words as Bebas rows at one size, wrapped at the column width. */
const wrapRows = (ts: Typesetter, run: number[], all: Word[], width: number, size: number): Row[] => {
  const rows: Row[] = [];
  let cur: number[] = [];
  for (const i of run) {
    const next = [...cur, i];
    if (cur.length && setRow(ts, 'caps', next, all, Infinity, size).width > width) {
      rows.push(setRow(ts, 'caps', cur, all, width, size));
      cur = [i];
    } else cur = next;
  }
  if (cur.length) rows.push(setRow(ts, 'caps', cur, all, width, size));
  return rows;
};

const layoutLine = (ts: Typesetter, line: LyricLine, index: number, p: StackedLyricsProps): Stack => {
  const { shown } = ts;
  const chorus = (line.metadata as { section?: string } | undefined)?.section === 'chorus';
  const side: Place = p.center && !chorus ? 'center' : index % 2 ? 'right' : 'left';
  const col = side === 'center' ? { x: p.center!.x - p.center!.width / 2, width: p.center!.width } : p.columns[side];
  const { width } = col;
  const heroWidth = width;
  const words: Word[] = line.words.map(w => ({ text: w.text, start: w.start, end: w.end }));
  const parsed = parseCaptionHtmlText((line.metadata as { htmlText?: string } | undefined)?.htmlText, words);
  const hero = new Set(parsed?.highlightedWordIndices ?? []);
  // the line's parts (its <br/> rows), as word index runs
  const counts = (parsed?.splitParts ?? [line.text]).map(s => s.split(/\s+/).filter(Boolean).length);
  const parts: number[][] = [];
  let at = 0;
  for (const c of counts) {
    parts.push(Array.from({ length: c }, (_, i) => at + i).filter(i => i < words.length));
    at += c;
  }
  if (at < words.length) parts[parts.length - 1].push(...Array.from({ length: words.length - at }, (_, i) => at + i));

  const rows: Row[] = [];
  const partStarts: number[] = [];
  for (const part of parts) {
    partStarts.push(rows.length);
    let run: number[] = [];
    let heroRun: number[] = [];
    const flush = () => {
      if (run.length) rows.push(...wrapRows(ts, run, words, width, p.size.caps));
      run = [];
    };
    const flushHero = () => {
      if (heroRun.length) rows.push(setRow(ts, 'hero', heroRun, words, heroWidth, p.size.hero));
      heroRun = [];
    };
    // a tiny word next to the hero ("a lie", "the fine print") joins the scrawl instead of standing
    // alone as a sliver of a row
    const tiny = (run: number[]) => run.reduce((n, i) => n + shown('caps', words[i].text).length, 0) <= 3;
    for (let j = 0; j < part.length; j++) {
      const i = part[j];
      if (hero.has(i)) {
        if (run.length && tiny(run) && !heroRun.length) {
          heroRun.push(...run);
          run = [];
        }
        flush();
        heroRun.push(i);
      } else {
        const rest = part.slice(j).filter(k => !hero.has(k));
        if (heroRun.length && run.length === 0 && rest.length && tiny(rest) && rest.length === part.length - j) {
          heroRun.push(...rest);
          break;
        }
        flushHero();
        run.push(i);
      }
    }
    flush();
    flushHero();
  }

  // stack the rows: tight between Bebas rows, a hair more round the hero (2026-10-30: "a tiny little
  // line spacing so the third line does not intersect with the highlight word, just enough"); the
  // whole stack leans together, so the rows stay parallel
  const gapAfter = (a: Row, b: Row, newPart: boolean) => {
    if (a.face === 'hero' || b.face === 'hero') return (p.leading?.hero ?? 0.3) * p.size.caps;
    const rows = p.leading?.rows ?? 0.22;
    return (newPart ? Math.max(0.5, rows) : rows) * Math.min(a.size, b.size);
  };
  let y = 0;
  rows.forEach((r, i) => {
    if (i) y += gapAfter(rows[i - 1], r, partStarts.includes(i));
    r.baseline = y + r.ascent;
    y = r.baseline + r.descent;
  });
  const height = y;
  const scale = Math.min(1, p.band.maxHeight / height);
  const top = side === 'center' ? p.center!.bottom - height * scale : p.band.center - (height * scale) / 2;
  for (const r of rows) {
    if (scale < 1) {
      r.size *= scale;
      r.width *= scale;
      r.ascent *= scale;
      r.descent *= scale;
      r.xs = r.xs.map(x => x * scale);
    }
    r.baseline = top + r.baseline * scale;
    // centred in the column (2026-10-30: "make the sentence center aligned")
    r.left = col.x + (col.width - r.width) / 2;
  }
  return { line: index, side, col, rows, words, hero, top, bottom: top + height * scale };
};

const ease = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/**
 * The lyrics as stacked typography beside the subject (the summerstyle lockups made for a 16:9
 * frame): each line a stack centred in a column, lines alternating left and right, the whole stack
 * leaning; or (with `center`) every non-chorus line at the centre bottom; or (from `power.from`)
 * each line alone at the centre bottom in the hero face. Words not sung yet wait dim (the hero as an
 * outline), fill in with a small punch as they are sung, and lines leave before any music-only
 * stretch.
 */
export const StackedLyrics: React.FC<SceneProps<StackedLyricsProps>> = props => {
  const { manifest, fonts, colors, lead = 0.35, hold = 0.7, heroTilt = -5, power } = props;
  const t = useSongTime();
  const kick = Math.min(1, useHit('kick', 9));
  const { width: W, height: H } = useVideoConfig();
  const ready = useFontsReady(loadBoth(fonts.caps, fonts.hero));
  const ts = useMemo(
    () => typesetter(fonts, props.tracking ?? DEFAULT_TRACKING),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fonts.caps.file, fonts.hero.file, props.tracking?.caps, props.tracking?.hero],
  );
  const { metrics, shown } = ts;
  const lines = manifest.lyrics;
  const stacks = useMemo(
    () => (ready ? lines.map((l, i) => layoutLine(ts, l, i, props)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, lines, ts],
  );
  if (!ready) return null;

  const powerFrom =
    power === undefined
      ? Infinity
      : typeof power.from === 'number'
        ? power.from
        : (manifest.sections.find(s => s.label === power.from)?.from ?? Infinity);
  const visible = stacks
    .map((s, i) => {
      const line = lines[i];
      const next = lines[i + 1];
      const show = line.start - lead;
      // back-to-back lines hand over at the next line's entrance; before a gap, leave after `hold`
      const hide = next && next.start - lead < line.end + hold ? next.start - lead * 0.4 : line.end + hold;
      return { s, show, hide, power: line.start >= powerFrom };
    })
    .filter(v => !v.power && t >= v.show - 0.05 && t <= v.hide + 0.3);

  // the power line: the line being sung now, alone at the centre bottom
  const powerLine = (() => {
    if (!power) return null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.start < powerFrom) continue;
      const next = lines[i + 1];
      const end = next ? Math.min(line.end + hold, next.start - 0.03) : line.end + hold;
      if (t < line.words[0].start - 0.03 || t > end + 0.25) continue;
      return { index: i, line, end };
    }
    return null;
  })();

  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id="word-shadow" x="-10%" y="-30%" width="120%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity="0.75" />
          </filter>
        </defs>
        {visible.map(({ s, show, hide }) => {
          const inP = ease(interpolate(t, [show, show + 0.3], [0, 1], clamp));
          const outP = ease(interpolate(t, [hide, hide + 0.3], [0, 1], clamp));
          // side stacks slide in from their side, centre ones rise
          const dir = s.side === 'left' ? -1 : s.side === 'right' ? 1 : 0;
          const rise = s.side === 'center' ? 1 : 0;
          const white = s.side === 'center' && props.center;
          const heroFill = white ? white.hero : colors.hero;
          const heroOutline = white ? white.heroOutline : colors.heroOutline;
          const { col } = s;
          const cx = col.x + col.width / 2;
          const cy = (s.top + s.bottom) / 2;
          const punch = 1 + 0.02 * kick;
          // the whole stack leans (2026-10-30: "put the bebas neue also in rotation angle")
          return (
            <g
              key={s.line}
              opacity={inP * (1 - outP)}
              transform={`translate(${cx} ${cy}) scale(${punch}) rotate(${heroTilt}) translate(${-cx} ${-cy})`}
            >
              {s.rows.map((r, ri) => {
                // rows slide in from the side, one after another
                const rp = ease(interpolate(t, [show + ri * 0.05, show + ri * 0.05 + 0.32], [0, 1], clamp));
                const dx = dir * 70 * (1 - rp) + dir * 40 * outP;
                const dy = rise * (40 * (1 - rp) + 20 * outP);
                const isHero = r.face === 'hero';
                return (
                  <g key={ri} transform={`translate(${dx} ${dy})`}>
                    {r.words.map((wi, k) => {
                      const w = s.words[wi];
                      const lit = interpolate(t, [w.start - 0.02, w.start + 0.08], [0, 1], clamp);
                      const pop = 1 + 0.14 * interpolate(t, [w.start, w.start + 0.22], [1, 0], clamp) * (lit > 0 ? 1 : 0);
                      const x = r.left + r.xs[k];
                      const wordW = isHero ? r.width : (r.xs[k + 1] ?? r.width) - r.xs[k];
                      const ox = x + wordW / 2;
                      const oy = r.baseline - r.ascent / 2;
                      const common = {
                        x,
                        y: r.baseline,
                        fontFamily: ts.family(r.face),
                        fontSize: r.size,
                        // small caps read better a little open
                        letterSpacing: r.size * ts.tracking[r.face],
                      };
                      return (
                        <g key={k} transform={`translate(${ox} ${oy}) scale(${pop}) translate(${-ox} ${-oy})`}>
                          {/* the word waits (the hero as an outline, the small caps dim: an outline
                              that thin can't be read ahead); the fill comes in as it is sung */}
                          <text
                            {...common}
                            fill={isHero ? 'none' : colors.outline}
                            stroke={isHero ? heroOutline : undefined}
                            strokeWidth={isHero ? Math.max(1.2, r.size * 0.012) : undefined}
                            opacity={1 - lit * (isHero ? 0.6 : 1)}
                          >
                            {r.texts[k]}
                          </text>
                          <text
                            {...common}
                            fill={isHero ? heroFill : colors.sung}
                            // the marker strokes thickened, so the scrawl outweighs the caps
                            stroke={isHero ? heroFill : undefined}
                            strokeWidth={isHero ? r.size * 0.025 : undefined}
                            strokeLinejoin="round"
                            opacity={lit}
                            // no glow (2026-10-30: "the glow on the highlight is bad"): a soft dark shadow only
                            filter="url(#word-shadow)"
                          >
                            {r.texts[k]}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}
        {power && powerLine && (() => {
          const { line, end, index } = powerLine;
          const first = line.words[0].start;
          const heroRe = new RegExp(power.hero, 'i');
          // the words on one baseline, each at its own size, centred
          const set = line.words.map(w => {
            const size = heroRe.test(w.text) ? power.heroSize : power.size;
            const text = shown('hero', w.text);
            const width = (metrics('hero', text).width / REF) * size + size * ts.tracking.hero * [...text].length;
            return { w, size, text, width };
          });
          const space = ((metrics('hero', 'a a').width - metrics('hero', 'aa').width) / REF) * power.size;
          const total = set.reduce((n, x) => n + x.width, 0) + space * (set.length - 1);
          let pen = W / 2 - total / 2;
          const placed = set.map(x => {
            const at = pen;
            pen += x.width + space;
            return { ...x, x: at };
          });
          const pop = 1 + 0.2 * Easing.out(Easing.cubic)(interpolate(t, [first - 0.03, first + 0.18], [1, 0], clamp));
          const opacity =
            interpolate(t, [first - 0.03, first + 0.05], [0, 1], clamp) * interpolate(t, [end, end + 0.25], [1, 0], clamp);
          const cx = W / 2;
          const cy = power.y - power.size * 0.4;
          return (
            <g
              key={`power-${index}`}
              opacity={opacity}
              transform={`translate(${cx} ${cy}) scale(${pop * (1 + 0.03 * kick)}) rotate(${heroTilt}) translate(${-cx} ${-cy})`}
            >
              {placed.map((x, k) => {
                const lit = interpolate(t, [x.w.start - 0.02, x.w.start + 0.08], [0, 1], clamp);
                const wpop = 1 + 0.12 * interpolate(t, [x.w.start, x.w.start + 0.22], [1, 0], clamp) * (lit > 0 ? 1 : 0);
                const ox = x.x + x.width / 2;
                const oy = power.y - x.size * 0.4;
                return (
                  <g key={k} transform={`translate(${ox} ${oy}) scale(${wpop}) translate(${-ox} ${-oy})`}>
                    <text
                      x={x.x}
                      y={power.y}
                      fontFamily={ts.family('hero')}
                      fontSize={x.size}
                      letterSpacing={x.size * ts.tracking.hero}
                      fill={power.color}
                      stroke={power.color}
                      strokeWidth={x.size * 0.025}
                      strokeLinejoin="round"
                      // words still to come wait faint, sung words full white
                      opacity={0.3 + 0.7 * lit}
                      filter="url(#word-shadow)"
                    >
                      {x.text}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </AbsoluteFill>
  );
};
