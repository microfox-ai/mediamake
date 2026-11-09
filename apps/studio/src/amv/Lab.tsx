/**
 * The `amv-lab` composition: one GPU device of the AMV engine (aura, liquid morph, liquid paint,
 * portal) on a project's footage, for tests and look boards. Input props:
 *   { slug, device, a: { src, t, rate? }, b?: { … }, matte?: { src, t }, params?: { … }, frames? }
 * where src paths are under projects/<slug>/ and t is the source time at the lab's first frame.
 * Progress (u_p) runs 0 → 1 across the lab's frames.
 */
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { AURA, GLPass, LIQUID, PAINT, PORTAL, type Uniforms } from './gl';
import { Frame, LOOKS } from './look';
import { WordsLayer } from './type';
import type { Words } from './types';

type Clip = { src: string; t: number; rate?: number };

export type AmvLabProps = {
  slug: string | null;
  device: 'aura' | 'liquid' | 'paint' | 'portal' | 'type' | null;
  a: Clip | null;
  b?: Clip | null;
  matte?: Clip | null;
  params?: Uniforms | null;
  frames?: number | null;
  label?: string | null;
  /** device 'type': the words over clip `a` (times in seconds from the lab's first frame) */
  words?: Words[] | null;
  /** 'type': CSS zoom / focus of the clip */
  frame?: { z?: number; x?: number; y?: number } | null;
};

const CAM0 = [0, 0, 1, 1];
const K0 = [1.12, 1.25, 1.0];

export const amvLabMetadata: CalculateMetadataFunction<AmvLabProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.frames ?? 30),
});

export const AmvLab: React.FC<AmvLabProps> = ({ slug, device, a, b, matte, params, label, words, frame: fr }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!slug || !device || !a) throw new Error('amv-lab renders with inputProps { slug, device, a, … }');
  const p = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0.5;
  const at = (c: Clip) => c.t + (frame / fps) * (c.rate ?? 1);
  const file = (c: Clip) => staticFile(`${slug}/${c.src}`);
  const u: Uniforms = { u_t: frame / fps, u_p: p, ...(params ?? {}) };
  let pass: React.ReactNode = null;
  if (device === 'type') {
    const z = fr?.z ?? 1;
    const tx = (0.5 - (fr?.x ?? 0.5)) * 1920 * z;
    const ty = (0.5 - (fr?.y ?? 0.5)) * 1080 * z;
    pass = (
      <>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
          <Frame src={file(a)} t={at(a)} style={{ filter: LOOKS.clean.filter }} />
        </div>
        {(words ?? []).map((w, k) => (
          <WordsLayer key={k} w={w} t={frame / fps} />
        ))}
      </>
    );
  } else if (device === 'aura') {
    pass = (
      <>
        <Frame src={file(a)} t={at(a)} style={{ filter: 'contrast(1.12) saturate(1.25)' }} />
        <GLPass
          frag={AURA}
          inputs={[
            { id: 'pic', src: file(a), t: at(a) },
            { id: 'matte', src: file(matte!), t: at(matte!) },
          ]}
          mips={['matte']}
          uniforms={{ u_c1: [0.75, 0.97, 1.0], u_c2: [0.05, 0.35, 1.0], u_amt: 1.0, u_rise: 0.12, u_sub: 1, u_k: K0, ...u }}
        />
      </>
    );
  } else if (device === 'paint') {
    pass = (
      <GLPass
        frag={PAINT}
        inputs={[{ id: 'pic', src: file(a), t: at(a) }]}
        uniforms={{ u_cov: 0.45, u_tint: [0.1, 0.85, 1.0], u_dir: [-1, 0.2], u_k: K0, ...u }}
      />
    );
  } else {
    pass = (
      <GLPass
        frag={device === 'liquid' ? LIQUID : PORTAL}
        inputs={[
          { id: 'a', src: file(a), t: at(a) },
          { id: 'b', src: file(b!), t: at(b!) },
        ]}
        uniforms={{
          u_camA: CAM0,
          u_camB: CAM0,
          u_rotA: 0,
          u_rotB: 0,
          u_kA: K0,
          u_kB: K0,
          u_tint: [0.3, 0.8, 1.0],
          u_dir: [1, 0],
          u_c: [0.5, 0.5],
          u_r: 0.05 + p * p * 1.2,
          u_zb: 0.35 + 0.65 * p,
          u_ring: [1.0, 0.45, 0.08],
          ...u,
        }}
      />
    );
  }
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {pass}
      {label && (
        <div style={{ position: 'absolute', left: 24, top: 18, font: '600 28px Menlo, monospace', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '4px 12px' }}>
          {label} · p {p.toFixed(2)}
        </div>
      )}
    </AbsoluteFill>
  );
};
