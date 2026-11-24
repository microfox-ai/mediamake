import type { LoopRange } from './types';

/*
 * The playhead's arithmetic, apart from the audio (so it can be tested): where the song is at a
 * time on the audio clock, and what a new selection or Space does to it. Everything that starts
 * audio is kept on whole sample frames, so tracks started at different moments read the same sample.
 */

/** Closer to the end than this counts as at the end (seconds). */
export const AT_END = 0.005;

export interface Transport {
  playing: boolean;
  /** The song's position at `startedAt` while playing, or where it stands while paused (seconds). */
  offset: number;
  /** The audio clock's time `offset` belongs to. */
  startedAt: number;
  /** The range that loops, while looping. */
  loop: LoopRange | null;
}

/** The first whole frame at or after `time`. */
export const frameAfter = (time: number, rate: number) => Math.ceil(time * rate - 1e-9);

/** `seconds` on the nearest whole frame. */
export const snap = (seconds: number, rate: number) => Math.round(seconds * rate) / rate;

/** A position past a loop's end, wrapped back into it. */
export function wrap(pos: number, loop: LoopRange | null): number {
  if (!loop || pos < loop.end) return pos;
  const len = Math.max(loop.end - loop.start, 0.01);
  return loop.start + ((pos - loop.end) % len);
}

/** Seconds into the song at `now` on the audio clock. `duration` 0 means it isn't known yet (nothing loaded). */
export function positionAt(t: Transport, now: number, duration: number): number {
  if (!t.playing) return t.offset;
  const pos = wrap(t.offset + Math.max(0, now - t.startedAt), t.loop);
  return duration > 0 ? Math.min(pos, duration) : pos;
}

/**
 * What a new selection does to the playhead. It never moves, with one exception: a selection
 * shorter than where the playhead is stops there, at its own end.
 */
export function afterSwitch(pos: number, duration: number, loop: LoopRange | null): { at: number; stop: boolean } {
  if (duration <= 0 || loop || pos < duration - AT_END) return { at: pos, stop: false };
  return { at: duration, stop: true };
}

/** Where Play starts from: the beginning when the playhead is at the end, the loop's start when outside the loop. */
export function playFrom(pos: number, duration: number, loop: LoopRange | null): number {
  if (loop) return pos < loop.start || pos >= loop.end ? loop.start : pos;
  return duration > 0 && pos >= duration - AT_END ? 0 : pos;
}

/** A loop range that can play: inside the song, on whole frames, at least 50 ms long; else null. */
export function fitLoop(range: LoopRange | null, duration: number, rate: number): LoopRange | null {
  if (!range) return null;
  const start = snap(Math.max(0, range.start), rate);
  const end = snap(duration > 0 ? Math.min(range.end, duration) : range.end, rate);
  return end - start > 0.05 ? { start, end } : null;
}
