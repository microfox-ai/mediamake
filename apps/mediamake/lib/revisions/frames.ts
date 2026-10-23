/*
 * Time ↔ frame math. A constant-rate render shows frame k from k/fps up to
 * (k+1)/fps, so seeks land a hair after the frame start to avoid float error
 * showing the previous frame.
 */

const SEEK_EPSILON = 0.001;

export function frameAt(time: number, fps: number): number {
  return Math.max(0, Math.floor(time * fps + 1e-6));
}

/** Seek target that reliably displays `frame`. */
export function timeOfFrame(frame: number, fps: number): number {
  return Math.max(0, frame / fps + SEEK_EPSILON);
}

/** Snaps a time to the start of its frame (plus the seek epsilon). */
export function snapToFrame(time: number, fps: number): number {
  return timeOfFrame(frameAt(time, fps), fps);
}

/**
 * First frame that shows something starting at `time` — a cut at 6.87 s
 * first appears on the frame starting at 6.9 s at 30 fps.
 */
export function timeOfCut(time: number, fps: number): number {
  return timeOfFrame(Math.ceil(time * fps - 1e-6), fps);
}

/** Start of the first frame at or after `time`: where selections snap to. */
export function frameBoundary(time: number, fps: number): number {
  return Math.ceil(time * fps - 1e-6) / fps;
}

/** First and last frame (inclusive) of a range whose ends sit on frame boundaries. */
export function rangeFrames(range: { from: number; to: number }, fps: number): { first: number; last: number } {
  const first = Math.round(range.from * fps);
  return { first, last: Math.max(first, Math.round(range.to * fps) - 1) };
}

export const roundMs = (seconds: number) => Math.round(seconds * 1000) / 1000;

/** "1:02.40" (minutes, seconds, hundredths). */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/** "00:01:02:12" (hours, minutes, seconds, frames). */
export function formatTimecode(seconds: number, fps: number): string {
  const frame = frameAt(seconds, fps);
  const perSecond = Math.max(1, Math.round(fps));
  const ff = frame % perSecond;
  const total = Math.floor(frame / perSecond);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return [hh, mm, ss, ff].map((n) => String(n).padStart(2, '0')).join(':');
}

export function padFrame(frame: number): string {
  return String(frame).padStart(6, '0');
}
