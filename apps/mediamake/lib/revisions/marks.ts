import type { Mark, MarkColor, MarkTool, Spot } from './types';

/*
 * Marks drawn on a frame in the Revisions screen: how each tool looks, how
 * marks are drawn onto a canvas (the overlay on the video and the saved still
 * use the same code, so the still shows exactly what was drawn), and how they
 * read in the revision's Markdown. Points are fractions of the frame.
 */

export const MARK_COLORS: Record<
  MarkColor,
  { hex: string; label: string; meaning: string; key: string }
> = {
  red: { hex: '#ff3b30', label: 'Red', meaning: 'fix or remove', key: '1' },
  green: { hex: '#32d74b', label: 'Green', meaning: 'add here', key: '2' },
  yellow: {
    hex: '#ffd60a',
    label: 'Yellow',
    meaning: 'move (an arrow shows where)',
    key: '3',
  },
};

export const MARK_TOOLS: Record<
  MarkTool,
  { label: string; noun: string; key: string }
> = {
  pen: { label: 'Pencil', noun: 'line', key: 'P' },
  brush: { label: 'Brush', noun: 'brush stroke', key: 'B' },
  arrow: { label: 'Arrow', noun: 'arrow', key: 'A' },
  box: { label: 'Box', noun: 'box', key: 'R' },
  circle: { label: 'Circle', noun: 'circle', key: 'E' },
};

/** Line width of each tool, as a fraction of the frame's height. */
const WIDTH: Record<MarkTool, number> = {
  pen: 0.005,
  brush: 0.035,
  arrow: 0.006,
  box: 0.005,
  circle: 0.005,
};

const SPOT_COLOR = '#ffcc00';

export const isMarkTool = (t: unknown): t is MarkTool =>
  typeof t === 'string' && Object.hasOwn(WIDTH, t);
const isMarkColor = (c: unknown): c is MarkColor =>
  typeof c === 'string' && Object.hasOwn(MARK_COLORS, c);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Four decimals: a tenth of a pixel on a 4K frame. */
export const roundFraction = (v: number) =>
  Math.round(clamp01(v) * 10000) / 10000;

/** Freehand tools keep every point; the shapes need only their two ends. */
export const isFreehand = (tool: MarkTool) =>
  tool === 'pen' || tool === 'brush';

/**
 * A mark worth keeping: any stroke (a click is a dot), or a shape that was
 * dragged at least a little. `aspect` is the frame's width over its height.
 */
export function isMeaningfulMark(mark: Mark, aspect: number): boolean {
  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];
  if (!first || !last) return false;
  if (isFreehand(mark.tool)) return true;
  return Math.hypot((last[0] - first[0]) * aspect, last[1] - first[1]) > 0.01;
}

function markPath(mark: Mark, w: number, h: number, lineWidth: number) {
  const pts = mark.points.map(([x, y]) => [x * w, y * h] as const);
  const path = new Path2D();
  const first = pts[0];
  const last = pts[pts.length - 1];
  switch (mark.tool) {
    case 'pen':
    case 'brush':
      path.moveTo(first[0], first[1]);
      // a click leaves a dot
      if (pts.length === 1) path.lineTo(first[0] + 0.01, first[1]);
      for (const [x, y] of pts.slice(1)) path.lineTo(x, y);
      break;
    case 'arrow': {
      path.moveTo(first[0], first[1]);
      path.lineTo(last[0], last[1]);
      const angle = Math.atan2(last[1] - first[1], last[0] - first[0]);
      const head = Math.max(lineWidth * 4, 10);
      for (const side of [-1, 1]) {
        const a = angle + (side * Math.PI) / 7;
        path.moveTo(last[0], last[1]);
        path.lineTo(last[0] - head * Math.cos(a), last[1] - head * Math.sin(a));
      }
      break;
    }
    case 'box':
      path.rect(
        Math.min(first[0], last[0]),
        Math.min(first[1], last[1]),
        Math.abs(last[0] - first[0]),
        Math.abs(last[1] - first[1]),
      );
      break;
    case 'circle':
      path.ellipse(
        (first[0] + last[0]) / 2,
        (first[1] + last[1]) / 2,
        Math.abs(last[0] - first[0]) / 2,
        Math.abs(last[1] - first[1]) / 2,
        0,
        0,
        Math.PI * 2,
      );
      break;
  }
  return path;
}

/** Draws marks onto a canvas where the frame is `w`×`h` pixels from the origin. */
export function drawMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly Mark[],
  w: number,
  h: number,
) {
  for (const mark of marks) {
    if (!isMarkTool(mark.tool) || !mark.points?.length) continue;
    const lineWidth = Math.max(1.5, WIDTH[mark.tool] * h);
    const path = markPath(mark, w, h, lineWidth);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (mark.tool === 'brush') {
      // a highlighter: the picture shows through
      ctx.globalAlpha *= 0.45;
    } else {
      // a dark edge keeps the mark readable on any picture
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = lineWidth + Math.max(2, lineWidth * 0.8);
      ctx.stroke(path);
    }
    ctx.strokeStyle = (
      isMarkColor(mark.color) ? MARK_COLORS[mark.color] : MARK_COLORS.red
    ).hex;
    ctx.lineWidth = lineWidth;
    ctx.stroke(path);
    ctx.restore();
  }
}

/** The spot as a ring with a dot in the middle, sized to the frame. */
export function drawSpot(
  ctx: CanvasRenderingContext2D,
  spot: Spot,
  w: number,
  h: number,
) {
  const x = spot.x * w;
  const y = spot.y * h;
  const r = Math.max(9, h * 0.035);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(4, r * 0.3);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.strokeStyle = SPOT_COLOR;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
  ctx.fillStyle = SPOT_COLOR;
  ctx.fill();
  ctx.restore();
}

/** The frame the video shows, at the video's own size. */
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

/** A copy of the frame with the marks and the spot drawn in: the still Claude reads. */
export function withMarks(
  frame: HTMLCanvasElement,
  marks: readonly Mark[],
  spot: Spot | null | undefined,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(frame, 0, 0);
  drawMarks(ctx, marks, canvas.width, canvas.height);
  if (spot) drawSpot(ctx, spot, canvas.width, canvas.height);
  return canvas;
}

/**
 * The frame around the spot at 2× (half its width and height), with a thin
 * ring on the spot and no other marks, so the detail under them shows.
 */
export function spotCrop(
  frame: HTMLCanvasElement,
  spot: Spot,
): HTMLCanvasElement {
  const iw = frame.width;
  const ih = frame.height;
  const cw = Math.round(iw / 2);
  const ch = Math.round(ih / 2);
  const sx = Math.min(Math.max(spot.x * iw - cw / 2, 0), iw - cw);
  const sy = Math.min(Math.max(spot.y * ih - ch / 2, 0), ih - ch);
  const canvas = document.createElement('canvas');
  canvas.width = cw * 2;
  canvas.height = ch * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(frame, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
  const x = (spot.x * iw - sx) * 2;
  const y = (spot.y * ih - sy) * 2;
  const r = Math.max(16, canvas.height * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = SPOT_COLOR;
  ctx.stroke();
  return canvas;
}

export const toJpeg = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

const pct = (v: number) => `${Math.round(v * 100)}%`;
const span = (values: number[]) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return pct(lo) === pct(hi) ? pct(lo) : `${pct(lo)}–${pct(hi)}`;
};

/** "red circle over 40–55% across, 20–35% down", for the Markdown. */
export function describeMark(mark: Mark): string {
  const name = `${isMarkColor(mark.color) ? mark.color : 'red'} ${MARK_TOOLS[mark.tool]?.noun ?? mark.tool}`;
  const pts = mark.points;
  if (mark.tool === 'arrow' && pts.length >= 2) {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    return `${name} from ${pct(a[0])} across, ${pct(a[1])} down to ${pct(b[0])} across, ${pct(b[1])} down`;
  }
  return `${name} over ${span(pts.map(p => p[0]))} across, ${span(pts.map(p => p[1]))} down`;
}

export const describeSpot = (spot: Spot) =>
  `${pct(spot.x)} across, ${pct(spot.y)} down`;

/** Marks from a file, minus anything that can't be drawn (Claude and people edit these files). */
export function sanitizeMarks(raw: unknown): Mark[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const marks: Mark[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const { tool, color, points } = m as Record<string, unknown>;
    if (!isMarkTool(tool) || !Array.isArray(points)) continue;
    const pts = points
      .filter(
        (p): p is [number, number] =>
          Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
      )
      .map(([x, y]) => [clamp01(x), clamp01(y)] as [number, number]);
    if (!pts.length) continue;
    marks.push({
      ...(m as object),
      tool,
      color: isMarkColor(color) ? color : 'red',
      points: pts,
    });
  }
  return marks.length ? marks : undefined;
}

export function sanitizeSpot(raw: unknown): Spot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { x, y } = raw as Record<string, unknown>;
  return typeof x === 'number' &&
    typeof y === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y)
    ? { x: clamp01(x), y: clamp01(y) }
    : undefined;
}
