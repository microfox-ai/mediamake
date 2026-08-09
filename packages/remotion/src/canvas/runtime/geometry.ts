import { mulberry32 } from './random';

/** Shared drawing geometry: fit mapping and reveal edge paths. */

export type FitMode = 'cover' | 'contain' | 'fill';

export interface FitRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
}

/** Source/destination rects to draw an image into a box with a fit mode. */
export const computeFitRect = (
  imgWidth: number,
  imgHeight: number,
  boxWidth: number,
  boxHeight: number,
  fit: FitMode = 'cover'
): FitRect => {
  let sx = 0;
  let sy = 0;
  let sWidth = imgWidth;
  let sHeight = imgHeight;
  let dx = 0;
  let dy = 0;
  let dWidth = boxWidth;
  let dHeight = boxHeight;

  const imgAspect = imgWidth / imgHeight;
  const boxAspect = boxWidth / boxHeight;

  if (fit === 'cover') {
    if (imgAspect > boxAspect) {
      sWidth = imgHeight * boxAspect;
      sx = (imgWidth - sWidth) / 2;
    } else {
      sHeight = imgWidth / boxAspect;
      sy = (imgHeight - sHeight) / 2;
    }
  } else if (fit === 'contain') {
    if (imgAspect > boxAspect) {
      dHeight = boxWidth / imgAspect;
      dy = (boxHeight - dHeight) / 2;
    } else {
      dWidth = boxHeight * imgAspect;
      dx = (boxWidth - dWidth) / 2;
    }
  }
  return { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight };
};

export type EdgeStyle = 'straight' | 'organic' | 'burn';

export interface EdgeOptions {
  edgeStyle: EdgeStyle;
  waviness: number;
  frequency: number;
  randomAmplitude: boolean;
  randomWavelength: boolean;
  seed: number;
  frame: number;
}

export interface EdgePoint {
  x: number;
  y: number;
  /** Burn-edge flicker intensity at this point (0 when not burn style). */
  flicker: number;
}

/**
 * Trace a wipe reveal boundary into `path` (rotated coordinate space is the
 * caller's responsibility) and return the edge points so callers can decorate
 * the boundary (glow, embers). Path covers the revealed half-plane.
 */
export const traceWipePath = (
  path: CanvasRenderingContext2D | Path2D,
  edgeX: number,
  diagonal: number,
  opts: EdgeOptions
): EdgePoint[] => {
  const points = 100;
  const random = mulberry32(opts.seed);
  const edgePoints: EdgePoint[] = [];

  if (opts.edgeStyle === 'straight') {
    path.rect(-diagonal / 2, -diagonal / 2, edgeX + diagonal / 2, diagonal);
    return edgePoints;
  }

  const amplitudes: number[] = [];
  const wavelengths: number[] = [];
  const randomValues: number[] = [];
  const phaseOffsets: number[] = [];
  for (let i = 0; i <= points; i++) {
    amplitudes.push(opts.randomAmplitude ? 0.5 + random() : 1);
    wavelengths.push(opts.randomWavelength ? 0.5 + random() * 1.5 : 1);
    randomValues.push(random());
    phaseOffsets.push(random() * Math.PI * 2);
  }

  path.moveTo(edgeX, -diagonal / 2);
  for (let i = 0; i <= points; i++) {
    const p = i / points;
    const y = (p - 0.5) * diagonal;
    let x = edgeX;
    let flicker = 0;
    if (opts.edgeStyle === 'burn') {
      flicker = Math.sin(opts.frame * 0.3 + phaseOffsets[i]);
      x += (randomValues[i] * 2 - 1) * flicker * opts.waviness;
    } else {
      x +=
        Math.sin(
          p * opts.frequency * wavelengths[i] * Math.PI + opts.frame * 0.1
        ) *
        opts.waviness *
        amplitudes[i];
    }
    path.lineTo(x, y);
    edgePoints.push({ x, y, flicker });
  }
  path.lineTo(edgeX, diagonal / 2);
  path.lineTo(-diagonal / 2, diagonal / 2);
  path.lineTo(-diagonal / 2, -diagonal / 2);
  path.closePath();
  return edgePoints;
};

/**
 * Trace a radial reveal boundary centered at (cx, cy) and return edge points
 * for decoration. Path covers the revealed disc.
 */
export const traceRadialPath = (
  path: CanvasRenderingContext2D | Path2D,
  cx: number,
  cy: number,
  baseRadius: number,
  progress: number,
  opts: EdgeOptions
): EdgePoint[] => {
  const points = 120;
  const random = mulberry32(opts.seed);
  const edgePoints: EdgePoint[] = [];

  if (opts.edgeStyle === 'straight') {
    path.arc(cx, cy, Math.max(0, baseRadius), 0, Math.PI * 2);
    return edgePoints;
  }

  const amplitudes: number[] = [];
  const wavelengths: number[] = [];
  const randomValues: number[] = [];
  const phaseOffsets: number[] = [];
  for (let i = 0; i <= points; i++) {
    amplitudes.push(opts.randomAmplitude ? 0.5 + random() : 1);
    wavelengths.push(opts.randomWavelength ? 0.5 + random() * 1.5 : 1);
    randomValues.push(random());
    phaseOffsets.push(random() * Math.PI * 2);
  }

  for (let i = 0; i <= points; i++) {
    const p = i / points;
    const angle = p * Math.PI * 2;
    let radius = baseRadius;
    let flicker = 0;
    if (opts.edgeStyle === 'burn') {
      flicker = Math.sin(opts.frame * 0.3 + phaseOffsets[i]);
      radius += (randomValues[i] * 2 - 1) * flicker * opts.waviness * progress;
    } else {
      radius +=
        Math.sin(
          p * Math.PI * opts.frequency * wavelengths[i] + opts.frame * 0.1
        ) *
        opts.waviness *
        progress *
        amplitudes[i];
    }
    radius = Math.max(0, radius);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
    edgePoints.push({ x, y, flicker });
  }
  path.closePath();
  return edgePoints;
};

/** Draw glow sparks along a reveal edge (burn style decoration). */
export const drawEdgeGlow = (
  g: CanvasRenderingContext2D,
  edgePoints: EdgePoint[],
  color: string,
  intensity: number,
  seed: number,
  frame: number
): void => {
  const random = mulberry32(seed + frame);
  for (let i = 0; i < edgePoints.length; i += 3) {
    const pt = edgePoints[i];
    if (pt.flicker <= 0.2) continue;
    const glowSize = 4 + random() * 6 * pt.flicker * intensity;
    if (!isFinite(pt.x) || !isFinite(pt.y) || glowSize <= 0) continue;

    const gradient = g.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowSize);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.4, color + 'CC');
    gradient.addColorStop(1, color + '00');
    g.fillStyle = gradient;
    g.fillRect(pt.x - glowSize, pt.y - glowSize, glowSize * 2, glowSize * 2);

    if (random() > 0.85) {
      const s = 2 + random() * 3;
      g.fillStyle = '#ffffff';
      g.fillRect(pt.x - s / 2, pt.y - s / 2, s, s);
    }
  }
};
