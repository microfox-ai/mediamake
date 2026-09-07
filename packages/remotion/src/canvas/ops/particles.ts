import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import { computeFitRect } from '../runtime/geometry';

/**
 * particles — a particle system that morphs through a sequence of
 * "formations". A formation is anything with pixels: an image source, a line
 * of text, or a scatter pattern (random field, center burst, edges, offscreen
 * explosion). Particles carry the colors of the formation they are forming.
 *
 * Performance notes (preview runs this 30x/second):
 * - No canvas shadows. Glow is ONE blurred composite pass over a cached
 *   offscreen particle layer, not a per-particle shadowBlur (which renders
 *   a blur per draw call and killed preview playback).
 * - Colors are precomputed as CSS strings per formation in init; per-frame
 *   string building only happens mid-crossfade.
 * - Motion can follow curved "swirl" paths — organic feel at zero extra cost.
 */

const FormationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    source: z.string().describe('Name of an entry in the pipeline sources map'),
    fit: z.enum(['cover', 'contain']).default('contain'),
    scale: z.number().default(1),
  }),
  z.object({
    type: z.literal('text'),
    text: z.string(),
    fontFamily: z.string().default('sans-serif'),
    fontSize: z.number().default(140),
    fontWeight: z.union([z.string(), z.number()]).default('bold'),
    color: z.string().optional().describe('Overrides sampled color'),
  }),
  z.object({
    type: z.literal('scatter'),
    pattern: z
      .enum(['random', 'center', 'edges', 'bottom', 'top', 'explode'])
      .default('random'),
  }),
]);

const ParticlesSchema = z.object({
  formations: z
    .array(FormationSchema)
    .min(1)
    .describe('Sequence of shapes the particles morph through'),
  count: z.number().min(10).max(20000).default(2200),
  size: z.number().default(2.5),
  shape: z.enum(['square', 'circle']).default('square'),
  hold: z
    .number()
    .min(0)
    .max(0.9)
    .default(0.3)
    .describe('Fraction of each morph segment spent resting in formation'),
  stagger: z
    .number()
    .min(0)
    .max(0.9)
    .default(0.25)
    .describe('Per-particle start offset within a segment'),
  swirl: z
    .number()
    .default(0.35)
    .describe('Curved-path strength while morphing (0 = straight lines)'),
  spread: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .describe(
      'Random scatter around each sampled pixel (× grid step). 0 keeps text/logo edges crisp'
    ),
  jitter: z
    .number()
    .default(0)
    .describe(
      'Shimmer amplitude in px — applied only while particles travel, so formations stay readable at rest'
    ),
  color: z.string().optional().describe('Force one color for all particles'),
  opacity: z.number().min(0).max(1).default(1),
  glow: z.number().default(0).describe('Glow blur radius in px; 0 disables'),
  glowOpacity: z.number().min(0).max(1).default(0.85),
  trail: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Motion trail strength'),
});

type ParticlesParams = z.infer<typeof ParticlesSchema>;

interface Formation {
  /** x,y interleaved */
  positions: Float32Array;
  /** Precomputed CSS colors, one per particle; null when formation is colorless. */
  colors: string[] | null;
  /** Raw r,g,b for crossfading; empty when colorless. */
  rgb: Uint8ClampedArray;
}

interface ParticlesState {
  formations: Formation[];
  offsets: Float32Array;
  phases: Float32Array;
  /** Per-particle perpendicular swirl direction (-1 | +1 scaled). */
  swirlDir: Float32Array;
  /** Cached offscreen layer the particles are drawn into each frame. */
  layer: HTMLCanvasElement | null;
}

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Sample `count` opaque pixels from a raster, sorted by angle around the
 * centroid so consecutive formations morph coherently.
 *
 * Legibility rules (text formations live or die by these):
 * - The sampling grid is sized from the *filled* area, not the canvas area.
 *   Sizing it by canvas area makes the grid far too coarse over a headline
 *   (only ~2 samples across a letter stroke) and the glyphs turn to mush.
 * - Particles are distributed across candidates WITHOUT replacement, evenly.
 *   Random picking stacks particles on the same pixel and leaves holes.
 * - Positional scatter defaults to 0 so glyph edges stay crisp; `spread`
 *   opts back into an organic look.
 */
const sampleRaster = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  random: () => number,
  spread: number
): { positions: Float32Array; colors: string[]; rgb: Uint8ClampedArray } => {
  const data = ctx.getImageData(0, 0, width, height).data;

  const positions = new Float32Array(count * 2);
  const rgb = new Uint8ClampedArray(count * 3);
  const colors: string[] = new Array(count);

  // Pass 1: bounding box + filled area of the drawn content.
  const SCAN = 2;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let filled = 0;
  for (let y = 0; y < height; y += SCAN) {
    const row = y * width;
    for (let x = 0; x < width; x += SCAN) {
      if (data[(row + x) * 4 + 3] > 96) {
        filled++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    for (let i = 0; i < count; i++) {
      positions[i * 2] = width / 2;
      positions[i * 2 + 1] = height / 2;
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 255;
      colors[i] = '#ffffff';
    }
    return { positions, colors, rgb };
  }

  // Pass 2: walk the content's bounding box on a grid sized so the number of
  // hits lands just above `count` (slight oversample, then thinned evenly).
  const filledArea = filled * SCAN * SCAN;
  const step = Math.max(1, Math.sqrt(filledArea / (count * 1.15)));
  const candidates: number[] = [];
  for (let fy = minY; fy <= maxY; fy += step) {
    const y = Math.round(fy);
    const row = y * width;
    for (let fx = minX; fx <= maxX; fx += step) {
      const x = Math.round(fx);
      if (data[(row + x) * 4 + 3] > 96) candidates.push(row + x);
    }
  }

  if (candidates.length === 0) {
    for (let i = 0; i < count; i++) {
      positions[i * 2] = (minX + maxX) / 2;
      positions[i * 2 + 1] = (minY + maxY) / 2;
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 255;
      colors[i] = '#ffffff';
    }
    return { positions, colors, rgb };
  }

  // Even distribution — no replacement when we have enough candidates, and a
  // round-robin (not random) reuse when we don't.
  const picked: number[] = new Array(count);
  if (candidates.length >= count) {
    const stride = candidates.length / count;
    for (let i = 0; i < count; i++) {
      picked[i] = candidates[Math.min(candidates.length - 1, Math.floor(i * stride))];
    }
  } else {
    for (let i = 0; i < count; i++) {
      picked[i] = candidates[i % candidates.length];
    }
  }

  let cx = 0;
  let cy = 0;
  for (const idx of picked) {
    cx += idx % width;
    cy += Math.floor(idx / width);
  }
  cx /= count;
  cy /= count;
  picked.sort((a, b) => {
    const ax = (a % width) - cx;
    const ay = Math.floor(a / width) - cy;
    const bx = (b % width) - cx;
    const by = Math.floor(b / width) - cy;
    const angleDiff = Math.atan2(ay, ax) - Math.atan2(by, bx);
    if (Math.abs(angleDiff) > 1e-9) return angleDiff;
    return ax * ax + ay * ay - (bx * bx + by * by);
  });

  const scatter = spread * step;
  for (let i = 0; i < count; i++) {
    const idx = picked[i];
    const x = idx % width;
    const y = Math.floor(idx / width);
    positions[i * 2] = scatter ? x + (random() - 0.5) * scatter : x;
    positions[i * 2 + 1] = scatter ? y + (random() - 0.5) * scatter : y;
    const p = idx * 4;
    rgb[i * 3] = data[p];
    rgb[i * 3 + 1] = data[p + 1];
    rgb[i * 3 + 2] = data[p + 2];
    colors[i] = `rgb(${data[p]},${data[p + 1]},${data[p + 2]})`;
  }
  return { positions, colors, rgb };
};

const buildScatter = (
  pattern: string,
  width: number,
  height: number,
  count: number,
  random: () => number
): Float32Array => {
  const positions = new Float32Array(count * 2);
  const diag = Math.sqrt(width * width + height * height);
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    switch (pattern) {
      case 'center':
        x = width / 2 + (random() - 0.5) * 20;
        y = height / 2 + (random() - 0.5) * 20;
        break;
      case 'edges': {
        const side = Math.floor(random() * 4);
        if (side === 0) [x, y] = [random() * width, -10];
        else if (side === 1) [x, y] = [width + 10, random() * height];
        else if (side === 2) [x, y] = [random() * width, height + 10];
        else [x, y] = [-10, random() * height];
        break;
      }
      case 'bottom':
        x = random() * width;
        y = height + random() * 60;
        break;
      case 'top':
        x = random() * width;
        y = -random() * 60;
        break;
      case 'explode': {
        // Keep the near edge of the burst just outside the frame so the
        // fly-in is visible immediately instead of starting on empty black.
        const a = random() * Math.PI * 2;
        const r = diag * (0.35 + random() * 0.45);
        x = width / 2 + Math.cos(a) * r;
        y = height / 2 + Math.sin(a) * r;
        break;
      }
      default:
        x = random() * width;
        y = random() * height;
    }
    positions[i * 2] = x;
    positions[i * 2 + 1] = y;
  }
  return positions;
};

registerCanvasOp<ParticlesParams, ParticlesState | null>({
  name: 'particles',
  displayName: 'Particles',
  description:
    'Particle cloud morphing through formations: images, text, scatter patterns',
  schema: ParticlesSchema,
  init: ({ params, width, height, assets, random }) => {
    const scratch = document.createElement('canvas');
    scratch.width = width;
    scratch.height = height;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;

    const formations: Formation[] = params.formations.map((f) => {
      if (f.type === 'scatter') {
        return {
          positions: buildScatter(f.pattern, width, height, params.count, random),
          colors: null,
          rgb: new Uint8ClampedArray(0),
        };
      }

      sctx.clearRect(0, 0, width, height);
      if (f.type === 'image') {
        const img = assets.image(f.source);
        if (!img) {
          return {
            positions: buildScatter('random', width, height, params.count, random),
            colors: null,
            rgb: new Uint8ClampedArray(0),
          };
        }
        const boxW = width * f.scale;
        const boxH = height * f.scale;
        const r = computeFitRect(img.width, img.height, boxW, boxH, f.fit);
        sctx.drawImage(
          img,
          r.sx,
          r.sy,
          r.sWidth,
          r.sHeight,
          (width - boxW) / 2 + r.dx,
          (height - boxH) / 2 + r.dy,
          r.dWidth,
          r.dHeight
        );
      } else {
        sctx.font = `${f.fontWeight} ${f.fontSize}px ${f.fontFamily}`;
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillStyle = f.color ?? '#ffffff';
        sctx.fillText(f.text, width / 2, height / 2);
      }

      return sampleRaster(sctx, width, height, params.count, random, params.spread);
    });

    const offsets = new Float32Array(params.count);
    const phases = new Float32Array(params.count);
    const swirlDir = new Float32Array(params.count);
    for (let i = 0; i < params.count; i++) {
      offsets[i] = random();
      phases[i] = random() * Math.PI * 2;
      swirlDir[i] = (random() < 0.5 ? -1 : 1) * (0.5 + random());
    }
    return { formations, offsets, phases, swirlDir, layer: null };
  },
  apply: ({ g, params, state, progress, frame }) => {
    if (!state || state.formations.length === 0) return;
    if (params.opacity <= 0.01) return;
    const { formations, offsets, phases, swirlDir } = state;
    const count = params.count;

    // Which morph segment are we in?
    const segments = Math.max(1, formations.length - 1);
    const scaled = Math.min(0.9999, Math.max(0, progress)) * segments;
    const seg = formations.length === 1 ? 0 : Math.floor(scaled);
    const from = formations[seg];
    const to = formations[Math.min(seg + 1, formations.length - 1)];
    let t = formations.length === 1 ? 1 : scaled - seg;

    // Hold plateaus at both ends of the segment.
    const h = params.hold / 2;
    t = Math.min(1, Math.max(0, (t - h) / Math.max(1e-6, 1 - 2 * h)));

    // Particles render into a cached offscreen layer; glow is a single
    // blurred composite of that layer instead of per-particle shadows.
    // The layer matches the target's device resolution (preview draws at
    // player scale), so the particle loop cost shrinks with the preview too.
    const m = g.getTransform();
    const dscale = Math.max(0.1, Math.min(2, Math.hypot(m.a, m.b))) || 1;
    if (!state.layer) {
      state.layer = document.createElement('canvas');
    }
    const layer = state.layer;
    const lw = Math.max(1, Math.round(frame.width * dscale));
    const lh = Math.max(1, Math.round(frame.height * dscale));
    if (layer.width !== lw) layer.width = lw;
    if (layer.height !== lh) layer.height = lh;
    const lg = layer.getContext('2d');
    if (!lg) return;
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.clearRect(0, 0, lw, lh);
    lg.setTransform(dscale, 0, 0, dscale, 0, 0);

    const forcedColor = params.color ?? null;
    const half = params.size / 2;
    const stagger = params.stagger;
    const drawTrail = params.trail > 0;
    const atRest = t <= 0 || t >= 1;
    const swirl = params.swirl;
    const isCircle = params.shape === 'circle';

    if (forcedColor) lg.fillStyle = forcedColor;

    for (let i = 0; i < count; i++) {
      const ti = easeInOut(
        Math.min(
          1,
          Math.max(0, (t - offsets[i] * stagger) / Math.max(1e-6, 1 - stagger))
        )
      );

      const fx = from.positions[i * 2];
      const fy = from.positions[i * 2 + 1];
      const tx = to.positions[i * 2];
      const ty = to.positions[i * 2 + 1];
      const dx = tx - fx;
      const dy = ty - fy;
      let x = fx + dx * ti;
      let y = fy + dy * ti;

      // Curved swirl path: perpendicular arc that peaks mid-flight.
      if (swirl > 0 && ti > 0 && ti < 1) {
        const bell = Math.sin(ti * Math.PI);
        const k = swirl * swirlDir[i] * bell * 0.25;
        x += -dy * k;
        y += dx * k;
      }

      // Shimmer peaks mid-flight and vanishes at rest — a formation that
      // keeps jittering never resolves into readable letters.
      if (params.jitter > 0 && ti > 0 && ti < 1) {
        const bell = Math.sin(ti * Math.PI);
        x += Math.sin(frame.frame * 0.15 + phases[i]) * params.jitter * bell;
        y += Math.cos(frame.frame * 0.17 + phases[i]) * params.jitter * bell;
      }

      // Color: precomputed strings at rest; blend only mid-crossfade.
      if (!forcedColor) {
        const fromColors = from.colors;
        const toColors = to.colors;
        if (toColors && (ti >= 1 || !fromColors)) {
          lg.fillStyle = toColors[i];
        } else if (fromColors && (ti <= 0 || !toColors)) {
          lg.fillStyle = fromColors[i];
        } else if (fromColors && toColors) {
          const fr = from.rgb;
          const tr = to.rgb;
          const r = fr[i * 3] + (tr[i * 3] - fr[i * 3]) * ti;
          const gc = fr[i * 3 + 1] + (tr[i * 3 + 1] - fr[i * 3 + 1]) * ti;
          const b = fr[i * 3 + 2] + (tr[i * 3 + 2] - fr[i * 3 + 2]) * ti;
          lg.fillStyle = `rgb(${r | 0},${gc | 0},${b | 0})`;
        } else {
          lg.fillStyle = '#ffffff';
        }
      }

      if (isCircle) {
        lg.beginPath();
        lg.arc(x, y, half, 0, Math.PI * 2);
        lg.fill();
      } else {
        lg.fillRect(x - half, y - half, params.size, params.size);
      }

      // One cheap ghost while moving.
      if (drawTrail && !atRest && ti > 0 && ti < 1) {
        const tb = Math.max(0, ti - 0.08 * (1 + params.trail));
        const bx = fx + dx * tb;
        const by = fy + dy * tb;
        const prev = lg.globalAlpha;
        lg.globalAlpha = prev * params.trail * 0.4;
        lg.fillRect(bx - half, by - half, params.size, params.size);
        lg.globalAlpha = prev;
      }
    }

    // Composite: blurred glow pass (once), then the crisp layer. The layer
    // is device-resolution; destination rect maps it back to coordinate
    // space (which g's transform converts to the same device pixels).
    const prevAlpha = g.globalAlpha;
    if (params.glow > 0) {
      const prevOp = g.globalCompositeOperation;
      g.globalAlpha = prevAlpha * params.opacity * params.glowOpacity;
      g.globalCompositeOperation = 'lighter';
      g.filter = `blur(${params.glow}px)`;
      g.drawImage(layer, 0, 0, lw, lh, 0, 0, frame.width, frame.height);
      g.filter = 'none';
      g.globalCompositeOperation = prevOp;
    }
    g.globalAlpha = prevAlpha * params.opacity;
    g.drawImage(layer, 0, 0, lw, lh, 0, 0, frame.width, frame.height);
    g.globalAlpha = prevAlpha;
  },
});
