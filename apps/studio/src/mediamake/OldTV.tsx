/**
 * The whole video on an old CRT television, over every other layer: scanlines, a hum bar rolling up,
 * flicker, the tube's dark corners, VHS tracking noise rolling down now and then, static snow on the
 * hits, and the set blinking out (the picture collapsing to a bright line and a dot, then opening
 * again) at chosen moments, or switching off for good.
 *
 * Goten Theme, 2026-11-02: "add more old tv style visual fx, like blink out".
 */
import React, { useId, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { Manifest } from '../kit/manifest';
import { useSongTime } from '../kit/hooks';
import { hash } from './PictureLook';

/** The set blinking out: closing over `close` s and black for `hold` s before `at`, opening over `open` s from it. */
export type Blink = { at: number; close?: number; hold?: number; open?: number };

export type OldTVProps = {
  /** Dark lines every `gap` px (default 4), `opacity` 0..1. */
  scanlines?: { opacity: number; gap?: number };
  /** Brightness flicker frame to frame, 0..1. */
  flicker?: number;
  /** A soft dark band rolling slowly up the screen (mains hum), its strength 0..1. */
  hum?: number;
  /** The tube's dark corners, 0..1. */
  vignette?: number;
  /**
   * A band of tracking noise rolling down the screen over `duration` s every `every` s (`height`
   * px), inside the `when` windows.
   */
  tracking?: { every: number; duration?: number; height?: number; opacity?: number; when?: [number, number][] };
  /** Static snow over the frame on the hits (as OverlayVideo's `hits`), fading over `hold` s. */
  snow?: { on?: string; threshold?: number; minGap?: number; times?: number[]; hold?: number; opacity?: number; when?: [number, number][] };
  /** The set blinking out and back on. */
  blinks?: Blink[];
  /** Song second the set switches off for good (the picture collapses to a line, a dot, then black). */
  off?: number;
};

const onsets = (m: Manifest, on: string): [number, number][] =>
  on === 'beat' ? m.beats.list.map(b => [b.t, 1]) : on === 'downbeat' ? (m.beats.downbeats ?? []).map(t => [t, 1]) : (m.onsets?.[on] ?? []);

const inside = (when: [number, number][] | undefined, t: number) => !when || when.some(([a, b]) => t >= a && t < b);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/**
 * How open the screen is at t (1 open, 0 shut to a line) and how much of the line is left (1 the full
 * width, 0 a dot, -1 gone): the blinks and the final switch-off.
 */
const tubeAt = (blinks: Blink[], off: number | undefined, t: number) => {
  let open = 1;
  let line = 1;
  let glow = 0;
  const shut = (c: number) => {
    // the picture squeezes to a line, then the line to a dot
    open = Math.min(open, 1 - clamp(c * 1.6));
    line = Math.min(line, c < 0.62 ? 1 : 1 - clamp((c - 0.62) / 0.38));
    glow = Math.max(glow, clamp(c * 1.4));
  };
  for (const b of blinks) {
    const close = b.close ?? 0.12;
    const hold = b.hold ?? 0.06;
    const opn = b.open ?? 0.14;
    const t0 = b.at - hold - close;
    if (t < t0 || t > b.at + opn) continue;
    if (t < b.at - hold) shut((t - t0) / close);
    else if (t < b.at) {
      open = 0;
      line = -1;
    } else {
      // back on: a line flashes across, then the picture opens out of it
      const o = (t - b.at) / opn;
      open = Math.min(open, clamp((o - 0.25) / 0.75) ** 0.6);
      line = Math.min(line, 1);
      glow = Math.max(glow, 1 - o);
    }
  }
  if (off !== undefined && t >= off) {
    const c = (t - off) / 0.35;
    if (c < 1) shut(c);
    else {
      open = 0;
      // the dot lingers a moment, then fades
      line = 0;
      glow = Math.max(0, 1 - (t - off - 0.35) / 0.6);
      if (glow <= 0) line = -1;
    }
  }
  return { open, line, glow };
};

export const OldTV: React.FC<SceneProps<OldTVProps>> = ({ manifest, scanlines, flicker = 0, hum = 0, vignette = 0, tracking, snow, blinks = [], off }) => {
  const t = useSongTime();
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const noiseId = `tv-noise-${uid}`;

  const snowHits = useMemo(() => {
    if (!snow) return [];
    const out = [...(snow.times ?? [])];
    if (snow.on) {
      let last = -Infinity;
      for (const [ht, s] of onsets(manifest, snow.on))
        if (s >= (snow.threshold ?? 0.9) && ht - last >= (snow.minGap ?? 1) && inside(snow.when, ht)) {
          out.push(ht);
          last = ht;
        }
    }
    return out.sort((a, b) => a - b);
  }, [manifest, snow]);

  let snowAmt = 0;
  if (snow) {
    const hold = snow.hold ?? 0.12;
    for (const ht of snowHits) {
      if (ht > t) break;
      if (t - ht < hold) snowAmt = Math.max(snowAmt, (snow.opacity ?? 0.35) * (1 - (t - ht) / hold));
    }
  }

  let band: { y: number; h: number; o: number } | null = null;
  if (tracking && inside(tracking.when, t)) {
    const dur = tracking.duration ?? 1.1;
    const k = (t % tracking.every) / dur;
    const h = tracking.height ?? 70;
    if (k < 1) band = { y: -h + k * (H + h * 2), h, o: (tracking.opacity ?? 0.35) * Math.sin(Math.PI * k) ** 0.4 };
  }

  const { open, line, glow } = tubeAt(blinks, off, t);
  const humY = (1 - ((t / 4.2) % 1)) * (H * 1.4) - H * 0.2;
  const noise = (
    <filter id={noiseId} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={frame % 97} />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="linear" slope={2.6} intercept={-0.8} />
        <feFuncG type="linear" slope={2.6} intercept={-0.8} />
        <feFuncB type="linear" slope={2.6} intercept={-0.8} />
      </feComponentTransfer>
    </filter>
  );
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  const lineH = 3;
  const gap = (H - Math.max(lineH, H * open)) / 2;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>{noise}</defs>
      </svg>
      {snowAmt > 0.003 && (
        <svg width={W} height={H} style={{ ...fill, mixBlendMode: 'screen', opacity: snowAmt }}>
          <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
        </svg>
      )}
      {band && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: band.y, height: band.h, opacity: band.o, mixBlendMode: 'screen' }}>
          <svg width={W} height={band.h} style={{ position: 'absolute', inset: 0 }}>
            <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: band.h * 0.55, height: 2, background: 'rgba(255,255,255,0.8)' }} />
        </div>
      )}
      {hum > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: humY,
            height: H * 0.35,
            background: `linear-gradient(to bottom, transparent, rgba(0,0,0,${hum}) 50%, transparent)`,
          }}
        />
      )}
      {scanlines && (
        <div
          style={{
            ...fill,
            opacity: scanlines.opacity,
            background: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent ${scanlines.gap ?? 4}px)`,
          }}
        />
      )}
      {flicker > 0 && <div style={{ ...fill, background: '#000', opacity: flicker * hash(frame * 0.731 + 0.17) }} />}
      {vignette > 0 && (
        <div
          style={{
            ...fill,
            background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 62%, rgba(0,0,0,${vignette}) 100%)`,
            boxShadow: `inset 0 0 140px rgba(0,0,0,${vignette * 0.8})`,
          }}
        />
      )}
      {/* the tube blinking out: black closing in from top and bottom, a bright line, a dot */}
      {open < 1 && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: gap, background: '#000' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: gap, background: '#000' }} />
          {open <= 0.002 && <div style={{ ...fill, background: '#000' }} />}
        </>
      )}
      {glow > 0.01 && line >= 0 && (
        <div
          style={{
            position: 'absolute',
            top: H / 2 - lineH / 2,
            left: (W * (1 - Math.max(line, 0.004))) / 2,
            width: W * Math.max(line, 0.004),
            height: lineH,
            borderRadius: lineH,
            background: '#fff',
            opacity: glow,
            boxShadow: '0 0 12px 3px rgba(255,255,255,0.9), 0 0 40px 10px rgba(190,215,255,0.55)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
