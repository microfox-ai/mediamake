/**
 * One frame in several pictures (the same scene in power stages, aligned to the pixel) shown in turn
 * over the song, glitching between them: on the hits the frame breaks into horizontal bands that
 * show another stage, shoved sideways, its colour channels split, now and then inverted; a burst
 * round each change of stage carries the cut. CoverBackdrop (the pictures, or their clean plates)
 * and Subject (the cutouts) compute the same bands from the same song time, so the subject glitches
 * with the world.
 *
 * Goten Theme, 2026-11-02: "there are multiple variants, use them all, may be like a glitch effect".
 */
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import type { Manifest } from '../kit/manifest';
import { useSongTime } from '../kit/hooks';
import { hash } from './PictureLook';

/** Glitch bursts on the hits (or at given moments), within `when` windows. */
export type StageGlitch = {
  /** 'kick', 'snare', 'hat', 'beat', 'downbeat': a burst on each onset at or above `threshold`. */
  on?: string;
  threshold?: number;
  /** Seconds between bursts at least. Default 0.3. */
  minGap?: number;
  /** Bursts at these song seconds instead (or as well, with `on`). */
  times?: number[];
  when?: [number, number][];
  /** Seconds a burst lasts. Default 0.2. */
  length?: number;
  /** Frames between re-rolls of the bands. Default 2. */
  step?: number;
  /** How many bands, at a burst's strongest. Default [3, 8]. */
  bands?: [number, number];
  /** Band height, px. Default [10, 150]. */
  height?: [number, number];
  /** How far a band shoves sideways at most, px. Default 60. */
  shift?: number;
  /** Colour channels pulled apart in a band, px. Default 10. */
  split?: number;
  /**
   * Which picture shows in the bands: 'next' (the stage still to come: the build to a change),
   * 'others' (any other stage), 'all', or these stages. Default 'others'.
   */
  show?: 'next' | 'others' | 'all' | number[];
  /** Share of the bands showing that other picture (the rest: the current one, shoved). Default 0.6. */
  mix?: number;
  /** Frames at a burst's start where the other picture takes the whole frame. Default 1. */
  flash?: number;
  /** Chance a band comes out inverted. Default 0.08. */
  invert?: number;
  /** Scales the burst (bands, shove, split). Default 1. */
  amount?: number;
};

export type Stages = {
  /** The pictures, in order (manifest asset names, paths or URLs), all the same frame. */
  images: string[];
  /**
   * [song second, picture] from that second on: a hard cut, carried by a gate burst; or
   * [second, picture, seconds] to crossfade into it over that long (no burst).
   */
  plan: ([number, number] | [number, number, number])[];
  glitch?: StageGlitch | StageGlitch[];
  /** The burst round each hard cut: seconds before and after it, and its look. false: none. */
  gate?: false | (Pick<StageGlitch, 'bands' | 'height' | 'shift' | 'split' | 'mix' | 'invert' | 'step'> & { before?: number; after?: number });
  /** Part of each picture flowing like liquid (its painted fire): see StageFlow. */
  flow?: StageFlow;
  /** Part of each picture turning round a point, its colours cycling (a prism's shards): see StageSpin. */
  spin?: StageSpin;
};

/**
 * Part of each picture (through a mask per stage: white, alpha = what turns) slowly turning round
 * `at` (frame px of the unmoved picture), `speed` degrees a second, its hues cycling `hue` degrees a
 * second and punching out `kick` (0.05 = 5 %) on the kicks; `overscan` keeps the turned copy's edges
 * out of frame. Goten Theme, 2026-11-02: "use the last image (the rainbow one) but in a very short
 * period … the background rainbow should be animated with a different fx of sort".
 */
export type StageSpin = {
  masks: (string | null)[];
  at: [number, number];
  /** Default 7. */
  speed?: number;
  /**
   * Swing back and forth instead, at most `sway` degrees, once every `period` s (default 7): a
   * steady turn shows the copy's corners once the angle grows (a hard diagonal edge in the corner).
   */
  sway?: number;
  period?: number;
  /** Default 40. */
  hue?: number;
  /** Default 0.05. */
  kick?: number;
  /** Default 1.3. */
  overscan?: number;
};

/**
 * Part of each picture alive like liquid: through a mask per stage (white, alpha = where it flows),
 * the cover shows a copy of the picture warped by smooth noise that keeps rising (`rise` px a
 * second, flames licking upward) and morphs into a new shape every `morph` s, `amount` px at rest
 * and `kick` px more on the kicks. Goten Theme, 2026-11-02: "make the fire animate by giving it a
 * liquidy morph effect … and also anywhere it exists".
 */
export type StageFlow = {
  /** One per picture, in order: a mask (manifest asset name, path or URL), or null where nothing flows. */
  masks: (string | null)[];
  amount: number;
  kick?: number;
  /** Default 90. */
  rise?: number;
  /** Size of the liquid's waves, px. Default 150. */
  size?: number;
  /** Default 2.5. */
  morph?: number;
};

/** A horizontal stretch of the frame showing picture `i`, shoved `dx` px. */
export type Band = { y0: number; y1: number; i: number; dx: number; split: boolean; invert: boolean };

export type StageState = {
  /** The picture showing; while crossfading, `from` under it and `mix` its opacity. */
  i: number;
  from?: number;
  mix: number;
  /** In a burst: bands covering the whole frame height, top to bottom. */
  bands: Band[] | null;
  /** px the channels split in the bands that split. */
  split: number;
};

type Burst = { t0: number; len: number; rule: StageGlitch; gate?: { at: number; to: number; from: number; before: number } };

const onsets = (m: Manifest, on: string): [number, number][] =>
  on === 'beat' ? m.beats.list.map(b => [b.t, 1]) : on === 'downbeat' ? (m.beats.downbeats ?? []).map(t => [t, 1]) : (m.onsets?.[on] ?? []);

const smooth = (x: number) => {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
};

/** The plan's picture at t (and the crossfade into it). */
export const stageAt = (stages: Stages, t: number): Pick<StageState, 'i' | 'from' | 'mix'> => {
  const plan = stages.plan;
  let k = 0;
  while (k + 1 < plan.length && plan[k + 1][0] <= t) k++;
  const [at, i, fade] = plan[k];
  if (fade && k > 0 && t < at + fade) return { i, from: plan[k - 1][1], mix: smooth((t - at) / fade) };
  return { i, mix: 1 };
};

/** Every burst in the song, sorted by start. */
export const burstsOf = (manifest: Manifest, stages: Stages): Burst[] => {
  const out: Burst[] = [];
  const rules = !stages.glitch ? [] : Array.isArray(stages.glitch) ? stages.glitch : [stages.glitch];
  for (const rule of rules) {
    const len = rule.length ?? 0.2;
    const inside = (t: number) => !rule.when || rule.when.some(([a, b]) => t >= a && t < b);
    const times = [...(rule.times ?? [])];
    if (rule.on) {
      let last = -Infinity;
      for (const [t, s] of onsets(manifest, rule.on))
        if (s >= (rule.threshold ?? 0.6) && t - last >= (rule.minGap ?? 0.3) && inside(t)) {
          times.push(t);
          last = t;
        }
    }
    for (const t of times) out.push({ t0: t, len, rule });
  }
  if (stages.gate !== false) {
    const g = stages.gate ?? {};
    const before = g.before ?? 0.35;
    const after = g.after ?? 0.25;
    stages.plan.forEach(([at, to, fade], k) => {
      if (k === 0 || fade) return;
      out.push({
        t0: at - before,
        len: before + after,
        rule: { bands: [6, 14], height: [8, 190], shift: 120, split: 16, mix: 0.75, invert: 0.12, flash: 0, ...g },
        gate: { at, to, from: stages.plan[k - 1][1], before },
      });
    });
  }
  return out.sort((a, b) => a.t0 - b.t0);
};

/** The stage and, in a burst, its bands at song time t. */
export const stageState = (stages: Stages, bursts: Burst[], t: number, fps: number, height: number): StageState => {
  const base = stageAt(stages, t);
  // the burst in progress: a gate wins over an onset burst it overlaps
  let b: Burst | undefined;
  for (const x of bursts) {
    if (x.t0 > t) break;
    if (t < x.t0 + x.len && (!b || x.gate || !b.gate)) b = x;
  }
  const r = b?.rule;
  if (!b || !r) return { ...base, bands: null, split: 0 };

  const p = (t - b.t0) / b.len;
  // a gate peaks on its cut; an onset burst hits at once and dies away
  const env = (r.amount ?? 1) * (b.gate ? 1 - Math.abs(t - b.gate.at) / (t < b.gate.at ? b.gate.before : b.len - b.gate.before) : Math.pow(1 - p, 0.6));
  const frames = Math.floor((t - b.t0) * fps + 1e-6);
  const step = Math.floor(frames / (r.step ?? 2));
  const seed = b.t0 * 13.71 + step * 3.17;
  const n = stages.images.length;
  const current = base.i;
  // the picture the bands break into
  const nextStage = () => {
    const after = stages.plan.find(([at]) => at > t);
    return after ? after[1] : (stages.plan.slice().reverse().find(([, i]) => i !== current)?.[1] ?? current);
  };
  const pick = (k: number): number => {
    if (b!.gate) return t < b!.gate.at ? b!.gate.to : b!.gate.from;
    const show = r.show ?? 'others';
    if (show === 'next') return nextStage();
    const pool = Array.isArray(show)
      ? show
      : Array.from({ length: n }, (_, i) => i).filter(i => show === 'all' || i !== current);
    return pool.length ? pool[Math.floor(hash(seed + k * 11.3) * pool.length) % pool.length] : current;
  };
  const split = (r.split ?? 10) * Math.max(0.35, env);

  // the first frames: the other picture takes the whole frame
  if (frames < (r.flash ?? 1)) {
    return { ...base, bands: [{ y0: 0, y1: height, i: pick(0), dx: (hash(seed + 0.7) * 2 - 1) * (r.shift ?? 60) * 0.2, split: true, invert: false }], split };
  }

  const [nMin, nMax] = r.bands ?? [3, 8];
  const [hMin, hMax] = r.height ?? [10, 150];
  const shift = (r.shift ?? 60) * env;
  const count = Math.max(1, Math.round((nMin + (nMax - nMin) * hash(seed + 1.1)) * (0.4 + 0.6 * Math.min(1, env))));
  const raw: Band[] = [];
  for (let k = 0; k < count; k++) {
    const h = hMin + (hMax - hMin) * Math.pow(hash(seed + k * 7.31), 2);
    const y0 = hash(seed + k * 5.13) * (height - h);
    const other = hash(seed + k * 9.07) < (r.mix ?? 0.6);
    raw.push({
      y0,
      y1: y0 + h,
      i: other ? pick(k) : current,
      dx: (hash(seed + k * 3.71) * 2 - 1) * shift,
      split: hash(seed + k * 2.29) < 0.65,
      invert: hash(seed + k * 4.93) < (r.invert ?? 0.08),
    });
  }
  // the whole frame twitches a little under the bands
  const jitter = (hash(seed + 0.33) * 2 - 1) * shift * 0.12;
  raw.sort((a, c) => a.y0 - c.y0);
  const bands: Band[] = [];
  let cursor = 0;
  for (const band of raw) {
    const y0 = Math.max(band.y0, cursor);
    if (band.y1 <= y0) continue;
    if (y0 > cursor) bands.push({ y0: cursor, y1: y0, i: current, dx: jitter, split: false, invert: false });
    bands.push({ ...band, y0 });
    cursor = band.y1;
  }
  if (cursor < height) bands.push({ y0: cursor, y1: height, i: current, dx: jitter, split: false, invert: false });
  return { ...base, bands, split };
};

/** The stage state at the current frame (null without stages). */
export const useStageState = (manifest: Manifest, stages?: Stages): StageState | null => {
  const t = useSongTime();
  const { fps, height } = useVideoConfig();
  const bursts = useMemo(() => (stages ? burstsOf(manifest, stages) : []), [manifest, stages]);
  return stages ? stageState(stages, bursts, t, fps, height) : null;
};

/** The SVG filter that pulls a band's red and blue apart by `split` px. */
export const SplitFilter: React.FC<{ id: string; split: number }> = ({ id, split }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={split} result="r2" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={-split} result="b2" />
        <feBlend in="r2" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b2" mode="screen" />
      </filter>
    </defs>
  </svg>
);

/**
 * The stage pictures as `state` says: the current one (over the one it crossfades from), or the
 * burst's bands, each clipped to its stretch, shoved, split, inverted. `render` draws one picture
 * (with the layer's own motion and filters).
 */
export const StageSlices: React.FC<{
  srcs: string[];
  state: StageState;
  height: number;
  splitId: string;
  /** Draws one picture (with its stage, for anything per stage). */
  render: (src: string, stage: number) => React.ReactNode;
}> = ({ srcs, state, height, splitId, render }) => {
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  if (!state.bands)
    return (
      <>
        {state.from !== undefined && state.mix < 1 && <div style={fill}>{render(srcs[state.from], state.from)}</div>}
        <div style={{ ...fill, opacity: state.mix }}>{render(srcs[state.i], state.i)}</div>
      </>
    );
  return (
    <>
      <SplitFilter id={splitId} split={state.split} />
      {state.bands.map((b, k) => (
        <div key={k} style={{ ...fill, clipPath: `inset(${b.y0.toFixed(1)}px 0 ${(height - b.y1).toFixed(1)}px 0)` }}>
          <div
            style={{
              ...fill,
              transform: Math.abs(b.dx) > 0.2 ? `translateX(${b.dx.toFixed(1)}px)` : undefined,
              filter: [b.split && `url(#${splitId})`, b.invert && 'invert(1)'].filter(Boolean).join(' ') || undefined,
            }}
          >
            {render(srcs[b.i], b.i)}
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Smooth noise for the flow as a small PNG (data URL), red and green two octaves each, wrapping top
 * to bottom so two copies stacked scroll without a seam. `cells` grid cells across. Cached per seed.
 */
const flowMaps = new Map<string, string>();
export const flowMap = (seed: number, cells: number): string => {
  const key = `${seed}|${cells}`;
  const hit = flowMaps.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const w = 384;
  const h = 216;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const field = (salt: number, n: number) => {
    const gw = Math.ceil(n) + 2;
    // whole cells down the height, so row gh wraps to row 0
    const gh = Math.max(1, Math.round((n * h) / w));
    const g = Array.from({ length: gw * gh }, (_, i) => hash(seed * 97.3 + salt * 13.1 + i * 0.617));
    const sm = (x: number) => x * x * (3 - 2 * x);
    return (x: number, y: number) => {
      const fx = (x / w) * n;
      const fy = (y / h) * gh;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = sm(fx - ix);
      const ty = sm(fy - iy);
      const at = (a: number, b: number) => g[(b % gh) * gw + Math.min(gw - 1, a)];
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
      const bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
      return top + (bot - top) * ty;
    };
  };
  const r1 = field(1, cells);
  const r2 = field(2, cells * 2);
  const g1 = field(3, cells);
  const g2 = field(4, cells * 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = (r1(x, y) * 0.7 + r2(x, y) * 0.3 - 0.5) * 1.6 + 0.5;
      const gg = (g1(x, y) * 0.7 + g2(x, y) * 0.3 - 0.5) * 1.6 + 0.5;
      img.data[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[i + 1] = Math.round(Math.min(1, Math.max(0, gg)) * 255);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  flowMaps.set(key, url);
  return url;
};

/**
 * The flow's warp as an SVG filter at song time t (`kick` the decaying kick hit, 0..1): two noise
 * fields crossfading as they morph, each two copies stacked and scrolling up.
 */
export const FlowFilter: React.FC<{ id: string; flow: StageFlow; t: number; kick: number; width: number; height: number }> = ({
  id,
  flow,
  t,
  kick,
  width,
  height,
}) => {
  const rx = -width * 0.1;
  const ry = -height * 0.1;
  const rw = width * 1.2;
  const rh = height * 1.2;
  const cells = width / (flow.size ?? 150);
  const phase = t / (flow.morph ?? 2.5);
  const k = Math.floor(phase);
  const f = phase - k;
  const ca = Math.cos((f * Math.PI) / 2);
  const cb = Math.sin((f * Math.PI) / 2);
  const off = (t * (flow.rise ?? 90)) % rh;
  const tile = (seed: number, name: string) => (
    <>
      <feImage href={flowMap(seed, cells)} x={rx} y={ry - off} width={rw} height={rh} preserveAspectRatio="none" result={`${name}1`} />
      <feImage href={flowMap(seed, cells)} x={rx} y={ry - off + rh} width={rw} height={rh} preserveAspectRatio="none" result={`${name}2`} />
      <feMerge result={name}>
        <feMergeNode in={`${name}1`} />
        <feMergeNode in={`${name}2`} />
      </feMerge>
    </>
  );
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={rx} y={ry} width={rw} height={rh} colorInterpolationFilters="sRGB">
          {tile(k + 1, 'a')}
          {tile(k + 2, 'b')}
          {/* power-preserving crossfade, so the warp keeps its strength through the morph */}
          <feComposite in="a" in2="b" operator="arithmetic" k1={0} k2={ca} k3={cb} k4={0.5 * (1 - ca - cb)} result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={(flow.amount + (flow.kick ?? 0) * kick).toFixed(2)} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};
