import { Easing, interpolate } from 'remotion';
import { CanvasFrameInfo, CanvasOpTiming } from '../types';

/**
 * Op-local timing: seconds or '%'-of-duration strings, matching the
 * conventions of UniversalEffect so preset authors learn one system.
 */

const toFrames = (
  value: number | string | undefined,
  totalFrames: number,
  fps: number,
  fallback: number
): number => {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value * fps;
  if (value.endsWith('%')) {
    const pct = parseFloat(value);
    return isNaN(pct) ? fallback : (pct / 100) * totalFrames;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed * fps;
};

const easingFn = (type: CanvasOpTiming['easing']) => {
  switch (type) {
    case 'ease-in':
      return Easing.in(Easing.ease);
    case 'ease-out':
      return Easing.out(Easing.ease);
    case 'ease-in-out':
      return Easing.inOut(Easing.ease);
    default:
      return Easing.linear;
  }
};

/** Eased, clamped local progress (0..1) for an op at the current frame. */
export const resolveOpProgress = (
  timing: CanvasOpTiming | undefined,
  frame: CanvasFrameInfo
): number => {
  const total = frame.durationInFrames;
  const start = toFrames(timing?.start, total, frame.fps, 0);
  const duration = Math.max(
    1,
    toFrames(timing?.duration, total, frame.fps, total - start)
  );

  return interpolate(frame.frame - start, [0, duration], [0, 1], {
    easing: easingFn(timing?.easing),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};
