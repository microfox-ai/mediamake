import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { useHit, useSongTime } from '../kit/hooks';
import { OverlayVideo, type OverlayVideoProps } from './OverlayVideo';

/** OverlayVideo's props but its luma `key` (React keeps a prop named key for itself, so a spread would drop it). */
export type SpinOverlayProps = Omit<OverlayVideoProps, 'key'> & {
  /** Degrees a second it turns. */
  spin: number;
  /** The frame point it turns about (px): place the clip's own centre there with `box`. */
  about: [number, number];
  /** How the turning clip mixes with the layers below. Default 'screen'. */
  blend?: React.CSSProperties['mixBlendMode'];
  /** It swells by `amount` (0.035 = 3.5 %) on each onset of `on` ('beat', 'kick'…), easing back by `decay`. */
  pulse?: { on: string; amount: number; decay?: number };
};

/**
 * An overlay clip (a ring of fire, a halo, a sigil) turning about a point of the frame, swelling on the beat;
 * everything else is OverlayVideo's (box, filter, `when` windows, fades). Built for Hollow Soul (AMZ, 2026-11-09):
 * "use fire-ring in green color and keep rotating in circle … make the circle expand and collapse very slightly
 * with beats". For the turn to read as a spin and not an orbit, `about` must be the ring's own centre on screen:
 * fit the circle in the clip first (its brightest pixels over every frame) and place the box from it. A clip whose
 * first and last frames don't match loops through `mm clip-loop` (a ping-pong up to its first jump).
 */
export const SpinOverlay: React.FC<SceneProps<SpinOverlayProps>> = ({ spin, about, blend = 'screen', pulse, ...rest }) => {
  const t = useSongTime();
  const hit = Math.min(1, useHit(pulse?.on ?? 'beat', pulse?.decay ?? 9));
  const scale = 1 + (pulse ? pulse.amount * hit : 0);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: blend,
        transform: `rotate(${(t * spin) % 360}deg) scale(${scale})`,
        transformOrigin: `${about[0]}px ${about[1]}px`,
      }}
    >
      <OverlayVideo {...rest} blendMode="normal" />
    </AbsoluteFill>
  );
};
