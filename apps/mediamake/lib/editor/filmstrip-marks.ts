/**
 * Filmstrip stills stay about one thumbnail wide. Zooming in makes the clip
 * wider, so more stills fit. Zooming out fits fewer.
 */
export const FILMSTRIP_THUMB_PX = 48;
/** Avoid thousands of cells on an extremely long, zoomed-in clip. */
export const FILMSTRIP_MAX_CELLS = 120;

export type FilmstripMark = {
  /** Seconds into the source file. */
  time: number;
  index: number;
};

export function filmstripMarks(options: {
  durationSec: number;
  pixelsPerSecond: number;
  sourceOffsetSec?: number;
  thumbPx?: number;
  maxCells?: number;
}): { step: number; cellPx: number; marks: FilmstripMark[] } {
  const duration = Math.max(0, options.durationSec);
  const thumbPx = options.thumbPx ?? FILMSTRIP_THUMB_PX;
  const maxCells = options.maxCells ?? FILMSTRIP_MAX_CELLS;
  const clipPx = Math.max(thumbPx, duration * Math.max(options.pixelsPerSecond, 0));
  const ideal = Math.max(1, Math.round(clipPx / thumbPx));
  const count = Math.min(maxCells, ideal);
  const cellPx = clipPx / count;
  const step = duration > 0 ? duration / count : 0;
  const offset = Math.max(0, options.sourceOffsetSec ?? 0);
  const marks: FilmstripMark[] = [];
  for (let index = 0; index < count; index += 1) {
    marks.push({ time: roundTime(offset + index * step), index });
  }
  return { step, cellPx, marks };
}

function roundTime(value: number): number {
  return Math.round(value * 100) / 100;
}
