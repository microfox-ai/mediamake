import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { asset, useBeat, useEnergy, useSongTime } from '../kit/hooks';

export type CoverBackdropProps = {
  /** A manifest asset name ("cover.png"), a manifest path or a URL. Default: the first picture in input/. */
  image?: string;
  /** Slow loop on the picture, like mediamake's zoom-loop / pan-loop image effects. */
  motion?: 'zoom-loop' | 'pan-loop' | 'still';
  /** Seconds per loop. Default 20. */
  loopSeconds?: number;
  /** Picture fills the frame (cover), or sits centered over a blurred copy of itself (contain). */
  fit?: 'cover' | 'contain';
  /** 0..1 black over the picture so text reads. Default 0.35. */
  dim?: number;
  /** 0..1, how much the picture kicks on beats. Default 0.4. */
  beatKick?: number;
  /** Bottom gradient to black, for a waveform strip. Default true. */
  fadeBottom?: boolean;
  tint?: string;
  /**
   * Camera shake, like mediamake's imageloop shake effects. 'auto' follows the song: barely
   * moving in quiet parts, stronger as the energy rises. Default off.
   */
  shake?: false | 'auto' | { amplitude: number; frequency: number };
};

/** Smooth pseudo-random wobble in -1..1 from a few incommensurate sines. */
const wobble = (t: number, seed: number) =>
  (Math.sin(t * 1.0 + seed) + Math.sin(t * 2.31 + seed * 1.7) * 0.6 + Math.sin(t * 4.17 + seed * 2.3) * 0.3) / 1.9;

/** Cover art or key art behind the lyrics: a slow zoom or pan loop that kicks on the beat. */
export const CoverBackdrop: React.FC<SceneProps<CoverBackdropProps>> = ({
  manifest,
  image,
  motion = 'zoom-loop',
  loopSeconds = 20,
  fit = 'cover',
  dim = 0.35,
  beatKick = 0.4,
  fadeBottom = true,
  tint,
  shake = false,
}) => {
  const t = useSongTime();
  const energy = useEnergy();
  const { pulse } = useBeat(7);
  const name = image || Object.keys(manifest.assets).find(k => /\.(jpe?g|png|webp|avif)$/i.test(k));
  if (!name) throw new Error(`CoverBackdrop: no picture in ${manifest.slug}/input/`);
  const src = asset(manifest.assets[name] ?? name);

  // Eased ping-pong, so the loop never jumps.
  const phase = (t % loopSeconds) / loopSeconds;
  const swing = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const kick = pulse * beatKick * 0.03;
  const shakeAmp = shake === 'auto' ? 0.4 + energy * 2.4 : shake ? shake.amplitude : 0;
  // a fixed rate for 'auto': a rate that follows the energy would make the phase jump
  const shakeFreq = shake === 'auto' ? 1.2 : shake ? shake.frequency : 0;
  const phase2 = t * shakeFreq * Math.PI * 2;
  const shakeMove = shakeAmp
    ? ` translate(${wobble(phase2, 1) * shakeAmp * 4}px, ${wobble(phase2, 7) * shakeAmp * 4}px)`
    : '';
  const transform =
    motion === 'zoom-loop'
      ? `scale(${1.04 + swing * 0.14 + kick})`
      : motion === 'pan-loop'
        ? `scale(${1.18 + kick}) translateY(${(swing - 0.5) * 6}%)`
        : `scale(${1 + kick})`;
  const moved = transform + shakeMove;

  const picture: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    transform: moved,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black', overflow: 'hidden' }}>
      {fit === 'contain' && (
        <Img
          src={src}
          style={{
            ...picture,
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.55)',
            transform: `scale(1.2)`,
          }}
        />
      )}
      <AbsoluteFill>
        <Img src={src} style={picture} />
      </AbsoluteFill>
      {tint && <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: 'color' }} />}
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, dim - energy * 0.1)})` }} />
      {fadeBottom && (
        <AbsoluteFill
          style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.85) 100%)' }}
        />
      )}
    </AbsoluteFill>
  );
};
