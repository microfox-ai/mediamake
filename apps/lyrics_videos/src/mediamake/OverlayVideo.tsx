import React from 'react';
import { AbsoluteFill, Loop, OffthreadVideo, useVideoConfig } from 'remotion';
import { colorTintFilter, filterCss, isImageFilter } from '@microfox/remotion';
import type { SceneProps } from '../kit/contract';
import { asset, useSection } from '../kit/hooks';

export type OverlayVideoProps = {
  /** A manifest asset name ("particles.mp4"), a manifest path or a URL. */
  src: string;
  /** Length of the clip in seconds (ffprobe it): the clip loops after this. */
  clipSeconds: number;
  /** Start this many seconds into the clip (a media item's rangeString start). */
  offset?: number;
  /** Default 'screen', like mediamake's overlay tracks. */
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
};

/**
 * A looping overlay clip over the layers below (particles, dust, light leaks, flashes): a
 * mediamake media-track item with `blendMode`, `loop` and `fitDurationTo: "audio-track"`.
 */
export const OverlayVideo: React.FC<SceneProps<OverlayVideoProps>> = ({
  manifest,
  src,
  clipSeconds,
  offset = 0,
  blendMode = 'screen',
  opacity = 1,
  filter,
  tint,
  fadeIn = 1,
  fadeOut = 0,
  rate = 1,
}) => {
  const { fps } = useVideoConfig();
  const { elapsed, remaining } = useSection();
  const loopFrames = Math.max(1, Math.floor(((clipSeconds - offset) * fps) / rate));
  const edge = Math.min(
    fadeIn > 0 ? Math.min(1, elapsed / fadeIn) : 1,
    fadeOut > 0 ? Math.min(1, remaining / fadeOut) : 1,
  );
  const css = [isImageFilter(filter) ? filterCss(filter) : filter, colorTintFilter(tint)]
    .filter(Boolean)
    .join(' ');

  return (
    <AbsoluteFill style={{ mixBlendMode: blendMode, opacity: opacity * edge }}>
      <Loop durationInFrames={loopFrames}>
        <OffthreadVideo
          src={asset(manifest.assets[src] ?? src)}
          muted
          trimBefore={Math.round(offset * fps)}
          playbackRate={rate}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: css || undefined }}
        />
      </Loop>
    </AbsoluteFill>
  );
};
