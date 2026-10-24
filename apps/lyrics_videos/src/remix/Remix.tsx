/**
 * The remix renderer (make-video-music-remix skill): plays a project's edl.ts on the song.
 *
 * Place it at 'all'. Every cut is a Sequence: a camera (transition moves, beat bounce or the speaker
 * pump of gfx.pump, shake, push-in, punch-in steps) around the picture in the letterbox window: plate
 * (natural grade, snare exposure hits, zoom/directional motion blur, lens-bulge warp on warp zooms and
 * pumps) → punch words behind the subject → echo trail → subject cutout
 * (aura glow, impact-frame outline) → outline of the words over it → speed streaks, plus the previous
 * cut's subject for carry/pass transitions. Over all cuts: pre-drop tension, front words, timers, the
 * circuit map, the bars (lyric captions, telemetry HUD), film grain, sound effects.
 *
 * Every video is drawn through <Freeze> at an exact source time (resolve.ts sourceTime), which is
 * what lets one cut speed-ramp or hold an impact frame without ever slowing the footage.
 *
 * Media (scripts/remix.ts): one plate per footage source (derived/plate*.mp4, cropped to the picture
 * at the window size), derived/shotmattes/<shot>.webm (VP9 alpha cutout per footage shot),
 * video/anchors.json (the subject's centre/area/box per matte frame), derived/logo.png.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { SceneProps } from '../kit/contract';
import { envelopeAt, hitAt } from '../kit/timing';
import type { Manifest } from '../kit/manifest';
import type { Block, Fx, Gfx, Sfx, TextCue, Transition } from './edl.ts';
import { measure, useFontsReady } from './measure';
import { beatTime, resolveAll, sourceTime, type Footage, type ResolvedCut, type ResolvedPanel, type ResolvedText } from './resolve.ts';
import { StartLights } from './gfx/StartLights';
import { TitleCard } from './gfx/TitleCard';

export type RemixTheme = {
  /** punch: big words; line: captions and lines; data: HUD; title: the title card's title (falls back to punch);
   *  sign: the channel's sign-off ('flank', falls back to line) */
  fonts: { punch: string; line: string; data: string; title?: string; sign?: string };
  colors: { ground: string; bone: string; red: string; cyan: string; acid: string };
  /** resolves when the fonts are loaded (measurement waits for it) */
  ready: Promise<unknown>;
  /** text in the top-left bar */
  hud?: string;
  /** the small readouts in the four corners of the bars (name, lap time, section, gear and speed);
   *  on unless false */
  corners?: boolean;
};

/** per footage shot: per matte frame [cx, cy, area, x0, y0, x1, y1] as fractions of the window */
export type Anchors = Record<string, number[][]>;

export type RemixProps = {
  slug: string;
  blocks: Block[];
  words: TextCue[];
  sfx?: Sfx[];
  gfx?: Gfx;
  footage: Footage;
  anchors: Anchors;
  /** the picture window, centred in the frame: [width, height] */
  window: [number, number];
  theme: RemixTheme;
};

type Ctx = {
  slug: string;
  manifest: Manifest;
  theme: RemixTheme;
  win: { x: number; y: number; w: number; h: number };
  text: ResolvedText[];
  cuts: ResolvedCut[];
  anchors: Anchors;
  footage: Footage;
  gfx: Gfx;
};

const expOut = Easing.out(Easing.exp);
const cubicIn = Easing.in(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const prog = (t: number, a: number, b: number, e = expOut) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
const has = <K extends Fx['k']>(c: ResolvedCut, k: K) => c.fx.find(x => x.k === k) as Extract<Fx, { k: K }> | undefined;
const colorOf = (th: RemixTheme, c?: TextCue['color']) => (c ? th.colors[c] : th.colors.bone);

/** smooth deterministic noise in [-1, 1] (sum of seeded sines), for camera shake */
const wobble = (seed: string, t: number) => {
  let v = 0;
  for (let k = 0; k < 3; k++) v += Math.sin(t * [7.3, 13.1, 23.7][k] + random(`${seed}${k}`) * 6.283) * [0.55, 0.3, 0.15][k];
  return v;
};

/** frames of each transition: the out-shot's exit and the in-shot's entry */
const OUT: Partial<Record<Transition, number>> = { zoom: 6, whip: 4, whipr: 4, whipv: 4, spin: 5 };
const IN: Partial<Record<Transition, number>> = { zoom: 12, whip: 6, whipr: 6, whipv: 6, spin: 8, match: 10, carry: 10, pass: 8, flash: 5, impact: 10 };
/** how far a warp zoom pushes into the subject (scale 1 + ZOOM at the cut) */
const ZOOM = 1.5;

/** the subject of a shot at source time `src`: [cx, cy, area] in window fractions (centre when unknown) */
const anchorOf = (ctx: Ctx, key: string | undefined, source: string, srcFromMatte: number): [number, number, number] => {
  const a = key ? ctx.anchors[key] : undefined;
  if (!a) return [0.5, 0.5, 0];
  const fps = ctx.footage.sources[source]?.matteFps ?? 24;
  const [cx, cy, area] = a[Math.max(0, Math.min(a.length - 1, Math.round(srcFromMatte * fps)))];
  return area > 0.01 ? [cx, cy, area] : [0.5, 0.5, 0];
};
const anchorAt = (ctx: Ctx, cut: ResolvedCut, songT: number) =>
  cut.matte ? anchorOf(ctx, cut.matte.key, cut.source, sourceTime(cut, songT - cut.from) - cut.matte.in) : ([0.5, 0.5, 0] as [number, number, number]);
/** the subject's box [x0, y0, x1, y1] in window fractions at a song time (the middle third when unknown) */
const boxAt = (ctx: Ctx, cut: ResolvedCut, songT: number): [number, number, number, number] => {
  const a = cut.matte ? ctx.anchors[cut.matte.key] : undefined;
  if (!a) return [0.4, 0.2, 0.6, 0.9];
  const fps = ctx.footage.sources[cut.source]?.matteFps ?? 24;
  const r = a[Math.max(0, Math.min(a.length - 1, Math.round((sourceTime(cut, songT - cut.from) - cut.matte!.in) * fps)))];
  return r[2] > 0.005 ? [r[3], r[4], r[5], r[6]] : [0.4, 0.2, 0.6, 0.9];
};

// ------------------------------------------------------------------ media

/**
 * A video frame at an exact time (so speed ramps and holds are just different times): frozen on
 * frame 0 with the time in `startFrom`. Not <Freeze frame={t·fps}>: in a render Remotion clamps the
 * timeline position (freeze frame + the Sequence's start) to the composition's length, which
 * silently showed late source frames from the wrong time.
 */
const Frame: React.FC<{ src: string; t: number; transparent?: boolean; exact?: boolean; style?: React.CSSProperties }> = ({ src, t, transparent, exact, style }) => {
  const { fps } = useVideoConfig();
  // `exact`: the time as it is (slow motion from a high-fps plate needs the frames between ours)
  return (
    <Freeze frame={0}>
      <OffthreadVideo src={src} startFrom={Math.max(0, exact ? t * fps : Math.round(t * fps))} muted transparent={transparent} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
    </Freeze>
  );
};
const plateSrc = (ctx: Ctx, source: string) => staticFile(`${ctx.slug}/${ctx.footage.sources[source].plate}`);
/** slow motion plays from the shot's 60 fps interpolated clip (scripts/remix.ts step 6), at a time
 *  snapped a quarter frame past one of its frames, so no frame shows twice */
const SLOW_FPS = 60;
const slowClip = (ctx: Ctx, cut: ResolvedCut, srcT: number) => {
  const clip = cut.rate < 1 ? ctx.footage.slow?.[cut.src] : undefined;
  if (!clip) return null;
  const t = srcT - ctx.footage.shots[cut.src][0];
  return { src: staticFile(`${ctx.slug}/${clip}`), t: (Math.round(t * SLOW_FPS) + 0.25) / SLOW_FPS };
};
const matteSrc = (ctx: Ctx, key: string) => staticFile(`${ctx.slug}/derived/shotmattes/${key}.webm`);

/** zoom blur: the layer plus copies scaled out from the origin, fading */
const ZoomBlur: React.FC<{ amount: number; ox: number; oy: number; children: React.ReactNode }> = ({ amount, ox, oy, children }) => {
  if (amount < 0.02) return <>{children}</>;
  const n = 6;
  return (
    <>
      {children}
      {Array.from({ length: n }, (_, k) => (
        <AbsoluteFill key={k} style={{ transform: `scale(${1 + (k + 1) * 0.06 * amount})`, transformOrigin: `${ox}px ${oy}px`, opacity: 0.4 * (1 - k / n) * Math.min(1, amount * 1.6) }}>
          {children}
        </AbsoluteFill>
      ))}
    </>
  );
};

/**
 * The lens-bulge map for the warp filters (remix-warp1…6): a displacement image whose red/green
 * channels pull every pixel toward the centre, most at mid-radius, so the middle of the picture
 * swells like a speaker cone. Drawn once on a canvas (the render runs in Chrome).
 */
const bulgeMap = (w: number, h: number): string => {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const f = Math.max(0, 1 - (dx * dx + dy * dy) / 1.4);
      const i = (y * w + x) * 4;
      img.data[i] = 128 - 127 * dx * f;
      img.data[i + 1] = 128 - 127 * dy * f;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
};
// kept under ~360 px: the map is 8-bit, so stronger pulls show steps
const WARP_PX = [0, 50, 110, 170, 230, 290, 360];
const warpLevel = (x: number) => Math.max(0, Math.min(6, Math.round(x * 6)));

// ------------------------------------------------------------------ words

type Fitted = { lines: { text: string; at: number }[][]; size: number };
const fitWords = (rt: ResolvedText, family: string, maxW: number, maxH: number, track: number): Fitted => {
  const lh = 0.9;
  const one = (ws: { text: string; at: number }[]) => ws.map(x => x.text).join(' ');
  const sizeFor = (lines: { text: string; at: number }[][]) => {
    const widest = Math.max(...lines.map(l => measure(one(l), family, 100, track)));
    return Math.min((maxW / widest) * 100, maxH / (lines.length * lh));
  };
  let best: Fitted = { lines: [rt.words], size: sizeFor([rt.words]) };
  for (let k = 1; k < rt.words.length; k++) {
    const two = [rt.words.slice(0, k), rt.words.slice(k)];
    const s = sizeFor(two);
    if (s > best.size * 1.15) best = { lines: two, size: s };
  }
  return best;
};

/** big punch words: behind the subject (outline = the same words as a stroke over the subject) */
const BigWords: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; front?: boolean; outline?: boolean }> = ({ ctx, rt, song, front, outline }) => {
  const { fonts } = ctx.theme;
  const { w, h } = ctx.win;
  const fit = useMemo(() => fitWords(rt, fonts.punch, w * (front ? 0.72 : 0.88), h * (front ? 0.5 : 0.8), 0.01), [rt, w, h]);
  const color = colorOf(ctx.theme, rt.cue.color);
  return (
    <div
      style={{
        position: 'absolute', left: w / 2, top: h / 2, transform: 'translate(-50%, -50%)', width: w, textAlign: 'center',
        fontFamily: fonts.punch, fontSize: fit.size, lineHeight: 0.9, color: outline ? 'transparent' : color, whiteSpace: 'nowrap',
        WebkitTextStroke: outline ? `${Math.max(2, fit.size * 0.006)}px ${color}` : undefined, opacity: outline ? 0.85 : 1,
        textShadow: front && !outline ? '0 8px 40px rgba(0,0,0,0.5)' : undefined,
      }}
    >
      {fit.lines.map((line, li) => (
        <div key={li}>
          {line.map((wd, wi) => {
            const p = prog(song, wd.at, wd.at + 0.12);
            return (
              <span key={wi} style={{ display: 'inline-block', visibility: song >= wd.at - 1e-3 ? 'visible' : 'hidden', transform: `translateY(${(1 - p) * 0.06}em) scale(${1.14 - 0.14 * p})`, marginRight: wi < line.length - 1 ? '0.2em' : 0 }}>
                {rt.cue.el && rt.words.length === 1 ? <ElementWord ctx={ctx} text={wd.text} el={rt.cue.el} outline={outline} /> : wd.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** a big word with some letters in a periodic-table element box (cue.el): the accent-filled box with a
 *  light inner border, the atomic number top left, the symbol in its own case ("Na"); the outline pass
 *  over the subject draws only the box's border */
const ElementWord: React.FC<{ ctx: Ctx; text: string; el: [number, number, number]; outline?: boolean }> = ({ ctx, text, el: [at, len, n], outline }) => {
  const { colors, fonts } = ctx.theme;
  const sym = text.slice(at, at + len);
  return (
    <>
      {text.slice(0, at)}
      <span
        style={{
          position: 'relative', display: 'inline-block', padding: '0.05em 0.08em 0.02em', margin: '0 0.05em',
          background: outline ? 'transparent' : colors.red, color: outline ? 'transparent' : colors.bone,
          boxShadow: outline ? `inset 0 0 0 0.02em ${colors.bone}` : `inset 0 0 0 0.022em color-mix(in srgb, ${colors.bone} 55%, transparent), 0 0.04em 0.3em rgba(0,0,0,0.45)`,
        }}
      >
        {!outline && (
          <span style={{ position: 'absolute', left: '0.1em', top: '0.08em', fontFamily: fonts.data, fontSize: '0.14em', lineHeight: 1, letterSpacing: 0, color: colors.bone, WebkitTextStroke: 0 }}>{n}</span>
        )}
        {sym.charAt(0) + sym.slice(1).toLowerCase()}
      </span>
      {text.slice(at + len)}
    </>
  );
};

/**
 * 'flank': the first word left of the subject, the rest right of it, drawn behind the subject (its
 * cutout goes over them): small caps in the line font (Michroma here) with very wide letter spacing,
 * the way a channel signs off (rev-002: "tiny, with letter spacing a lot"). Placed from the subject's
 * box when the cue starts, letters closing in from wider spacing as they arrive.
 */
const FlankWords: React.FC<{ ctx: Ctx; rt: ResolvedText; cut: ResolvedCut; song: number }> = ({ ctx, rt, cut, song }) => {
  const { fonts } = ctx.theme;
  const { w, h } = ctx.win;
  const [first, ...rest] = rt.words.map(x => x.text);
  const right = rest.join(' ');
  const track = 1.1;
  const [x0, , x1] = boxAt(ctx, cut, Math.max(rt.from, cut.from));
  const gap = w * 0.035;
  const margin = w * 0.05;
  const size = useMemo(() => {
    const room = (word: string, space: number) => (space / Math.max(1, measure(word, fonts.sign ?? fonts.line, 100, track))) * 100;
    return Math.min(h * 0.045, room(first, x0 * w - gap - margin), room(right, (1 - x1) * w - gap - margin));
  }, [first, right, x0, x1, w, h]);
  const p = prog(song, rt.from, rt.from + 0.7);
  const color = colorOf(ctx.theme, rt.cue.color);
  const style = (align: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: h * 0.5, transform: `translateY(-50%)`, fontFamily: fonts.sign ?? fonts.line, fontSize: size, lineHeight: 1,
    letterSpacing: `${track + (1 - p) * 0.8}em`, color, opacity: p, whiteSpace: 'nowrap', textAlign: align,
    filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined,
  });
  return (
    <>
      <div style={{ ...style('right'), right: w - (x0 * w - gap), marginRight: `-${track}em` }}>{first}</div>
      <div style={{ ...style('left'), left: x1 * w + gap }}>{right}</div>
    </>
  );
};

/** a stopwatch counting down to the cue's end */
const Timer: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const left = Math.max(0, rt.to - song);
  const s = Math.floor(left);
  const ms = Math.floor((left - s) * 1000);
  const p = prog(song, rt.from, rt.from + 0.2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: ctx.win.h * 0.08, textAlign: 'center', opacity: p }}>
      <div style={{ fontFamily: fonts.data, fontSize: 18, letterSpacing: '0.5em', color: colors.red, marginBottom: 6 }}>{rt.cue.text}</div>
      <div style={{ fontFamily: fonts.line, fontSize: 84, letterSpacing: '0.12em', color: colors.bone, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
        00:{String(s).padStart(2, '0')}.{String(ms).padStart(3, '0')}
      </div>
    </div>
  );
};

// a circuit outline (window fractions of a 1×0.62 box), drawn on; a car dot laps it
const CIRCUIT = [[0.08, 0.62], [0.08, 0.3], [0.16, 0.12], [0.34, 0.08], [0.46, 0.2], [0.44, 0.34], [0.56, 0.4], [0.72, 0.18], [0.9, 0.16], [0.94, 0.3], [0.8, 0.44], [0.86, 0.56], [0.7, 0.62], [0.4, 0.58], [0.26, 0.66], [0.08, 0.62]];
const TrackMap: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const W = 330;
  const H = W * 0.7;
  const pts = CIRCUIT.map(([x, y]) => [x * W, y * W] as const);
  const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  const draw = prog(song, rt.from, rt.from + 1.4, inOut);
  let d = (((song - rt.from) / 4.8) % 1) * total;
  let k = 0;
  while (k < segs.length - 1 && d > segs[k]) d -= segs[k++];
  const f = d / segs[k];
  const dot = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
  const fade = prog(song, rt.from, rt.from + 0.2) * (1 - prog(song, rt.to - 0.15, rt.to));
  return (
    <div style={{ position: 'absolute', right: ctx.win.w * 0.05, top: ctx.win.h * 0.1, width: W, opacity: fade }}>
      <div style={{ fontFamily: fonts.data, fontSize: 14, letterSpacing: '0.5em', color: colors.red, marginBottom: 10 }}>{rt.cue.text}</div>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={colors.bone} strokeOpacity={0.9} strokeWidth={3} strokeLinejoin="round" strokeDasharray={total} strokeDashoffset={total * (1 - draw)} />
        {draw > 0.98 && <circle cx={dot[0]} cy={dot[1]} r={7} fill={colors.red} style={{ filter: `drop-shadow(0 0 8px ${colors.red})` }} />}
        <line x1={pts[0][0] - 10} y1={pts[0][1] - 18} x2={pts[0][0] + 10} y2={pts[0][1] - 18} stroke={colors.red} strokeWidth={3} />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ one cut

const Streaks: React.FC<{ ctx: Ctx; cut: ResolvedCut; t: number }> = ({ ctx, cut, t }) => {
  const { w, h } = ctx.win;
  const R = Math.hypot(w, h) / 2;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
      {Array.from({ length: 70 }, (_, k) => {
        const a = random(`sa${cut.id}${k}`) * Math.PI * 2;
        const sp = 0.6 + random(`ss${cut.id}${k}`) * 1.6;
        const r0 = ((random(`sr${cut.id}${k}`) + t * sp) % 1) * 0.9 + 0.12;
        const len = 0.08 + 0.18 * random(`sl${k}`);
        return (
          <line
            key={k}
            x1={w / 2 + Math.cos(a) * r0 * R} y1={h / 2 + Math.sin(a) * r0 * R}
            x2={w / 2 + Math.cos(a) * (r0 + len) * R} y2={h / 2 + Math.sin(a) * (r0 + len) * R}
            stroke="white" strokeOpacity={0.15 + 0.35 * r0} strokeWidth={1 + 2 * r0} strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

/** '@split': panels side by side, one sliding up per equal share of the cut, each on its subject */
const Split: React.FC<{ ctx: Ctx; cut: ResolvedCut; t: number; grade: string }> = ({ ctx, cut, t, grade }) => {
  const panels = cut.panels ?? [];
  const n = panels.length;
  const { w, h } = ctx.win;
  const gap = 8;
  const pw = (w - gap * (n - 1)) / n;
  const len = cut.to - cut.from;
  return (
    <AbsoluteFill style={{ background: ctx.theme.colors.ground }}>
      {panels.map((p: ResolvedPanel, k) => {
        const at = cut.panelAt?.[k] ?? (k / n) * len;
        if (t < at) return null;
        const e = prog(t, at, at + 0.18);
        const [cx] = anchorOf(ctx, p.matte?.key, p.source, t - at);
        return (
          <div key={k} style={{ position: 'absolute', left: k * (pw + gap), top: 0, width: pw, height: h, overflow: 'hidden', transform: `translateY(${(1 - e) * 60}%)`, filter: e < 1 ? `url(#remix-mbv${Math.round((1 - e) * 5)})` : undefined }}>
            <Frame src={plateSrc(ctx, p.source)} t={Math.min(p.srcOut, p.srcIn + (t - at))} style={{ width: w, height: h, left: Math.min(0, Math.max(pw - w, pw / 2 - cx * w)), filter: grade }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ ctx: Ctx; cut: ResolvedCut }> = ({ ctx, cut }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = Math.round(cut.from * fps);
  const dur = Math.max(1, Math.round(cut.to * fps) - f0);
  const t = frame / fps;
  const song = f0 / fps + t;
  const { w, h } = ctx.win;
  const { colors } = ctx.theme;
  const m = ctx.manifest;
  const prev = ctx.cuts[cut.i - 1];

  // ---- camera: transitions, push, bounce, shake
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let rot = 0;
  let ox = w / 2;
  let oy = h / 2;
  let zblur = 0;
  let dblur = 0;
  let warp = 0;
  let daxis: 'h' | 'v' = 'h';
  const outN = OUT[cut.tout] ?? 0;
  const left = dur - 1 - frame;
  if (outN && left < outN) {
    const p = cubicIn(1 - left / outN);
    if (cut.tout === 'zoom') {
      const [ax, ay] = anchorAt(ctx, cut, cut.to);
      ox = ax * w; oy = ay * h; scale *= 1 + ZOOM * p; zblur = p; warp = p;
    } else if (cut.tout === 'whip' || cut.tout === 'whipr') {
      tx += (cut.tout === 'whip' ? -1 : 1) * p * 0.4 * w; dblur = p;
    } else if (cut.tout === 'whipv') {
      ty -= p * 0.4 * h; dblur = p; daxis = 'v';
    } else if (cut.tout === 'spin') {
      rot += 32 * p; scale *= 1 + 0.3 * p; zblur = p * 0.8;
    }
  }
  const inN = IN[cut.tin] ?? 0;
  if (inN && frame < inN) {
    const q = frame / inN;
    const e = expOut(q);
    if (cut.tin === 'zoom') {
      const [ax, ay] = anchorAt(ctx, cut, cut.from);
      ox = ax * w; oy = ay * h; scale *= 1 + ZOOM * (1 - e); zblur = Math.max(zblur, 1 - e); warp = Math.max(warp, 1 - e);
    } else if (cut.tin === 'whip' || cut.tin === 'whipr') {
      tx += (cut.tin === 'whip' ? 1 : -1) * (1 - e) * 0.4 * w; dblur = Math.max(dblur, 1 - e);
    } else if (cut.tin === 'whipv') {
      ty += (1 - e) * 0.4 * h; dblur = Math.max(dblur, 1 - e); daxis = 'v';
    } else if (cut.tin === 'spin') {
      rot -= 32 * (1 - e); scale *= 1 + 0.3 * (1 - e); zblur = Math.max(zblur, 0.8 * (1 - e));
    } else if (cut.tin === 'match' && prev) {
      const [px, py, pa] = anchorAt(ctx, prev, prev.to);
      const [cx, cy, ca] = anchorAt(ctx, cut, cut.from);
      const k = 1 - inOut(q);
      const s0 = pa > 0.01 && ca > 0.01 ? Math.max(0.55, Math.min(1.9, Math.sqrt(pa / ca))) : 1;
      ox = cx * w; oy = cy * h; tx += (px - cx) * w * k; ty += (py - cy) * h * k; scale *= 1 + (s0 - 1) * k;
    } else if (cut.tin === 'impact') {
      scale *= 1 + 0.07 * (1 - e);
    }
  }
  const mono = has(cut, 'mono');
  const push = has(cut, 'push');
  if (push) scale *= 1 + (push.s ?? 0.08) * (frame / dur);
  // punch-in steps on the subject (a stare tightening word by word)
  const st = has(cut, 'steps');
  if (st) {
    const times = st.at.map(b => beatTime(m as never, b)).filter(x => x <= song + 1e-3);
    if (times.length) {
      const e = expOut(clamp01((song - times[times.length - 1]) / 0.14));
      scale *= (1 + (st.s ?? 0.14)) ** (times.length - 1) * (1 + (st.s ?? 0.14) * e);
      zblur = Math.max(zblur, (1 - e) * 0.9);
      warp = Math.max(warp, (1 - e) * 0.5);
    }
    const [ax, ay] = anchorAt(ctx, cut, cut.from);
    ox = ax * w; oy = ay * h;
  }
  // the beat bounce: a small punch on every kick, bigger where the song is loud; inside a pump range
  // the whole picture box punches out like a speaker cone instead (not while a transition plays)
  const energy = clamp01((envelopeAt(m, 'rms', song) - 0.35) / 0.3);
  const kick = hitAt(m, 'kick', song, 14);
  const snare = hitAt(m, 'snare', song, 12);
  const pumpAmt = cut.gfx ? 0 : Math.max(0, ...(ctx.gfx.pump ?? []).map(([a, b, k]) => (song >= beatTime(m as never, a) && song < beatTime(m as never, b) ? k : 0)));
  const moving = (inN && frame < inN && cut.tin !== 'cut' && cut.tin !== 'flash') || (outN > 0 && left < outN);
  let box = 1;
  if (pumpAmt > 0 && !moving) {
    const cone = hitAt(m, 'kick', song, 9);
    box = 1 + pumpAmt * cone;
    scale *= 1 + pumpAmt * 0.5 * cone;
    if (cone > 0.5) zblur = Math.max(zblur, Math.min(0.7, cone * pumpAmt * 10));
    warp = Math.max(warp, cone * pumpAmt * 7);
  } else if (!cut.gfx) scale *= 1 + (0.012 + 0.03 * energy) * kick;
  const shake = has(cut, 'shake');
  const impact = cut.tin === 'impact' && frame < 12 ? (1 - frame / 12) ** 2 * 2.2 : 0;
  const amp = (shake ? (shake.amp ?? 1) * (0.35 + 1.1 * hitAt(m, 'kick', song, 9) + 0.7 * hitAt(m, 'snare', song, 9)) : 0) + impact;
  const sx = wobble(`x${cut.id}`, song) * 24 * amp;
  const sy = wobble(`y${cut.id}`, song) * 16 * amp;
  const sr = wobble(`r${cut.id}`, song) * 0.7 * amp;

  // natural grade, with an exposure lift on the snares where the song is loud
  const lift = 1 + 0.14 * snare * energy;
  const grade = mono ? `grayscale(1) contrast(1.22) brightness(${0.96 * lift})` : `contrast(1.07) saturate(1.06) brightness(${lift})`;
  const blurLevel = Math.round(dblur * 6);
  const wl = warpLevel(warp);
  const camFilter = [blurLevel ? `url(#remix-mb${daxis}${blurLevel})` : '', wl ? `url(#remix-warp${wl})` : ''].filter(Boolean).join(' ') || undefined;

  const srcT = sourceTime(cut, t, fps);
  const matteT = cut.matte ? srcT - cut.matte.in : 0;
  const behind = ctx.text.filter(x => (x.style === 'big' || x.style === 'flank') && x.from < cut.to && x.to > cut.from && song >= x.from - 1e-3 && song < x.to);
  const slowed = cut.rate < 1;
  const echo = has(cut, 'echo');
  const pop = has(cut, 'pop');
  const popP = pop ? prog(t, 0, 0.2) : 0;
  const fz = has(cut, 'freeze');
  const frozen = fz ? frame < (fz.n ?? 3) + 2 : false;
  const aura = has(cut, 'aura');
  const glow = (aura ? 0.35 + 0.65 * kick : 0) + (frozen ? 1 : 0);
  const cutoutFilter = glow > 0.02 ? `${grade} drop-shadow(0 0 ${3 + 3 * glow}px rgba(255,255,255,${0.9 * Math.min(1, glow)})) drop-shadow(0 0 ${14 + 16 * glow}px rgba(255,255,255,${0.55 * Math.min(1, glow)}))` : grade;

  // the previous cut's subject, carried over the new shot or flying past the camera
  let carried: React.ReactNode = null;
  const cn = IN[cut.tin] ?? 0;
  if ((cut.tin === 'carry' || cut.tin === 'pass') && prev?.matte && frame < cn) {
    const fly = cut.tin === 'pass' ? frame / cn : clamp01((frame - 4) / (cn - 4));
    const e = cubicIn(fly);
    const [px, py] = anchorAt(ctx, prev, prev.to);
    const at = sourceTime(prev, prev.to - prev.from, fps) + t * prev.rate - prev.matte.in;
    carried = (
      <AbsoluteFill style={{ transform: `scale(${1 + 2.2 * e})`, transformOrigin: `${px * w}px ${py * h}px`, opacity: 1 - clamp01((fly - 0.55) / 0.45) }}>
        <ZoomBlur amount={e} ox={px * w} oy={py * h}>
          <Frame src={matteSrc(ctx, prev.matte.key)} t={at} transparent style={{ objectFit: 'fill', filter: has(prev, 'mono') ? 'grayscale(1) contrast(1.2)' : 'contrast(1.07) saturate(1.06)' }} />
        </ZoomBlur>
      </AbsoluteFill>
    );
  }

  const rig = cut.src === '@lights' ? (ctx.gfx.lights ?? []).filter(l => beatTime(m as never, l.on[0]) <= cut.to + 0.01).pop() : undefined;
  const picture =
    cut.src === '@lights' && rig ? (
      <StartLights manifest={m} theme={ctx.theme} w={w} h={h} cfg={rig} song={song} />
    ) : cut.src === '@title' && ctx.gfx.title ? (
      <TitleCard slug={ctx.slug} manifest={m} theme={ctx.theme} w={w} h={h} cfg={ctx.gfx.title} song={song} from={cut.from} to={cut.to} />
    ) : cut.src === '@split' ? (
      <Split ctx={ctx} cut={cut} t={t} grade={grade} />
    ) : cut.gfx ? null : (
      <ZoomBlur amount={zblur} ox={ox} oy={oy}>
        <Frame {...(slowClip(ctx, cut, srcT) ?? { src: plateSrc(ctx, cut.source), t: srcT })} exact={slowed} style={{ filter: grade }} />
      </ZoomBlur>
    );
  const cutoutAt = (lag = 0) => (cut.matte ? sourceTime(cut, Math.max(0, t - lag), fps) - cut.matte.in : 0);
  const needCutout = cut.matte && (behind.length > 0 || echo || pop || glow > 0.02);
  const subject = (
    <>
      {behind.map(x => (x.style === 'flank' ? <FlankWords key={x.i} ctx={ctx} rt={x} cut={cut} song={song} /> : <BigWords key={x.i} ctx={ctx} rt={x} song={song} />))}
      {echo && cut.matte && Array.from({ length: echo.n ?? 3 }, (_, k) => k + 1).reverse().map(k => (
        <Frame key={k} src={matteSrc(ctx, cut.matte!.key)} t={cutoutAt(k * (echo.dt ?? 0.06))} transparent style={{ objectFit: 'fill', filter: grade, opacity: 0.5 / k }} />
      ))}
      {needCutout && <Frame src={matteSrc(ctx, cut.matte!.key)} t={matteT} transparent exact={slowed} style={{ objectFit: 'fill', filter: cutoutFilter }} />}
      {cut.matte && behind.filter(x => x.style === 'big').map(x => <BigWords key={`o${x.i}`} ctx={ctx} rt={x} song={song} outline />)}
    </>
  );
  const flash = cut.tin === 'flash' ? interpolate(frame, [0, IN.flash!], [0.85, 0], { extrapolateRight: 'clamp' }) : frozen && frame < 2 ? 0.35 : 0;

  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${sr}deg)` }}>
      <div style={{ position: 'absolute', left: ctx.win.x, top: ctx.win.y, width: w, height: h, overflow: pop ? 'visible' : 'hidden', transform: box !== 1 ? `scale(${box})` : undefined }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale * (frozen ? 1.04 : 1)})`, transformOrigin: `${ox}px ${oy}px`, filter: camFilter }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: pop ? `scale(${1 - 0.26 * popP})` : undefined, outline: pop ? `4px solid ${colors.bone}` : undefined }}>
            {picture}
            {!pop && subject}
            {has(cut, 'streaks') && <Streaks ctx={ctx} cut={cut} t={t} />}
          </div>
          {pop && subject}
        </div>
        {carried}
        {flash > 0 && <AbsoluteFill style={{ background: colors.bone, opacity: flash }} />}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ bars

/** the rev lights in the top bar: 15 slanted blocks, bone for the first 10, red for the last 5 */
const SHIFT_N = 15;
const SHIFT_RED = 10;

/** a lyric line as a caption in the bottom bar: the words arrive as they are sung */
const Caption: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; y: number }> = ({ ctx, rt, song, y }) => {
  const { fonts, colors } = ctx.theme;
  const typed = rt.style === 'sub';
  const text = rt.words.map(x => x.text).join(' ');
  const size = Math.min(26, (1180 / Math.max(1, measure(text, fonts.line, 100, 0.26))) * 100);
  const enter = prog(song, rt.from - 0.05, rt.from + 0.2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, transform: `translateY(calc(-50% + ${(1 - enter) * 8}px))`, textAlign: 'center', whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: fonts.line, fontSize: size, letterSpacing: '0.26em', color: colors.bone }}>
        {rt.words.map((wd, k) => {
          const p = prog(song, wd.at - 0.03, wd.at + 0.1);
          const now = song >= wd.at && (k === rt.words.length - 1 || song < rt.words[k + 1].at);
          return (
            <span key={k} style={{ opacity: typed ? (song >= wd.at ? 1 : 0) : 0.12 + 0.88 * p, color: now && !typed ? colors.bone : undefined, textShadow: now && !typed ? `0 0 14px rgba(242,240,234,0.45)` : undefined }}>
              {wd.text}
              {k < rt.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
        {typed && <span style={{ color: colors.red, opacity: Math.floor(song * 4) % 2 ? 1 : 0 }}> ▌</span>}
      </span>
    </div>
  );
};

const Bars: React.FC<{ ctx: Ctx; song: number }> = ({ ctx, song }) => {
  const { win, theme } = ctx;
  const { fonts, colors } = theme;
  const m = ctx.manifest;
  const bar = (m.beats.downbeats ?? []).filter(d => d <= song).length;
  const section = m.sections.find(s => song >= s.from && song < s.to)?.label ?? '';
  const lap = `${Math.floor(song / 60)}:${(song % 60).toFixed(3).padStart(6, '0')}`;
  const on = prog(song, 0.3, 1.2);
  const top = win.y / 2;
  const bottom = win.y + win.h + (1080 - win.y - win.h) / 2;
  const small: React.CSSProperties = { position: 'absolute', fontFamily: fonts.data, fontSize: 15, letterSpacing: '0.32em', color: colors.bone, opacity: 0.5 * on, transform: 'translateY(-50%)', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  const rpm = clamp01(envelopeAt(m, 'low', song) * 1.15);
  const lit = Math.round(rpm * SHIFT_N);
  const corners = theme.corners !== false;
  const kmh = Math.round(80 + 260 * envelopeAt(m, 'rms', song));
  const gear = Math.min(8, 1 + Math.floor(rpm * 8));
  const active = ctx.text.filter(x => song >= x.from && song < x.to);
  const caption = active.find(x => x.style === 'sub') ?? active.find(x => x.style === 'line');
  const label = active.find(x => x.style === 'label');
  return (
    <>
      {corners && <div style={{ ...small, left: 56, top }}>{theme.hud ?? ''}</div>}
      {label ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: fonts.data, fontSize: 18, letterSpacing: '0.45em', color: colors.red }}>
          {label.cue.text.slice(0, Math.ceil(label.cue.text.length * prog(song, label.from, label.from + 0.3)))}
        </div>
      ) : (
        <div style={{ position: 'absolute', left: '50%', top, transform: 'translate(-50%, -50%)', display: 'flex', gap: 5, opacity: on }}>
          {Array.from({ length: SHIFT_N }, (_, k) => {
            const c = k < SHIFT_RED ? colors.bone : colors.red;
            return <div key={k} style={{ width: 20, height: 9, transform: 'skewX(-28deg)', background: k < lit ? c : 'rgba(255,255,255,0.08)', boxShadow: k < lit ? `0 0 10px ${c}` : undefined }} />;
          })}
        </div>
      )}
      {corners && (
        <>
          <div style={{ ...small, right: 56, top }}>LAP {lap}</div>
          <div style={{ ...small, left: 56, top: bottom }}>{section.replace('-', ' ')} · {String(bar).padStart(2, '0')}/{(m.beats.downbeats ?? []).length}</div>
          <div style={{ ...small, right: 56, top: bottom }}>
            <span style={{ color: colors.red }}>G{gear}</span>&nbsp;&nbsp;{String(kmh).padStart(3, '0')} KM/H
          </div>
        </>
      )}
      {caption && <Caption ctx={ctx} rt={caption} song={song} y={bottom} />}
    </>
  );
};

// ------------------------------------------------------------------ the scene

const BLUR_PX = [0, 6, 14, 26, 40, 56, 76];

export const Remix: React.FC<SceneProps<RemixProps>> = ({ manifest, slug, blocks, words, sfx = [], gfx = {}, footage, anchors, window: [ww, wh], theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ready = useFontsReady(theme.ready);
  const r = useMemo(() => resolveAll(manifest as never, footage, blocks, words, sfx, new Set(Object.keys(anchors))), [manifest, footage, blocks, words, sfx, anchors]);
  const bulge = useMemo(() => bulgeMap(Math.round(ww / 2), Math.round(wh / 2)), [ww, wh]);
  const ctx: Ctx = { slug, manifest, theme, win: { x: (width - ww) / 2, y: (height - wh) / 2, w: ww, h: wh }, text: r.text, cuts: r.cuts, anchors, footage, gfx };
  const song = frame / fps;
  if (!ready) return null;
  const active = r.text.filter(x => song >= x.from - 1e-3 && song < x.to);
  // pre-drop tension: the frame darkens and the bars close in, released on the drop
  const tens = Math.max(0, ...(gfx.tension ?? []).map(([a, b]) => {
    const ta = beatTime(manifest as never, a);
    const tb = beatTime(manifest as never, b);
    return song >= ta && song < tb ? Easing.in(Easing.quad)((song - ta) / (tb - ta)) : 0;
  }));
  return (
    <AbsoluteFill style={{ background: theme.colors.ground }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        {[1, 2, 3, 4, 5, 6].map(k => (
          <React.Fragment key={k}>
            <filter id={`remix-mbh${k}`} x="-10%" y="0%" width="120%" height="100%"><feGaussianBlur stdDeviation={`${BLUR_PX[k]} 0`} /></filter>
            <filter id={`remix-mbv${k}`} x="0%" y="-10%" width="100%" height="120%"><feGaussianBlur stdDeviation={`0 ${BLUR_PX[k]}`} /></filter>
            <filter id={`remix-warp${k}`} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={ww} height={wh} colorInterpolationFilters="sRGB">
              <feImage href={bulge} x={0} y={0} width={ww} height={wh} preserveAspectRatio="none" result="map" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={WARP_PX[k]} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </React.Fragment>
        ))}
        <filter id="remix-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 9} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      {r.cuts.map(c => {
        const from = Math.round(c.from * fps);
        return (
          <Sequence key={c.id} from={from} durationInFrames={Math.max(1, Math.round(c.to * fps) - from)} name={`${c.id} ${c.src}`} layout="none">
            <Shot ctx={ctx} cut={c} />
          </Sequence>
        );
      })}
      <div style={{ position: 'absolute', left: ctx.win.x, top: ctx.win.y, width: ww, height: wh, pointerEvents: 'none' }}>
        <svg width={ww} height={wh} style={{ position: 'absolute', inset: 0, opacity: 0.06, mixBlendMode: 'overlay' }}>
          <rect width="100%" height="100%" filter="url(#remix-grain)" />
        </svg>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) ${58 - 30 * tens}%, rgba(0,0,0,${0.42 + 0.45 * tens}) 100%)` }} />
        {active.filter(x => x.style === 'timer').map(x => <Timer key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'map').map(x => <TrackMap key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'front').map(x => <BigWords key={x.i} ctx={ctx} rt={x} song={song} front />)}
        {tens > 0 && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150 * tens, background: theme.colors.ground }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 * tens, background: theme.colors.ground }} />
          </>
        )}
      </div>
      <Bars ctx={ctx} song={song} />
      {r.sfx.map((s, k) => (
        <Sequence key={k} from={Math.round(s.at * fps)} name={`sfx ${s.file}`} layout="none">
          <Audio src={staticFile(`${slug}/derived/sfx/${s.file}.wav`)} volume={s.gain} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
