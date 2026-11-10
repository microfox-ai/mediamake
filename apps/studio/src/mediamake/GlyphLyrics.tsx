/**
 * Kinetic lyric typography drawn from font outlines (glyphs.ts), for the one-picture lyric video: each line a
 * small stack in the picture's free space, built word by word as it is sung. The small words drop in under a
 * vertical smear; the hero word (its <b> in metadata.htmlText, or a whole bold row) slams in from the side under a
 * horizontal motion blur, settles, flickers a ghost above and below as it lands and a pen trace runs round its
 * letters. The stack creeps (a slow push-in and turn) while held and smears out sideways as the next line comes in.
 * Optional: a glitch (colour split + slices jumping) on the way in and out and on the hits of a `drive`; a swash
 * under a hero row; a title card whose outline is traced, then filled with a rising liquid.
 *
 * Every letter is an SVG path, so nothing waits on a web font and the hosted editor (no opentype.js) shows it the
 * same as a render. Built for Hollow Soul (AMZ, 2026-11-09, as the project's InkLyrics) over 12 review rounds; its
 * defaults are where those rounds ended:
 * - lines show 0.3 s ahead of the song (`early`: "captions must appear 0.3 secs faster so as to make it readable");
 * - small words large (62 px at 1080p there: "the smaller words are not visible, keep it large as well");
 * - no swash ("remove the underlines, they look bad"), no glitch blocks between lines ("some boxes that are not
 *   looking good before the words appear"), no inverted frames;
 * - each line hands over to the next back to back: one leaves in a quick 0.16 s as the next enters.
 */
import React, { useId, useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { LyricLine } from '../kit/manifest';
import { useHit, useSongTime } from '../kit/hooks';
import { glyphFont, setGlyphs, type GlyphFont, type PlacedGlyph } from './glyphs';
import { hash } from './PictureLook';

export type GlyphCase = 'as-is' | 'upper' | 'capitalize';

export type GlyphLyricsProps = {
  /** Registered fonts (glyphs.ts): the small words and the hero words. */
  fonts: { caps: string; hero: string };
  /** The stack's centre and widest row, frame px. */
  box: { x: number; y: number; width: number };
  /** px: the small words and the hero words (a hero inside a row of small words is 2.6 × caps). */
  size: { caps: number; hero: number };
  /** Letter spacing of the small words, em. Default 0.12. */
  tracking?: number;
  /** The small words in capitals (default) or as written. */
  capsCase?: 'upper' | 'as-is';
  /** The hero words as written (default), in capitals, or capitalised. */
  heroCase?: GlyphCase;
  colors: {
    /** The hero's fill and the pen that traces it. */
    hero: string;
    pen: string;
    /** The small words. */
    sung: string;
  };
  /** Glow radius px, and how much a kick adds to it (0..1). Default 10, 0.6. */
  glow?: { radius: number; kick?: number };
  /** Another face (case, size) for the heroes of the chorus lines (metadata.section 'chorus'). */
  chorusHero?: { font: string; case?: GlyphCase; size?: number };
  /** Another face for the small words outside the choruses, as written, with its own letter spacing (em). */
  verseCaps?: { font: string; tracking?: number };
  /** Seconds a line shows before its first word and stays after its last. Default 0.35, 0.7. */
  lead?: number;
  hold?: number;
  /** Seconds everything runs ahead of the song: a line shows, builds and leaves this much earlier. Default 0.3. */
  early?: number;
  /** Song windows where the kicks punch the type (and, with `glitch`, the hits glitch it). */
  drive?: [number, number][];
  /** A glitch in and out and on the hits: colour-split px and its colours, how far slices jump px, stray pops a second. */
  glitch?: { split?: number; colors?: [string, string]; slices?: number; pops?: number };
  /** A calligraphic swash written on under a hero row, reaching past the word's ends (px). Off by default. */
  swash?: { reach: number };
  /**
   * A title card: its outline traced letter by letter (`trace` s, from 0.3 s after `from`), then a liquid
   * rising inside it (`fill`: [start, end] s after `from`), held until `to`, when it leaves (glitching, with
   * `glitch`). Song seconds; `scale` × the hero size.
   */
  title?: { text: string; sub?: string; from: number; to: number; scale?: number; trace?: number; fill?: [number, number] };
  /** Keep the title (and its glitch) inside a circle of this radius round the box centre. */
  titleClip?: number;
};

type Word = { index: number; text: string; bold: boolean };
type Placed = { word: Word; face: 'caps' | 'hero'; x: number; width: number; glyphs: PlacedGlyph[]; fit: number; size: number };
type Row = { hero: boolean; words: Placed[]; baseline: number };
type Stack = { rows: Row[]; echo: boolean; top: number; bottom: number };
type Shot = { key: string; line: LyricLine; stack: Stack; show: number; hide: number; seed: number };

/** The line's rows from its htmlText (<br/> rows, <b> heroes; a bold run may cross a row break). */
const rowsOf = (line: LyricLine): Word[][] => {
  const html: string = line.metadata?.htmlText ?? line.text;
  let bold = false;
  let index = 0;
  return html.split(/<br\s*\/?>/i).map(part => {
    const words: Word[] = [];
    for (const tok of part.split(/(<\/?b>)|\s+/i).filter(Boolean)) {
      if (/^<b>$/i.test(tok)) bold = true;
      else if (/^<\/b>$/i.test(tok)) bold = false;
      else words.push({ index: index++, text: tok, bold });
    }
    return words;
  });
};

/** The first letter up (after any opening quote): "white" → "White". */
const capitalize = (s: string) => s.replace(/^([^\p{L}]*)(\p{Ll})/u, (_, pre: string, c: string) => pre + c.toUpperCase());
const cased = (text: string, c: GlyphCase | 'upper' | 'as-is' | undefined) =>
  c === 'upper' ? text.toUpperCase() : c === 'capitalize' ? capitalize(text) : text;

type LayoutOpts = { capsCase: 'upper' | 'as-is'; heroCase: GlyphCase; tracking: number; heroSize: number };

const layout = (line: LyricLine, caps: GlyphFont, hero: GlyphFont, p: GlyphLyricsProps, o: LayoutOpts, scale = 1): Stack => {
  const echo = line.text.trim().startsWith('(');
  const heroSize = o.heroSize * (echo ? 0.62 : 1) * scale;
  const capsSize = p.size.caps * scale;
  const rows = rowsOf(line).map(words => {
    const allBold = words.length > 0 && words.every(w => w.bold);
    let pen = 0;
    const placed = words.map(word => {
      const face = word.bold ? ('hero' as const) : ('caps' as const);
      const size = face === 'hero' ? (allBold ? heroSize : capsSize * 2.6) : capsSize;
      const text = face === 'caps' ? cased(word.text, o.capsCase) : cased(word.text, o.heroCase);
      const set = setGlyphs(face === 'hero' ? hero : caps, text, size, face === 'caps' ? o.tracking : 0);
      const item = { word, face, x: pen, width: set.width, glyphs: set.glyphs, size };
      pen += set.width + (face === 'caps' ? capsSize * 0.42 : heroSize * 0.22);
      return item;
    });
    const last = placed[placed.length - 1];
    const width = last ? last.x + last.width : 0;
    const size = Math.max(0, ...placed.map(w => w.size));
    const font = placed.some(w => w.face === 'hero') ? hero : caps;
    const fit = Math.min(1, (p.box.width * scale) / Math.max(1, width));
    const asc = (font.ascender / font.unitsPerEm) * size * fit;
    const desc = (-font.descender / font.unitsPerEm) * size * fit;
    return { placed, width, fit, asc, desc, hero: allBold };
  });
  const gap = capsSize * 0.35;
  const swashRoom = (r: { hero: boolean }) => (p.swash && r.hero ? heroSize * 0.12 : 0);
  const total = rows.reduce((h, r) => h + r.asc + r.desc + swashRoom(r), 0) + gap * Math.max(0, rows.length - 1);
  const top = p.box.y - total / 2;
  let y = top;
  return {
    echo,
    top,
    bottom: top + total,
    rows: rows.map(r => {
      const baseline = y + r.asc;
      y += r.asc + r.desc + gap + swashRoom(r);
      const left = p.box.x - (r.width * r.fit) / 2;
      return {
        baseline,
        hero: r.hero,
        words: r.placed.map(w => ({ word: w.word, face: w.face, glyphs: w.glyphs, x: left + w.x * r.fit, width: w.width * r.fit, fit: r.fit, size: w.size })),
      };
    }),
  };
};

const ease = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** The motion-blur strengths (px) the smear filters are made for; a blur rounds to the nearest. */
const SMEAR_STEPS = [3, 6, 10, 14, 19, 26];
const smearStep = (px: number) => (px < 1.5 ? 0 : SMEAR_STEPS.reduce((b, s) => (Math.abs(s - px) < Math.abs(b - px) ? s : b)));

/** How long a line takes to leave (the title a little longer). */
const exitOf = (s: { key: string }) => (s.key === 'title' ? 0.45 : 0.16);

export const GlyphLyrics: React.FC<SceneProps<GlyphLyricsProps>> = props => {
  const { manifest, colors, lead = 0.35, hold = 0.7, drive = [], swash, glitch } = props;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `gl${uid}-${name}`;
  const t = useSongTime() + (props.early ?? 0.3);
  const frame = useCurrentFrame();
  const kick = Math.min(1, useHit('kick', 9));
  const snare = Math.min(1, useHit('snare', 12));
  const { width: W, height: H } = useVideoConfig();
  const faces = useMemo(
    () => ({
      caps: glyphFont(props.fonts.caps),
      hero: glyphFont(props.fonts.hero),
      chorus: props.chorusHero ? glyphFont(props.chorusHero.font) : null,
      verseCaps: props.verseCaps ? glyphFont(props.verseCaps.font) : null,
    }),
    [props.fonts.caps, props.fonts.hero, props.chorusHero?.font, props.verseCaps?.font],
  );
  const lines = manifest.lyrics;
  const shots = useMemo((): Shot[] => {
    const base: LayoutOpts = {
      capsCase: props.capsCase ?? 'upper',
      heroCase: props.heroCase ?? 'as-is',
      tracking: props.tracking ?? 0.12,
      heroSize: props.size.hero,
    };
    // back to back: a line enters no earlier than just before the last one's final word ends, and the last one
    // leaves (a quick exit) as it enters (two lines on screen at once read as a mess)
    const showOf = (i: number) =>
      Math.min(lines[i].start - 0.06, Math.max(lines[i].start - lead, i > 0 ? lines[i - 1].end - 0.08 : -Infinity));
    const out: Shot[] = lines.map((line, i) => {
      const show = showOf(i);
      const hide = lines[i + 1] && showOf(i + 1) < line.end + hold ? showOf(i + 1) : line.end + hold;
      const chorus = line.metadata?.section === 'chorus';
      if (chorus && props.chorusHero && faces.chorus) {
        const o = { ...base, heroCase: props.chorusHero.case ?? 'upper', heroSize: props.chorusHero.size ?? props.size.hero };
        return { key: line.id, line, stack: layout(line, faces.caps, faces.chorus, props, o), show, hide, seed: i };
      }
      if (props.verseCaps && faces.verseCaps) {
        const o = { ...base, capsCase: 'as-is' as const, tracking: props.verseCaps.tracking ?? 0.03 };
        return { key: line.id, line, stack: layout(line, faces.verseCaps, faces.hero, props, o), show, hide, seed: i };
      }
      return { key: line.id, line, stack: layout(line, faces.caps, faces.hero, props, base), show, hide, seed: i };
    });
    const title = props.title;
    if (title) {
      // the title as a hero line, its small line under it
      const words = title.text.split(/\s+/);
      const at = title.from + 0.35;
      const line: LyricLine = {
        id: 'title',
        text: title.text,
        start: at,
        end: at + 0.7 * words.length,
        words: [
          ...words.map((w, k) => ({ text: w, start: at + 0.7 * k, end: at + 0.7 * (k + 1) - 0.05 })),
          ...(title.sub ? title.sub.split(/\s+/).map(w => ({ text: w, start: at + 0.7 * words.length, end: at + 0.7 * words.length + 0.3 })) : []),
        ],
        metadata: { htmlText: `<b>${title.text}</b>${title.sub ? `<br/>${title.sub}` : ''}` },
      };
      out.push({ key: 'title', line, stack: layout(line, faces.caps, faces.hero, props, base, title.scale ?? 1.2), show: title.from, hide: title.to, seed: 999 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, lines]);

  const driving = drive.some(([a, b]) => t >= a && t <= b);
  const glowR = (props.glow?.radius ?? 10) * (1 + (props.glow?.kick ?? 0.6) * kick);
  const split = glitch?.split ?? 9;
  const sliceMax = glitch?.slices ?? 46;
  const pops = glitch?.pops ?? 0.6;
  const [colA, colB] = glitch?.colors ?? ['#ff2bd6', '#2bf0ff'];
  const bucket = Math.floor(frame / 2);
  const hitG = glitch ? (driving ? Math.max(Math.max(0, (kick - 0.45) / 0.55), snare * 0.7) : snare * 0.3) : 0;
  const visible = shots.filter(s => t >= s.show - 0.05 && t <= s.hide + exitOf(s) + 0.05);
  const [bx, by] = [props.box.x, props.box.y];
  const at = (g: PlacedGlyph) => `translate(${g.x} 0) scale(${g.s})`;

  const drawTitleWord = (s: Shot, w: Placed, baseline: number, flat: boolean) => {
    const title = props.title!;
    const T0 = s.show + 0.3;
    const TR = title.trace ?? 4;
    const [f0, f1] = title.fill ?? [5, 7.6];
    const fillP = interpolate(t, [s.show + f0, s.show + f1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
    const fit = w.fit;
    const top = baseline - 0.8 * w.size * fit;
    const bottom = baseline + 0.24 * w.size * fit;
    const level = bottom - (bottom - top + 30) * fillP;
    const x0 = w.x - 30;
    const x1 = w.x + w.width + 30;
    const amp = fillP > 0 && fillP < 1 ? 7 : 0;
    let wave = `M ${x0} ${bottom + 60} L ${x0} ${level}`;
    for (let x = x0; x <= x1; x += 14) wave += ` L ${x} ${level + Math.sin(x / 30 + t * 3.2) * amp + Math.sin(x / 11 - t * 5) * amp * 0.35}`;
    wave += ` L ${x1} ${bottom + 60} Z`;
    const clipId = id(`liquid-${w.word.index}`);
    const n = w.glyphs.length;
    const letters = <g transform={`translate(${w.x} ${baseline}) scale(${fit})`}>{w.glyphs.map((g, j) => <path key={j} d={g.d} transform={at(g)} fill={colors.hero} />)}</g>;
    return (
      <g key={w.word.index}>
        <clipPath id={clipId}>
          <path d={wave} />
        </clipPath>
        <g filter={flat ? undefined : `url(#${id('glow')})`}>
          {fillP > 0 ? <g clipPath={`url(#${clipId})`}>{letters}</g> : null}
          <g transform={`translate(${w.x} ${baseline}) scale(${fit})`}>
            {w.glyphs.map((g, j) => {
              const a0 = T0 + (j / Math.max(1, n - 1)) * 0.9;
              const trace = interpolate(t, [a0, a0 + TR], [1, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
              return (
                <path
                  key={j}
                  d={g.d}
                  transform={at(g)}
                  fill="none"
                  stroke={colors.pen}
                  strokeWidth={2.4 / (fit * g.s)}
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={trace}
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        </g>
      </g>
    );
  };

  const draw = (s: Shot, flat: boolean) => {
    const { stack, line } = s;
    const heroSize = props.size.hero * (stack.echo ? 0.62 : 1);
    return stack.rows.map((row, r) => (
      <g key={r}>
        {row.words.map(w => {
          const word = line.words[w.word.index];
          const a = s.key === 'title' ? s.show : Math.max(s.show, (word?.start ?? line.start) - 0.06);
          if (t < a) return null;
          if (s.key === 'title' && w.face === 'hero') return drawTitleWord(s, w, row.baseline, flat);
          const p = interpolate(t, [a, a + 0.12], [0, 1], { ...clamp, easing: ease });
          const fit = w.fit;
          const cx = w.x + w.width / 2;
          if (w.face === 'caps') {
            // a small word drops in under a vertical smear, flashing white
            const stretch = 1 + 1.4 * (1 - p);
            const blur = smearStep(10 * (1 - p));
            const flash = interpolate(t, [a, a + 0.04, a + 0.3], [0, 1, 0], clamp);
            return (
              <g
                key={w.word.index}
                opacity={p}
                transform={`translate(${cx} ${row.baseline}) scale(${fit} ${fit * stretch}) translate(${-w.width / (2 * fit)} 0)`}
                filter={flat ? undefined : blur ? `url(#${id(`smear-y-${blur}`)})` : `url(#${id('shadow')})`}
              >
                {w.glyphs.map((g, k) => (
                  <path key={k} d={g.d} transform={at(g)} fill={flash > 0.5 ? '#ffffff' : colors.sung} />
                ))}
              </g>
            );
          }
          // the hero slams in from the side, settles, ghosts, flares and is traced by the pen
          const slide = (1 - p) * 150;
          const stretch = 1 + 0.7 * (1 - p);
          const blur = smearStep(26 * (1 - p));
          const settle = interpolate(t, [a + 0.12, a + 0.34], [1.07, 1], { ...clamp, easing: ease });
          const punch = driving ? 1 + 0.05 * kick : 1 + 0.015 * kick;
          const jitter = driving ? (hash(bucket * 3.1 + s.seed) - 0.5) * 6 * kick : 0;
          const ghost = interpolate(t, [a + 0.08, a + 0.12, a + 0.3], [0, 0.45, 0], clamp);
          const trace = interpolate(t, [a + 0.1, a + 0.5], [1, 0], { ...clamp, easing: ease });
          const flare = interpolate(t, [a + 0.08, a + 0.16, a + 0.7], [0, 1, 0], clamp);
          const glyphs = (
            <g transform={`translate(${w.x} ${row.baseline}) scale(${fit})`}>
              {w.glyphs.map((g, j) => (
                <path key={j} d={g.d} transform={at(g)} fill={colors.hero} fillOpacity={stack.echo ? 0.7 : 1} />
              ))}
            </g>
          );
          const pen = (
            <g transform={`translate(${w.x} ${row.baseline}) scale(${fit})`}>
              {w.glyphs.map((g, j) => (
                <path
                  key={j}
                  d={g.d}
                  transform={at(g)}
                  fill="none"
                  stroke={colors.pen}
                  strokeWidth={2 / (fit * g.s)}
                  pathLength={1}
                  strokeDasharray="0.18 0.82"
                  strokeDashoffset={trace}
                  strokeLinecap="round"
                  opacity={trace > 0.01 ? 1 : 0}
                />
              ))}
            </g>
          );
          return (
            <g
              key={w.word.index}
              opacity={p}
              transform={`translate(${cx + slide + jitter} ${row.baseline}) scale(${stretch * settle * punch} ${settle * punch}) translate(${-cx} ${-row.baseline})`}
            >
              {flat ? (
                glyphs
              ) : blur ? (
                <g filter={`url(#${id(`smear-x-${blur}`)})`}>{glyphs}</g>
              ) : (
                <>
                  {ghost > 0.01 ? (
                    <>
                      <g opacity={ghost} transform={`translate(0 ${-heroSize * 0.16})`}>{glyphs}</g>
                      <g opacity={ghost * 0.7} transform={`translate(0 ${heroSize * 0.12})`}>{glyphs}</g>
                    </>
                  ) : null}
                  {flare > 0.01 ? (
                    <g filter={`url(#${id('flare')})`} opacity={flare * 0.9}>
                      {glyphs}
                    </g>
                  ) : null}
                  <g filter={`url(#${id('glow')})`}>
                    {glyphs}
                    {pen}
                  </g>
                </>
              )}
              {!flat && swash && row.hero && !stack.echo ? (
                <Swash
                  from={w.x - swash.reach}
                  to={w.x + w.width + swash.reach}
                  y={row.baseline + props.size.hero * 0.12}
                  progress={interpolate(t, [a + 0.12, a + 0.55], [0, 1], { ...clamp, easing: ease })}
                  color={colors.pen}
                  filter={`url(#${id('glow')})`}
                />
              ) : null}
            </g>
          );
        })}
      </g>
    ));
  };

  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id={id('glow')} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowR * 0.35} result="near" />
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowR} result="far" />
            <feMerge>
              <feMergeNode in="far" />
              <feMergeNode in="near" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={id('flare')} x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowR * 2.4} />
          </filter>
          <filter id={id('shadow')} x="-10%" y="-40%" width="120%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#000" floodOpacity="0.85" />
          </filter>
          {SMEAR_STEPS.map(b => (
            <filter key={`x${b}`} id={id(`smear-x-${b}`)} x="-60%" y="-20%" width="220%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={`${b} 0`} />
            </filter>
          ))}
          {SMEAR_STEPS.map(b => (
            <filter key={`y${b}`} id={id(`smear-y-${b}`)} x="-10%" y="-120%" width="120%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${b}`} />
            </filter>
          ))}
          {glitch ? (
            <>
              <filter id={id('tint-a')} x="-10%" y="-40%" width="120%" height="180%">
                <feFlood floodColor={colA} />
                <feComposite in2="SourceAlpha" operator="in" />
              </filter>
              <filter id={id('tint-b')} x="-10%" y="-40%" width="120%" height="180%">
                <feFlood floodColor={colB} />
                <feComposite in2="SourceAlpha" operator="in" />
              </filter>
            </>
          ) : null}
          {props.titleClip ? (
            <clipPath id={id('title-circle')}>
              <circle cx={bx} cy={by} r={props.titleClip} />
            </clipPath>
          ) : null}
        </defs>
        {visible.map(s => {
          const { show, hide, stack } = s;
          const EXIT = exitOf(s);
          const leave = interpolate(t, [hide, hide + EXIT], [0, 1], clamp);
          // the creep while held: a slow push-in and turn about the box centre
          const held = interpolate(t, [show, hide], [0, 1], clamp);
          const creep = `translate(${bx} ${by}) rotate(${-1.2 + 2.2 * held}) scale(${(1 + 0.045 * held) * (1 + 0.5 * leave)} ${1 + 0.045 * held}) translate(${-bx} ${-by})`;
          const exitBlur = smearStep(24 * leave);
          const g = glitch
            ? Math.min(
                1,
                interpolate(t, [show, show + 0.06, show + 0.3], [0, 1, 0], clamp) +
                  interpolate(t, [hide, hide + 0.05, hide + EXIT], [0, 1, 1], clamp) +
                  hitG +
                  (hash(bucket * 7.3 + s.seed) < pops / 15 ? 0.55 : 0),
              )
            : 0;
          const body =
            g > 0.03 ? (
              <>
                <g transform={`translate(${-split * g} ${split * 0.25 * g})`} opacity={0.7 * g} filter={`url(#${id('tint-a')})`}>
                  {draw(s, true)}
                </g>
                <g transform={`translate(${split * g} 0)`} opacity={0.7 * g} filter={`url(#${id('tint-b')})`}>
                  {draw(s, true)}
                </g>
                {/* horizontal slices of the type jumping sideways */}
                {Array.from({ length: 6 }, (_, k) => {
                  const h = (stack.bottom - stack.top + 80) / 6;
                  const y0 = stack.top - 40 + k * h;
                  const moves = hash(bucket * 13.7 + k * 3.3 + s.seed) > 0.5;
                  const dx = moves ? (hash(bucket * 29.1 + k * 7.7 + s.seed) - 0.5) * 2 * sliceMax * g : 0;
                  const band = id(`band-${s.key}-${k}`);
                  return (
                    <g key={k}>
                      <clipPath id={band}>
                        <rect x={0} y={y0} width={W} height={h + 1} />
                      </clipPath>
                      <g clipPath={`url(#${band})`} transform={`translate(${dx} 0)`}>
                        {draw(s, false)}
                      </g>
                    </g>
                  );
                })}
              </>
            ) : (
              draw(s, false)
            );
          const shot = (
            <g key={s.key} opacity={1 - leave} transform={creep} filter={exitBlur ? `url(#${id(`smear-x-${exitBlur}`)})` : undefined}>
              {body}
            </g>
          );
          return s.key === 'title' && props.titleClip ? (
            <g key={s.key} clipPath={`url(#${id('title-circle')})`}>
              {shot}
            </g>
          ) : (
            shot
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** A calligraphic flourish under the hero: a long thin S-curve with a curl at its tail, written on. */
const Swash: React.FC<{ from: number; to: number; y: number; progress: number; color: string; filter: string }> = ({ from, to, y, progress, color, filter }) => {
  if (progress <= 0) return null;
  const w = to - from;
  const d =
    `M ${from} ${y + 6} ` +
    `C ${from + w * 0.25} ${y - 10}, ${from + w * 0.45} ${y + 18}, ${from + w * 0.7} ${y + 4} ` +
    `S ${to - 14} ${y - 12}, ${to} ${y - 2} ` +
    `c 10 6, 2 22, -12 16`;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
      opacity={0.85}
      filter={filter}
    />
  );
};
