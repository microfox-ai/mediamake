import React, { useId, useMemo } from 'react';
import { AbsoluteFill, Img, Loop, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { colorTintFilter, filterCss, isImageFilter } from '@microfox/remotion';
import type { SceneProps } from '../kit/contract';
import { asset, useSection, useSongTime } from '../kit/hooks';
import { useCoverMotion, type CoverBackdropProps } from './CoverBackdrop';
import { hash } from './PictureLook';
import { hitsOf } from './Subject';

export type OverlayVideoProps = {
  /** A manifest asset name ("particles.mp4"), a manifest path or a URL. */
  src?: string;
  /** Length of the clip in seconds (ffprobe it): the clip loops after this. */
  clipSeconds?: number;
  /**
   * Pictures in turn instead of a clip: manifest asset names, or a folder ("manga/") for every
   * picture in it, `perImage` seconds each from the first `when` window's start, in a fixed shuffled
   * order (`seed`), looping when they run out; each drifts a little while it's up.
   */
  images?: string | string[];
  perImage?: number;
  seed?: number;
  /** Start this many seconds into the clip (a media item's rangeString start). */
  offset?: number;
  /** Default 'screen', like mediamake's overlay tracks ('normal' with a `key`). */
  blendMode?: React.CSSProperties['mixBlendMode'];
  opacity?: number;
  /** A mediamake filter name ('grayscale', 'saturate', 'vintage', …) or a CSS filter. */
  filter?: string;
  /** A media item's colorTint, applied the way the editor does (sepia + hue-rotate). */
  tint?: string;
  /** Seconds of fade at the layer's start and end. Default 1 in, 0 out. */
  fadeIn?: number;
  fadeOut?: number;
  rate?: number;
  /** Place the clip in a box (frame px) instead of over the whole frame. */
  box?: { left: number; top: number; width: number; height: number };
  /** Soft edges, px: the clip fades out towards its box's sides (a clip's black is rarely black). */
  feather?: number;
  /** How the clip fills its box (or the frame). Default 'cover'. */
  fit?: 'cover' | 'contain' | 'fill';
  flip?: 'x' | 'y' | 'xy';
  /** Degrees, about the box's centre. */
  rotate?: number;
  /**
   * Luma key, for clips shot on black (fire, sparks, lightning) over a light picture where `screen`
   * can't show them: alpha = `gain` × (brightness − `floor`), the colour the clip's own × `boost`,
   * or `color` throughout.
   */
  key?: { gain?: number; floor?: number; boost?: number; color?: string };
  /**
   * Play on the hits instead of looping: the clip starts over on each onset of `on` ('kick',
   * 'snare', 'hat', 'beat', 'downbeat') at or above `threshold`, at least `minGap` s apart, and
   * fades out over `hold` seconds (`cut`: stays at full strength for `hold`, then is gone — an
   * impact frame); `times` plays it at those song seconds instead.
   */
  hits?: { on: string; threshold?: number; hold?: number; minGap?: number; cut?: boolean; times?: number[] };
  /**
   * Song seconds the overlay shows in: [from, to] pairs (half-second fades round each edge), or
   * [from, to, fade in, fade out] (fading in after `from`, out before `to`). Default all of it.
   */
  when?: ([number, number] | [number, number, number, number])[];
  /** Move with the picture (zoom loop, kick, jolt): for clips placed on it. */
  follow?: boolean;
  /** Over the subject cut-out rather than behind it. */
  front?: boolean;
  /** The look's cover settings, for `follow` (set by lookLayers). */
  cover?: CoverBackdropProps;
};

const EDGE = 0.5;

const featherMask = (f: number): React.CSSProperties => {
  const ramp = (dir: string) => `linear-gradient(${dir}, transparent 0, #000 ${f}px, #000 calc(100% - ${f}px), transparent 100%)`;
  const mask = `${ramp('to right')}, ${ramp('to bottom')}`;
  return { maskImage: mask, WebkitMaskImage: mask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' };
};

/** 0..1 inside the `when` windows, with soft edges. */
const windowed = (when: OverlayVideoProps['when'], t: number) =>
  !when
    ? 1
    : Math.max(
        0,
        ...when.map(w =>
          w.length === 4
            ? Math.min(1, (t - w[0]) / Math.max(1e-3, w[2]), (w[1] - t) / Math.max(1e-3, w[3]))
            : Math.min(1, (t - w[0]) / EDGE + 1, (w[1] - t) / EDGE + 1),
        ),
      );

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * A looping overlay clip over the layers below (particles, dust, light leaks, flashes): a
 * mediamake media-track item with `blendMode`, `loop` and `fitDurationTo: "audio-track"`. Or placed
 * in a box, luma-keyed onto a light picture, played on the hits, only in some stretches.
 */
export const OverlayVideo: React.FC<SceneProps<OverlayVideoProps>> = ({
  manifest,
  src = '',
  clipSeconds = 1,
  images,
  perImage = 0.12,
  seed = 1,
  offset = 0,
  blendMode,
  opacity = 1,
  filter,
  tint,
  fadeIn = 1,
  fadeOut = 0,
  rate = 1,
  box,
  feather,
  fit = 'cover',
  flip,
  rotate,
  key,
  hits,
  when,
  follow,
  cover = {},
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = useSongTime();
  const { elapsed, remaining } = useSection();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const keyId = `overlay-key-${uid}`;
  const { motion: m, defocus } = useCoverMotion(cover);
  const list = useMemo(() => {
    if (!hits) return [];
    // explicit moments ('times') instead of onsets
    if (hits.times) return [...hits.times].sort((a, b) => a - b);
    const out: number[] = [];
    for (const [ht, s] of hitsOf(manifest, hits.on))
      if (s >= (hits.threshold ?? 0.6) && (!out.length || ht - out[out.length - 1] >= (hits.minGap ?? 0.25))) out.push(ht);
    return out;
  }, [manifest, hits]);
  const pictures = useMemo(() => {
    if (!images) return [];
    const names = Array.isArray(images)
      ? images
      : Object.keys(manifest.assets).filter(k => k.startsWith(images) && IMAGE.test(k)).sort();
    return names
      .map((n, i) => ({ n, r: hash(i * 1.618 + seed * 7.1) }))
      .sort((a, b) => a.r - b.r)
      .map(x => x.n);
  }, [manifest, images, seed]);

  let env = windowed(when, t);
  let hitAge: number | undefined;
  if (hits) {
    let i = list.length - 1;
    while (i >= 0 && list[i] > t) i--;
    hitAge = i >= 0 ? t - list[i] : undefined;
    const hold = hits.hold ?? 0.6;
    if (hitAge === undefined || hitAge > hold) env = 0;
    else if (!hits.cut) env *= Math.min(1, hitAge / 0.03) * Math.pow(1 - hitAge / hold, 1.5);
  }
  const edge = Math.min(
    fadeIn > 0 ? Math.min(1, elapsed / fadeIn) : 1,
    fadeOut > 0 ? Math.min(1, remaining / fadeOut) : 1,
  );
  if (env * edge < 0.002) return null;

  const css = [
    isImageFilter(filter) ? filterCss(filter) : filter,
    colorTintFilter(tint),
    key && `url(#${keyId})`,
  ]
    .filter(Boolean)
    .join(' ');
  const flipCss = flip === 'x' ? 'scaleX(-1)' : flip === 'y' ? 'scaleY(-1)' : flip === 'xy' ? 'scale(-1, -1)' : '';
  // pictures in turn: which one is up, and how far through its turn
  const slide = (() => {
    if (!pictures.length) return null;
    const run = (t - (when?.[0]?.[0] ?? 0)) / perImage;
    const k = Math.floor(run);
    const name = pictures[((k % pictures.length) + pictures.length) % pictures.length];
    const u = run - k;
    const dx = (hash(k * 2.3) - 0.5) * 50 + (hash(k * 4.1) - 0.5) * 30 * u;
    const dy = (hash(k * 3.7) - 0.5) * 30 + (hash(k * 6.7) - 0.5) * 20 * u;
    return (
      <Img
        src={asset(manifest.assets[name] ?? name)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          filter: css || undefined,
          transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(1.08 + 0.05 * u).toFixed(4)})`,
        }}
      />
    );
  })();
  const video = (
    <OffthreadVideo
      src={asset(manifest.assets[src] ?? src)}
      muted
      trimBefore={Math.round(offset * fps)}
      playbackRate={rate}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        filter: css || undefined,
        transform: [flipCss, rotate ? `rotate(${rotate}deg)` : ''].filter(Boolean).join(' ') || undefined,
      }}
    />
  );
  // on the hits the clip starts over at each one; otherwise it loops for the whole layer
  const played = slide ?? (
    hitAge !== undefined ? (
      <Sequence key={Math.round((t - hitAge) * fps)} from={frame - Math.round(hitAge * fps)} layout="none">
        {video}
      </Sequence>
    ) : (
      <Loop durationInFrames={Math.max(1, Math.floor(((clipSeconds - offset) * fps) / rate))} layout="none">
        {video}
      </Loop>
    ));
  const k = key ? { gain: key.gain ?? 2, floor: key.floor ?? 0.06, boost: key.boost ?? 1.2 } : undefined;
  const c = key?.color
    ? key.color
        .replace('#', '')
        .match(/../g)!
        .map(h => parseInt(h, 16) / 255)
    : undefined;

  return (
    <AbsoluteFill
      style={{
        mixBlendMode: blendMode ?? (key ? 'normal' : 'screen'),
        opacity: opacity * edge * env,
        // in the scene, so out of focus with it
        filter: defocus > 0.3 ? `blur(${defocus.toFixed(2)}px)` : undefined,
        transform: follow ? `scale(${m.scale}) translate(${m.dx}px, ${m.dy}px)` : undefined,
        transformOrigin: follow ? `${m.ox}px ${m.oy}px` : undefined,
      }}
    >
      {k && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={keyId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values={[
                  c ? `0 0 0 0 ${c[0]}` : `${k.boost} 0 0 0 0`,
                  c ? `0 0 0 0 ${c[1]}` : `0 ${k.boost} 0 0 0`,
                  c ? `0 0 0 0 ${c[2]}` : `0 0 ${k.boost} 0 0`,
                  `${k.gain / 3} ${k.gain / 3} ${k.gain / 3} 0 ${-k.gain * k.floor}`,
                ].join('  ')}
              />
            </filter>
          </defs>
        </svg>
      )}
      <div
        style={{
          ...(box
            ? { position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height }
            : { position: 'absolute', inset: 0, width, height }),
          ...(feather ? featherMask(feather) : {}),
        }}
      >
        {played}
      </div>
    </AbsoluteFill>
  );
};
