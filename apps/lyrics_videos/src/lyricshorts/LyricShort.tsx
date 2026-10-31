/**
 * The lyric short scene: footage full frame underneath, the current screen's stack drawn twice over it —
 * once as a mask (white letters on black, multiplied over the footage, so the footage plays only inside
 * the letters) and once as flat colour on top (solid rows, and a faint floor so dark footage still reads
 * as letters). A long screen starts reversed — words over the whole footage, black on bright footage and
 * white on dark (luma.json) — and flips to the mask as about half of it is lit (layout `flip`); the same
 * multiply layer draws both. A 'through' exit scales the stack around the centre of a row's thickest
 * stroke until the letter covers the frame and only footage is left; 'into' runs the same backwards.
 * Each cut's crop is framed on its subject (framing.ts, footage/faces.json).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { useSongTime } from '../kit/hooks';
import type { Font } from 'opentype.js';
import { layoutShort, loadFont, type RowLayout, type StackLayout, type TypeStyle } from './layout';
import { entryFx, exitFx, FootageAt, FxLayer, motionOf, surfaceOf, svgMotion, type Fx, type FootageLook } from './Footage';
import { frameCuts, inkOf, type Faces, type Luma } from './framing';
import { solveLockup, type Lockup } from './lockup';
import { OVERLAP, resolveShort, type LyricShortEdl, type ResolvedCap, type ResolvedScreen, type ResolvedStack } from './spec';

export type LyricShortTheme = {
  type: TypeStyle;
  colors: {
    /** behind the letters */
    ground: string;
    /** solid rows */
    solid: string;
    /** rows too small to mask, and the floor */
    ink: string;
  };
  /** how much of `ink` the footage letters always carry, so dark footage still reads as letters (0..1) */
  floor: number;
  /** a word shows at `from` brightness and reaches full after `ramp` seconds */
  appear: { from: number; ramp: number };
  /** the footage's look: CSS filter amounts, an optional soft-light tint */
  grade: { saturate: number; contrast: number; brightness: number; tint?: string; tintAmount?: number };
  /** light leaks over full-frame footage (strongest as a full screen opens) */
  leaks?: { colors: [string, string]; amount: number };
  /** film grain over the footage, 0..1 */
  grain?: number;
  /** a brand's watermark over every frame (npm run lyric-shorts -- <slug> brand <brand>): its logo (a static
   *  path), a small label above it in the brand's label face, in a corner, `width` of the frame wide. An artist
   *  with no logo (npm run lyric-shorts -- <slug> credit <name>) gets its `name` set in capitals in the logo's
   *  place, in `nameFont` (default the shorts' face) */
  watermark?: { brand?: string; logo?: string; name?: string; nameFont?: string; label?: string; labelFont?: string; at?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'; width?: number; color?: string; opacity?: number };
  /** transitions: the flash colour (cuts with `flash: true`), the blade light of a slash and an iris
   *  ring, and how far the picture punches out on every kick (0.03 = 3 %) */
  cuts?: { flash?: string; blade?: string; pulse?: number };
};

export type LyricShortProps = {
  slug: string;
  edl: LyricShortEdl;
  theme: LyricShortTheme;
  window: { from: number; to: number };
  /** made to loop: nothing that drifts with time (the leaks) may jump at the seam */
  loop?: boolean;
  /** the footage's subjects (projects/<slug>/footage/faces.json): cuts without a crop by hand frame on them */
  faces?: Faces;
  /** each clip's brightness (shorts/<id>/luma.json): words over the footage go white on dark shots */
  luma?: Luma;
};

/** seconds the flip from black words to the mask takes */
const FLIP = 0.1;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const gray = (v: number) => {
  const c = Math.round(clamp01(v) * 255);
  return `rgb(${c},${c},${c})`;
};

const Leaks: React.FC<{ amount: number; colors: [string, string]; t: number }> = ({ amount, colors, t }) => {
  if (amount <= 0.002) return null;
  // two soft blooms drifting slowly across the frame, like light spilling onto film
  const ax = 18 + 22 * Math.sin(t * 0.37);
  const ay = 22 + 30 * Math.sin(t * 0.23 + 1.3);
  const bx = 82 + 14 * Math.sin(t * 0.29 + 2.1);
  const by = 70 + 22 * Math.sin(t * 0.41 + 0.4);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: amount,
        background: `radial-gradient(ellipse 70% 45% at ${ax}% ${ay}%, ${colors[0]} 0%, transparent 70%), radial-gradient(ellipse 60% 50% at ${bx}% ${by}%, ${colors[1]} 0%, transparent 72%)`,
      }}
    />
  );
};

const Grain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  if (!amount) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: amount }}>
      <svg width="100%" height="100%">
        <filter id="lyricshort-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lyricshort-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** a lockup over the footage: each word appears as it is sung (the highlight word pops in from a little
 *  larger), white with a soft shadow, a faint dark scrim behind it so it reads on bright shots */
const LockupLayer: React.FC<{ cap: ResolvedCap; lockup?: Lockup; t: number; W: number; H: number; motion?: Fx; origin?: [number, number] }> = ({ cap, lockup, t, W, H, motion, origin }) => {
  if (!lockup) return null;
  const { box, dy } = lockup;
  const top = ((box.top + dy) / H) * 100;
  const bottom = ((box.bottom + dy) / H) * 100;
  const scrim = clamp01((t - cap.start) / 0.2) * clamp01((cap.end - t) / 0.15);
  return (
    <>
      <AbsoluteFill
        style={{
          opacity: scrim,
          background: `linear-gradient(to bottom, transparent ${Math.max(0, top - 14)}%, rgba(0,0,0,0.38) ${(top + bottom) / 2}%, transparent ${Math.min(100, bottom + 14)}%)`,
        }}
      />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={`lockup-shadow-${cap.index}`} x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy={H * 0.003} stdDeviation={H * 0.007} floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>
        <g transform={motion ? svgMotion(motion, origin ?? [W / 2, H / 2]) : undefined}>
          <g transform={`translate(0 ${dy.toFixed(1)})`} filter={`url(#lockup-shadow-${cap.index})`}>
            {lockup.words.map((w, i) => {
              const show = cap.words[w.word].show;
              const u = clamp01((t - show) / (w.big ? 0.22 : 0.14));
              if (u <= 0) return null;
              const pop = w.big ? 1 + 0.14 * (1 - u) ** 3 : 1;
              const cx = (w.box.left + w.box.right) / 2;
              const cy = (w.box.top + w.box.bottom) / 2;
              return (
                <path
                  key={i}
                  d={w.path}
                  fill={w.big ? cap.color ?? '#FFFFFF' : '#FFFFFF'}
                  fillOpacity={(w.big ? 1 : 0.94) * Math.min(1, u * 1.4)}
                  transform={pop !== 1 ? `translate(${cx} ${cy}) scale(${pop.toFixed(4)}) translate(${-cx} ${-cy})` : undefined}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </>
  );
};

/** a line of capitals as outlines, glyph by glyph with `tracking` em letter-spacing: its paths (baseline at 0)
 *  and its width */
const trackedLine = (font: Font, text: string, size: number, tracking: number) => {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let pen = 0;
  const paths: string[] = [];
  glyphs.forEach((g, i) => {
    if (i) pen += font.getKerningValue(glyphs[i - 1], g) * scale;
    paths.push(g.getPath(pen, 0, size).toPathData(2));
    pen += g.advanceWidth! * scale + tracking * size;
  });
  return { paths, width: Math.max(0, pen - tracking * size) };
};

/** the brand's watermark: still over everything (no shake, no transition), a small capital label set from the
 *  brand's label face as outlines, its logo (or the artist's name, `width` wide) under it, flush with the corner */
const Watermark: React.FC<{ mark: NonNullable<LyricShortTheme['watermark']>; font: Font; nameFont: Font; W: number; H: number }> = ({ mark, font, nameFont, W, H }) => {
  const at = mark.at ?? 'top-right';
  const right = at.endsWith('right');
  const top = at.startsWith('top');
  const mx = 0.045 * W;
  const my = 0.035 * H;
  const w = (mark.width ?? 0.2) * W;
  const size = Math.round(0.024 * W);
  const label = trackedLine(font, (mark.label ?? '').toUpperCase(), size, 0.14);
  const capH = size * 0.72;
  // the name in the logo's place: capitals tracked a little, sized so the line runs the mark's width
  const name = mark.name ? trackedLine(nameFont, mark.name.toUpperCase(), 100, 0.08) : null;
  const nameSize = name ? (100 * w) / name.width : 0;
  const nameLine = name && nameSize ? trackedLine(nameFont, mark.name!.toUpperCase(), nameSize, 0.08) : null;
  const nameCap = nameSize * 0.72;
  const shadow = 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))';
  const color = mark.color ?? '#FFFFFF';
  return (
    <AbsoluteFill style={{ opacity: mark.opacity ?? 0.95, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', [right ? 'right' : 'left']: mx, [top ? 'top' : 'bottom']: my, width: w, display: 'flex', flexDirection: top ? 'column' : 'column-reverse', alignItems: right ? 'flex-end' : 'flex-start', gap: Math.round(0.008 * H) }}>
        {label.paths.length ? (
          <svg width={label.width} height={capH + 2} style={{ overflow: 'visible', filter: shadow }}>
            <g transform={`translate(0 ${capH})`}>
              {label.paths.map((d, i) => <path key={i} d={d} fill={color} />)}
            </g>
          </svg>
        ) : null}
        {mark.logo ? <Img src={staticFile(mark.logo)} style={{ width: w, height: 'auto', display: 'block', filter: shadow }} /> : null}
        {nameLine ? (
          <svg width={nameLine.width} height={nameCap + 2} style={{ overflow: 'visible', filter: shadow }}>
            <g transform={`translate(0 ${nameCap})`}>
              {nameLine.paths.map((d, i) => <path key={i} d={d} fill={color} />)}
            </g>
          </svg>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** the stack's transform at song time t: identity at rest, a dive around a row's thickest stroke */
const diveOf = (s: ResolvedStack, lay: StackLayout, t: number, W: number, H: number) => {
  let p = 0;
  let row: RowLayout = lay.rows[lay.throughRow];
  if (s.exit === 'through' && t >= s.diveFrom) p = clamp01((t - s.diveFrom) / Math.max(0.05, s.end - s.diveFrom));
  if (s.enter === 'into' && t < s.pullTo) {
    p = 1 - clamp01((t - s.start) / Math.max(0.05, s.pullTo - s.start));
    row = lay.rows[lay.intoRow];
  }
  if (p <= 0) return { p: 0, transform: undefined };
  const { x, y, r } = row.dive;
  // big enough that a circle inside the letter covers the whole frame
  const sF = (1.2 * Math.hypot(W / 2, H / 2)) / (0.85 * r);
  // the letter covers the frame by 85 % of the way and holds there, so the cut to full frame (or the
  // start of a pull-back) never shows a black edge
  const q = clamp01(p / 0.85);
  const e = q * q; // accelerates into the letter (and, run backwards, decelerates out of it)
  const s1 = Math.exp(Math.log(sF) * e);
  const m = interpolate(q, [0, 1], [0, 1], { easing: (u: number) => u * u * (3 - 2 * u) });
  const cx = x + (W / 2 - x) * m;
  const cy = y + (H / 2 - y) * m;
  return { p, transform: `translate(${cx} ${cy}) scale(${s1}) translate(${-x} ${-y})` };
};

export const LyricShort: React.FC<SceneProps<LyricShortProps>> = ({ manifest, slug, edl, theme, window: win, loop, faces, luma }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  const t = useSongTime();
  const resolved = useMemo(() => resolveShort(manifest, win, edl), [manifest, edl, win.from, win.to]);

  const [handle] = useState(() => delayRender('lyric short: font and layout'));
  const [font, setFont] = useState<Font | null>(null);
  // the small words of a lockup: a lighter weight of the face when the theme has one
  const [smallFont, setSmallFont] = useState<Font | null>(null);
  const [markFont, setMarkFont] = useState<Font | null>(null);
  const [nameFont, setNameFont] = useState<Font | null>(null);
  useEffect(() => {
    const wm = theme.watermark;
    Promise.all([
      loadFont(staticFile(theme.type.font)),
      theme.type.small ? loadFont(staticFile(theme.type.small)) : null,
      wm?.labelFont ? loadFont(staticFile(wm.labelFont)) : null,
      wm?.nameFont ? loadFont(staticFile(wm.nameFont)) : null,
    ])
      .then(([f, s, w, n]) => {
        setFont(f);
        setSmallFont(s ?? f);
        setMarkFont(w ?? s ?? f);
        setNameFont(n ?? f);
        continueRender(handle);
      })
      .catch(err => cancelRender(err));
  }, [handle, theme.type.font, theme.type.small, theme.watermark]);
  const layouts = useMemo(() => {
    if (!font) return null;
    return layoutShort(resolved.screens.filter((s): s is ResolvedStack => s.kind === 'stack'), font, theme.type, W, H);
  }, [font, resolved, theme, W, H]);
  const lockups = useMemo(() => {
    const out = new Map<number, Lockup>();
    if (!font || !smallFont) return out;
    for (const s of resolved.screens) if (s.kind === 'cap') out.set(s.index, solveLockup(s, font, smallFont, theme.type, W, H));
    return out;
  }, [font, smallFont, resolved, theme, W, H]);
  const cuts = useMemo(() => (layouts ? frameCuts(resolved.cuts, resolved.screens, layouts, faces, W, H, loop) : resolved.cuts), [layouts, resolved, faces, W, H, loop]);
  // the colour of each reversed stack's words: black on bright footage, white on dark
  const inks = useMemo(() => {
    const out = new Map<number, 'black' | 'white'>();
    for (const s of resolved.screens) {
      const lay = s.kind === 'stack' ? layouts?.get(s.index) : undefined;
      if (s.kind === 'stack' && lay?.flip !== undefined) out.set(s.index, inkOf(s, lay, lay.flip, cuts, luma, H, theme.type.reverse?.white));
    }
    return out;
  }, [resolved, layouts, cuts, luma, theme, H]);

  const look: FootageLook = { grade: theme.grade, flash: theme.cuts?.flash ?? '#FFFFFF', blade: theme.cuts?.blade ?? '#FF8FB8', pulse: theme.cuts?.pulse ?? 0 };
  const kicks = manifest.onsets?.kick ?? [];
  const whole = useMemo(() => new Set(resolved.whole), [resolved]);
  // by frame, as the footage is placed: a screen starting a fraction of a frame after a frame still owns it
  const songFrame = Math.round(t * fps);
  const screenAt = (f: number) => resolved.screens.find(s => f >= Math.round(s.start * fps) && f < Math.round(s.end * fps)) ?? null;
  // a loop's seam: the leaks (they drift with song time) fade out before the end and in after the start
  const seam = loop ? clamp01(Math.min(t - win.from, win.to - t) / 0.6) : 1;
  const wordLevel = (show: number) => (t + 0.5 / fps < show ? 0 : interpolate(t, [show, show + theme.appear.ramp], [theme.appear.from, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: u => 1 - (1 - u) ** 2 }));

  /** one picture of the short: a screen's words over the footage */
  const composite = (screen: ResolvedScreen | null, footage: React.ReactNode, key: string, motion?: Fx, origin?: [number, number]) => {
    const stack = screen?.kind === 'stack' ? screen : null;
    const layout = stack && layouts ? layouts.get(stack.index)! : null;
    const dive = stack && layout ? diveOf(stack, layout, t, W, H) : { p: 0, transform: undefined };
    const capOn = screen?.kind === 'cap' ? screen : null;
    // a lockup plays over the whole footage, like a full screen
    const fullOn = screen?.kind === 'full' || !!capOn;
    // leaks bloom as full-frame footage opens (also late in a dive), then settle
    const leakAmt = theme.leaks ? theme.leaks.amount * (capOn ? 0.3 : fullOn ? 0.45 + 0.55 * Math.exp(-(t - screen!.start) / 0.9) : dive.p > 0.5 ? (dive.p - 0.5) * 2 : 0) : 0;
    const fadeOut = stack?.exit === 'fade' ? clamp01((stack.end - t) / 0.3) : 1;
    // 0: black words over the whole footage, 1: the mask
    const masked = layout?.flip === undefined ? 1 : clamp01((t - layout.flip) / FLIP);
    const white = stack ? inks.get(stack.index) === 'white' : false;
    const drawStack = (mode: 'mask' | 'solid') =>
      stack && layout ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, ...(mode === 'mask' ? { mixBlendMode: 'multiply' as const } : {}) }}>
          {mode === 'mask' ? <rect width={W} height={H} fill={gray(1 - masked)} /> : null}
          <g transform={motion ? svgMotion(motion, origin ?? [W / 2, H / 2]) : undefined}>
          <g transform={dive.transform}>
            {layout.rows.map((row, k) => {
              // the row a pull-back comes out of is lit from the start and stays lit
              const forced = stack.enter === 'into' && k === layout.intoRow;
              let solid = row.fill === 'solid' ? 1 : theme.floor;
              if (row.fill === 'solid' && row.reveal !== undefined) solid = 1 - clamp01((t - row.reveal) / 0.5) * (1 - theme.floor);
              solid *= 1 - clamp01(dive.p * 3); // the dive lands on footage
              if (!row.solidByHand) solid *= masked; // words over the footage are plain black or white: no ink, no floor
              // a row made solid by hand takes the solid colour; one too small to mask takes the ink
              const color = row.color ?? (row.solidByHand ? theme.colors.solid : theme.colors.ink);
              return (
                <g key={k}>
                  {row.words.map((w, i) => {
                    const level = (forced ? 1 : wordLevel(stack.words[w].show)) * fadeOut;
                    // reversed, a lit word darkens the footage to black (or leaves it whole under white
                    // ink); masked, it opens onto the footage
                    if (mode === 'mask') return <path key={i} d={row.paths[i]} fill={gray((1 - masked) * (white ? 1 : 1 - level) + masked * level)} />;
                    return (
                      <React.Fragment key={i}>
                        <path d={row.paths[i]} fill={color} fillOpacity={level * solid} />
                        {white && masked < 1 && !row.solidByHand ? <path d={row.paths[i]} fill="#FFFFFF" fillOpacity={level * (1 - masked)} /> : null}
                      </React.Fragment>
                    );
                  })}
                </g>
              );
            })}
          </g>
          </g>
        </svg>
      ) : null;
    return (
      <AbsoluteFill key={key} style={{ backgroundColor: theme.colors.ground }}>
        <AbsoluteFill style={{ isolation: 'isolate' }}>
          {footage}
          {theme.grade.tint ? <AbsoluteFill style={{ backgroundColor: theme.grade.tint, mixBlendMode: 'soft-light', opacity: theme.grade.tintAmount ?? 0.2 }} /> : null}
          {theme.leaks ? <Leaks amount={leakAmt * seam} colors={theme.leaks.colors} t={t} /> : null}
          <Grain amount={theme.grain ?? 0} />
          {/* the mask: everything black but the letters; nothing at all over a full screen */}
          {fullOn ? null : stack ? drawStack('mask') : <AbsoluteFill style={{ backgroundColor: '#000', mixBlendMode: 'multiply' }} />}
        </AbsoluteFill>
        {drawStack('solid')}
        {capOn ? <LockupLayer cap={capOn} lockup={lockups.get(capOn.index)} t={t} W={W} H={H} motion={motion} origin={origin} /> : null}
      </AbsoluteFill>
    );
  };
  /** the middle of the words lit at time `at` (a whole composite zooms about them, not the frame's
   *  centre: a top row alone would be pushed out of the frame) */
  const litCentre = (screen: ResolvedScreen | null, at: number): [number, number] | undefined => {
    if (screen?.kind !== 'stack' || !layouts) return undefined;
    const lay = layouts.get(screen.index)!;
    const lit = lay.rows.filter(r => r.words.some(w => screen.words[w].show <= at + 0.5 / fps));
    if (!lit.length) return undefined;
    const top = Math.min(...lit.map(r => r.top));
    const bottom = Math.max(...lit.map(r => r.bottom));
    return [(Math.min(...lit.map(r => r.left)) + Math.max(...lit.map(r => r.right))) / 2, (top + bottom) / 2];
  };
  const footageAt = (only?: number, motion?: Fx, origin?: [number, number]) => (
    <FootageAt slug={slug} cuts={cuts} t={t} look={look} kicks={kicks} whole={whole} only={only} id={only === undefined ? 'f' : 'u'} outer={motion} origin={origin} />
  );
  /** a whole composite through a transition: motion to the footage and the words, surface to a wrapper */
  const moving = (fx: Fx, screen: ResolvedScreen | null, origin: [number, number], key: string) => {
    const motion = motionOf(fx);
    return <FxLayer fx={surfaceOf(fx)} id={key} look={look} copies={false} render={() => composite(screen, footageAt(undefined, motion, origin), key, motion, origin)} />;
  };

  // a cut where the screen changes moves the whole picture: the old words and shot leave by the
  // transition's way out, the new ones arrive by its way in (over the old ones for a slash, iris, dissolve)
  // in frames throughout, as the screens and the footage are placed (a cut a hundredth of a second after
  // a frame must not let the new screen show for that frame before its transition)
  const bw = resolved.whole.find(i => {
    const c = resolved.cuts[i];
    const f0 = Math.round(c.start * fps);
    return songFrame >= f0 - (OVERLAP[c.tr.kind] ? 0 : Math.round(c.tr.out * fps)) && songFrame < f0 + Math.round(c.tr.in * fps);
  });
  let content: React.ReactNode;
  if (bw !== undefined) {
    const c = resolved.cuts[bw];
    const f0 = Math.round(c.start * fps);
    const before = screenAt(f0 - 1);
    const after = screenAt(f0);
    const tau = (songFrame - f0) / fps;
    // a whole composite zooms and spins half as deep: the words near the top would leave the frame
    content =
      songFrame < f0 ? (
        moving(exitFx(c.tr, -tau, W, H, 0.5), before, litCentre(before, t) ?? [W / 2, H / 2], 'whole-out')
      ) : (
        <>
          {OVERLAP[c.tr.kind] ? composite(before, footageAt(bw - 1), 'under') : null}
          {moving(entryFx(c.tr, tau, W, H, 0.5), after, litCentre(after, f0 / fps) ?? [W / 2, H / 2], 'whole-in')}
        </>
      );
  } else content = composite(screenAt(songFrame), footageAt(), 'now');

  // the hits: the whole frame shakes and flashes as a cut with `shake` / `flash` lands
  let sx = 0;
  let sy = 0;
  let sr = 0;
  let flash = 0;
  let flashColor = look.flash;
  for (const c of resolved.cuts) {
    const tau = t - c.start;
    if (tau < -0.5 / fps || tau > 0.45) continue;
    if (c.shake && tau < 0.42) {
      const d = (1 - Math.max(0, tau) / 0.42) ** 2 * c.shake;
      sx += (random(`sx-${c.at}-${songFrame}`) - 0.5) * 2 * 34 * d;
      sy += (random(`sy-${c.at}-${songFrame}`) - 0.5) * 2 * 34 * d;
      sr += (random(`sr-${c.at}-${songFrame}`) - 0.5) * 2 * 1.6 * d;
    }
    if (c.flash && tau < 0.2) {
      flash = Math.max(flash, 0.85 * (1 - Math.max(0, tau) / 0.2) ** 2);
      flashColor = c.flash === 'default' ? look.flash : c.flash;
    }
  }
  // a soft flash as black words flip to the mask
  for (const lay of layouts?.values() ?? []) {
    const tau = lay.flip === undefined ? -1 : t - lay.flip;
    if (tau >= -0.5 / fps && tau < 0.18) flash = Math.max(flash, 0.32 * (1 - Math.max(0, tau) / 0.18) ** 2);
  }

  // nothing until the fonts are in: the crops (and so the clip files) come from the layout
  if (!layouts || !smallFont) return <AbsoluteFill style={{ backgroundColor: theme.colors.ground }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.ground }}>
      <AbsoluteFill style={sx || sy ? { transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) rotate(${sr.toFixed(2)}deg) scale(1.04)` } : undefined}>{content}</AbsoluteFill>
      {flash > 0.01 ? <AbsoluteFill style={{ backgroundColor: flashColor, opacity: flash, mixBlendMode: 'screen' }} /> : null}
      {theme.watermark && markFont && nameFont ? <Watermark mark={theme.watermark} font={markFont} nameFont={nameFont} W={W} H={H} /> : null}
    </AbsoluteFill>
  );
};
