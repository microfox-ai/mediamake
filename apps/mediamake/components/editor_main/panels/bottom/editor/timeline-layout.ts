/** Shared layout constants for bottom-panel timeline track views. */

export const RULER_HEIGHT = 28;
export const ROW_HEIGHT = 48;
export const LABEL_WIDTH = 160;
export const MIN_SEG_PX = 4;
export const MAX_PPS = 2000;

export const TRACK_COLORS = [
  "border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/35 text-blue-200",
  "border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200",
  "border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200",
  "border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/35 text-amber-200",
  "border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/35 text-rose-200",
  "border-cyan-500/50 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200",
] as const;

export function formatTimeLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  if (sec < 1 && sec > 0) return `${sec.toFixed(1)}s`;
  return `${s}s`;
}
