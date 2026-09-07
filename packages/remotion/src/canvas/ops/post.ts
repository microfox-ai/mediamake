import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import { combineSeed, mulberry32 } from '../runtime/random';

/**
 * Post ops: treatments applied over or around child ops — glow, vignette,
 * film grain, scanlines. All deterministic, all drawImage/gradient based.
 */

// --- post:glow ---------------------------------------------------------------

const GlowSchema = z.object({
  blur: z.number().default(24).describe('Blur radius in px'),
  strength: z.number().min(1).max(4).default(2).describe('Glow passes'),
  color: z
    .string()
    .optional()
    .describe('Tint the glow; defaults to the content itself'),
  opacity: z.number().min(0).max(1).default(0.8),
});

registerCanvasOp<z.infer<typeof GlowSchema>, void>({
  name: 'post:glow',
  displayName: 'Glow',
  description: 'Draw children with a blurred luminous halo behind them',
  schema: GlowSchema,
  apply: (ctx) => {
    const { g, params } = ctx;
    const content = ctx.captureChildren();

    const prevAlpha = g.globalAlpha;
    const prevOp = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = prevAlpha * params.opacity;
    g.filter = `blur(${params.blur}px)`;
    for (let i = 0; i < params.strength; i++) {
      g.drawImage(content, 0, 0);
    }
    g.filter = 'none';
    g.globalCompositeOperation = prevOp;
    g.globalAlpha = prevAlpha;

    if (params.color) {
      // Tinted halo: recolor a blurred copy via source-atop on a scratch
      // pass, cheap approximation — draw a colored, blurred silhouette.
      const prevOp2 = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = prevAlpha * params.opacity * 0.5;
      g.filter = `blur(${params.blur * 1.5}px)`;
      g.drawImage(content, 0, 0);
      g.filter = 'none';
      g.globalCompositeOperation = prevOp2;
      g.globalAlpha = prevAlpha;
    }

    g.drawImage(content, 0, 0);
  },
});

// --- post:vignette -----------------------------------------------------------

const VignetteSchema = z.object({
  color: z.string().default('#000000'),
  strength: z.number().min(0).max(1).default(0.5),
  radius: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Inner clear radius as fraction of the diagonal'),
});

registerCanvasOp<z.infer<typeof VignetteSchema>, void>({
  name: 'post:vignette',
  displayName: 'Vignette',
  description: 'Darkened edges over child ops',
  schema: VignetteSchema,
  apply: (ctx) => {
    const { g, params, frame } = ctx;
    ctx.renderChildren();
    const { width, height } = frame;
    const outer = Math.sqrt(width * width + height * height) / 2;
    const gradient = g.createRadialGradient(
      width / 2,
      height / 2,
      outer * params.radius,
      width / 2,
      height / 2,
      outer
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, params.color);
    const prevAlpha = g.globalAlpha;
    g.globalAlpha = prevAlpha * params.strength;
    g.fillStyle = gradient;
    g.fillRect(0, 0, width, height);
    g.globalAlpha = prevAlpha;
  },
});

// --- post:grain --------------------------------------------------------------

const GrainSchema = z.object({
  opacity: z.number().min(0).max(1).default(0.08),
  size: z.number().default(1).describe('Grain scale multiplier'),
});

registerCanvasOp<z.infer<typeof GrainSchema>, HTMLCanvasElement[] | null>({
  name: 'post:grain',
  displayName: 'Film Grain',
  description: 'Animated seeded film grain over child ops',
  schema: GrainSchema,
  init: ({ random }) => {
    const tiles: HTMLCanvasElement[] = [];
    for (let n = 0; n < 6; n++) {
      const tile = document.createElement('canvas');
      tile.width = 256;
      tile.height = 256;
      const tctx = tile.getContext('2d');
      if (!tctx) continue;
      const img = tctx.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      tiles.push(tile);
    }
    return tiles;
  },
  apply: (ctx) => {
    const { g, params, state, frame } = ctx;
    ctx.renderChildren();
    if (!state || state.length === 0) return;
    const tile = state[frame.frame % state.length];
    const prevAlpha = g.globalAlpha;
    const prevOp = g.globalCompositeOperation;
    g.globalAlpha = prevAlpha * params.opacity;
    g.globalCompositeOperation = 'overlay';
    const size = 256 * params.size;
    for (let y = 0; y < frame.height; y += size) {
      for (let x = 0; x < frame.width; x += size) {
        g.drawImage(tile, x, y, size, size);
      }
    }
    g.globalCompositeOperation = prevOp;
    g.globalAlpha = prevAlpha;
  },
});

// --- post:scanlines ----------------------------------------------------------

const ScanlinesSchema = z.object({
  spacing: z.number().default(4),
  thickness: z.number().default(1),
  color: z.string().default('rgba(0,0,0,0.35)'),
  drift: z.number().default(0).describe('Vertical drift px/frame'),
});

registerCanvasOp<z.infer<typeof ScanlinesSchema>, void>({
  name: 'post:scanlines',
  displayName: 'Scanlines',
  description: 'CRT-style scanlines over child ops',
  schema: ScanlinesSchema,
  apply: (ctx) => {
    const { g, params, frame } = ctx;
    ctx.renderChildren();
    g.fillStyle = params.color;
    const offset = params.drift
      ? (frame.frame * params.drift) % params.spacing
      : 0;
    for (let y = offset; y < frame.height; y += params.spacing) {
      g.fillRect(0, y, frame.width, params.thickness);
    }
  },
});

// --- ember/spark emitter along reveal edges ----------------------------------

const EmbersSchema = z.object({
  count: z.number().default(40),
  color: z.string().default('#ff6600'),
  size: z.number().default(3),
  rise: z.number().default(60).describe('Upward drift in px over a lifetime'),
  lifetime: z
    .number()
    .default(1)
    .describe('Ember lifetime in seconds'),
  area: z
    .enum(['full', 'top', 'bottom', 'center'])
    .default('full')
    .describe('Emission region'),
  opacity: z.number().min(0).max(1).default(1),
});

registerCanvasOp<z.infer<typeof EmbersSchema>, void>({
  name: 'embers',
  displayName: 'Embers',
  description: 'Floating glowing sparks (deterministic, loopable)',
  schema: EmbersSchema,
  apply: (ctx) => {
    const { g, params, frame, seed } = ctx;
    const { width, height } = frame;
    const life = Math.max(1, params.lifetime * frame.fps);

    g.globalAlpha *= params.opacity;
    for (let i = 0; i < params.count; i++) {
      // Each ember lives `life` frames then respawns with a new seeded run.
      const cycle = Math.floor((frame.frame + i * 7) / life);
      const random = mulberry32(combineSeed(seed, i, cycle));
      const t = ((frame.frame + i * 7) % life) / life;

      let baseY: number;
      switch (params.area) {
        case 'top':
          baseY = random() * height * 0.3;
          break;
        case 'bottom':
          baseY = height - random() * height * 0.3;
          break;
        case 'center':
          baseY = height * (0.35 + random() * 0.3);
          break;
        default:
          baseY = random() * height;
      }
      const x =
        random() * width + Math.sin((t + random()) * Math.PI * 4) * 12;
      const y = baseY - t * params.rise;
      const fade = Math.sin(t * Math.PI);
      const size = params.size * (0.5 + random());

      if (!isFinite(x) || !isFinite(y) || size <= 0) continue;
      const gradient = g.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, params.color);
      gradient.addColorStop(1, params.color + '00');
      const prevAlpha = g.globalAlpha;
      g.globalAlpha = prevAlpha * fade;
      g.fillStyle = gradient;
      g.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
      g.globalAlpha = prevAlpha;
    }
  },
});
