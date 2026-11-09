import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { asset, useSection } from '../kit/hooks';
import { withKnobs } from '../kit/knobs';

export type LogoStingProps = {
  /** The channel's logo animation with alpha (a manifest asset name), drawn full-frame into `box`. */
  src: string;
  /** Where the clip's 1920×1080 frame goes, frame px (keeps its 16:9). */
  box: { left: number; top: number; width: number };
  /** Seconds of fade at the start and the end of the layer. */
  fadeIn?: number;
  fadeOut?: number;
  /**
   * A CSS filter on the clip: 'brightness(0)' prints a white logo as ink on a light ground,
   * 'drop-shadow(0 2px 10px rgba(0,0,0,0.8))' gives it a dark halo over a pale picture (Postcards
   * from Tomorrow, 2026-11-07).
   */
  filter?: string;
  /**
   * The clip's length in seconds: past it, its last frame stays (the logo at rest) for as long as the
   * layer lasts (Postcards from Tomorrow, 2026-11-07: "let the inverted devils logo stay until the title
   * fades and fade along with it"). Without it the layer should end with the clip.
   */
  hold?: number;
};

/**
 * A channel's logo animation (a transparent clip: brands/<brand>/logo/animated/*.webm, VP9 with
 * alpha, copied into the project's input/) over the intro, from the layer's start, fading out at
 * its end — place the layer so it is gone before the first lyric line comes in. 2026-10-30 (Devil in
 * the Details): "add the inverted devils logo animation at intro section, it should end before the
 * captions appear".
 */
export const LogoSting: React.FC<SceneProps<LogoStingProps>> = ({ manifest, src, box, fadeIn = 0.15, fadeOut = 0.4, filter, hold }) => {
  const { elapsed, remaining } = useSection();
  const { fps } = useVideoConfig();
  const opacity = Math.min(fadeIn > 0 ? Math.min(1, elapsed / fadeIn) : 1, fadeOut > 0 ? Math.min(1, remaining / fadeOut) : 1);
  const clip = <OffthreadVideo src={asset(manifest.assets[src] ?? src)} transparent muted style={{ width: '100%', height: '100%', filter }} />;
  // the clip's last frame, held once it has played
  const last = hold !== undefined ? Math.max(0, Math.round(hold * fps) - 2) : -1;
  return (
    <AbsoluteFill style={{ opacity: Math.max(0, opacity) }}>
      <div style={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: (box.width * 9) / 16 }}>
        {last >= 0 && elapsed * fps >= last ? <Freeze frame={last}>{clip}</Freeze> : clip}
      </div>
    </AbsoluteFill>
  );
};

withKnobs(LogoSting, {
  src: { type: 'asset', accept: 'video', label: 'Logo clip' },
  'box.left': { type: 'number', step: 5, unit: 'px', label: 'Left' },
  'box.top': { type: 'number', step: 5, unit: 'px', label: 'Top' },
  'box.width': { type: 'number', min: 100, max: 1920, step: 10, unit: 'px', label: 'Width' },
  fadeIn: { type: 'number', min: 0, max: 2, step: 0.05, unit: 's', label: 'Fade in', default: 0.15 },
  fadeOut: { type: 'number', min: 0, max: 2, step: 0.05, unit: 's', label: 'Fade out', default: 0.4 },
});
