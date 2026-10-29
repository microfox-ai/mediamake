import React, { useId } from 'react';
import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { asset, useBeat, useEnergy, useEnvelope, useHit, useSongTime } from '../kit/hooks';
import { exposureCss, gradeCss, hasPictureFilter, PictureFilter, PictureTexture, type PictureLook } from './PictureLook';

export type CoverBackdropProps = {
  /** A manifest asset name ("cover.png"), a manifest path or a URL. Default: the first picture in input/. */
  image?: string;
  /** Slow loop on the picture, like mediamake's zoom-loop / pan-loop image effects. */
  motion?: 'zoom-loop' | 'pan-loop' | 'still';
  /** Seconds per loop. Default 20. */
  loopSeconds?: number;
  /** The point the zoom and kick grow from (CSS transform-origin), e.g. '73% 72%' to hold a spark in place. Default the centre. */
  origin?: string;
  /** Picture fills the frame (cover), or sits centered over a blurred copy of itself (contain). */
  fit?: 'cover' | 'contain';
  /** 0..1 black over the picture so text reads. Default 0.35. */
  dim?: number;
  /** 0..1, how much the picture kicks on beats. Default 0.4. */
  beatKick?: number;
  /** What the kick follows: every beat of the grid (default), or the song's kick drum (mediamake's ImageBeat on bass). */
  kickOn?: 'beat' | 'kick';
  /** Bottom gradient to black, for a waveform strip: true (0.85 at the edge) or its strength 0..1. Default true. */
  fadeBottom?: boolean | number;
  tint?: string;
  /**
   * Camera shake, like mediamake's imageloop shake effects. 'auto' follows the song: barely
   * moving in quiet parts, stronger as the energy rises. Default off.
   */
  shake?: false | 'auto' | { amplitude: number; frequency: number };
  /** Stylise the picture: a grade, picture filters and living texture (PictureLook.tsx). */
  look?: PictureLook;
};

export type CoverMotion = { scale: number; dx: number; dy: number; ox: number; oy: number };

/**
 * The cover's motion at song time t: `scale(s) translate(dx, dy)` about the origin (ox, oy), in
 * frame px. Effects locked to a point of the picture move with it through `coverPoint`.
 */
export const coverMotion = (
  { motion = 'zoom-loop', loopSeconds = 20, origin, beatKick = 0.4, shake = false }: CoverBackdropProps,
  size: { width: number; height: number },
  t: number,
  pulse: number,
  energy: number,
): CoverMotion => {
  // Eased ping-pong, so the loop never jumps.
  const phase = (t % loopSeconds) / loopSeconds;
  const swing = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const kick = pulse * beatKick * 0.03;
  const shakeAmp = shake === 'auto' ? 0.4 + energy * 2.4 : shake ? shake.amplitude : 0;
  // a fixed rate for 'auto': a rate that follows the energy would make the phase jump
  const shakeFreq = shake === 'auto' ? 1.2 : shake ? shake.frequency : 0;
  const phase2 = t * shakeFreq * Math.PI * 2;
  const sx = shakeAmp ? wobble(phase2, 1) * shakeAmp * 4 : 0;
  const sy = shakeAmp ? wobble(phase2, 7) * shakeAmp * 4 : 0;
  const scale = motion === 'zoom-loop' ? 1.04 + swing * 0.14 + kick : motion === 'pan-loop' ? 1.18 + kick : 1 + kick;
  const pan = motion === 'pan-loop' ? ((swing - 0.5) * 6 * size.height) / 100 : 0;
  const [ox, oy] = (origin ?? '50% 50%').split(/\s+/).map((v, i) => {
    const n = parseFloat(v);
    return v.endsWith('%') ? (n / 100) * (i ? size.height : size.width) : n;
  });
  return { scale, dx: sx, dy: pan + sy, ox, oy };
};

/** The pulse the cover kicks with (`kickOn`): the beat grid's, or the kick drum's. */
export const useCoverPulse = (cover?: CoverBackdropProps): number => {
  const { pulse } = useBeat(7);
  const kick = useHit('kick', 7);
  return cover?.kickOn === 'kick' ? Math.min(1, kick) : pulse;
};

/** Where a point of the unmoved picture (frame px) is on screen under the cover's motion. */
export const coverPoint = (m: CoverMotion, [x, y]: [number, number]): [number, number] => [
  m.ox + m.scale * (x + m.dx - m.ox),
  m.oy + m.scale * (y + m.dy - m.oy),
];

/** Smooth pseudo-random wobble in -1..1 from a few incommensurate sines. */
const wobble = (t: number, seed: number) =>
  (Math.sin(t * 1.0 + seed) + Math.sin(t * 2.31 + seed * 1.7) * 0.6 + Math.sin(t * 4.17 + seed * 2.3) * 0.3) / 1.9;

/** Cover art or key art behind the lyrics: a slow zoom or pan loop that kicks on the beat. */
export const CoverBackdrop: React.FC<SceneProps<CoverBackdropProps>> = props => {
  const { manifest, image, origin, fit = 'cover', dim = 0.35, fadeBottom = true, tint, look } = props;
  const t = useSongTime();
  const energy = useEnergy();
  const { pulse } = useBeat(7);
  const coverPulse = useCoverPulse(props);
  const kickHit = useHit('kick', 10);
  const snareHit = useHit('snare', 12);
  const low = useEnvelope('low');
  const size = useVideoConfig();
  const filterId = `cover-look-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const name = image || Object.keys(manifest.assets).find(k => /\.(jpe?g|png|webp|avif)$/i.test(k));
  if (!name) throw new Error(`CoverBackdrop: no picture in ${manifest.slug}/input/`);
  const src = asset(manifest.assets[name] ?? name);

  const m = coverMotion(props, size, t, coverPulse, energy);
  const filter = [gradeCss(look), exposureCss(look, kickHit, pulse), hasPictureFilter(look) && `url(#${filterId})`]
    .filter(Boolean)
    .join(' ');
  const picture: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    transform: `scale(${m.scale}) translate(${m.dx}px, ${m.dy}px)`,
    transformOrigin: origin,
    filter: filter || undefined,
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
            transformOrigin: undefined,
          }}
        />
      )}
      {look && hasPictureFilter(look) && <PictureFilter id={filterId} look={look} pulse={pulse} kick={kickHit} />}
      <AbsoluteFill>
        <Img src={src} style={picture} />
      </AbsoluteFill>
      {tint && <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: 'color' }} />}
      {look && (
        <PictureTexture
          look={look}
          t={t}
          pulse={pulse}
          low={low}
          snare={snareHit}
          rayAt={look.rays && coverPoint(m, look.rays.at)}
        />
      )}
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, dim - energy * 0.1)})` }} />
      {fadeBottom !== false && fadeBottom !== 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, transparent ${fadeBottom === true ? 55 : 70}%, rgba(0,0,0,${fadeBottom === true ? 0.85 : fadeBottom}) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
