import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import { combineSeed, mulberry32 } from '../runtime/random';

/**
 * glitch — digital corruption applied to whatever the child ops draw.
 * The child subtree is captured to an offscreen canvas once per frame and
 * re-composited with seeded distortions. Everything is drawImage/composite
 * based: no getImageData in the frame loop (the legacy CanvasGlitchEffect
 * allocated three full-size ImageData buffers per frame), and all randomness
 * is seeded from (node seed, frame) so renders are deterministic across
 * workers.
 */

const GlitchSchema = z.object({
  types: z
    .array(z.enum(['rgb-shift', 'slice', 'blocks', 'static', 'scan']))
    .default(['rgb-shift', 'slice'])
    .describe('Which distortions to layer'),
  intensity: z.number().default(10),
  frequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability a glitch burst is active (ignored if continuous)'),
  continuous: z.boolean().default(false),
  holdFrames: z
    .number()
    .min(1)
    .default(3)
    .describe('Frames each random burst state persists'),
  sliceCount: z.number().default(20),
  blockCount: z.number().default(6),
  staticOpacity: z.number().min(0).max(1).default(0.15),
});

interface GlitchState {
  /** Pre-rendered seeded noise tiles for the static overlay. */
  noiseTiles: HTMLCanvasElement[];
  /** Scratch canvas for channel splitting. */
  channel: HTMLCanvasElement;
}

const CHANNEL_COLORS = ['#ff0000', '#00ff00', '#0000ff'] as const;
const CHANNEL_OFFSETS = [1, 0, -1] as const;

registerCanvasOp<z.infer<typeof GlitchSchema>, GlitchState>({
  name: 'glitch',
  displayName: 'Glitch',
  description: 'Layered digital glitch (rgb-shift, slices, blocks, static, scanline) over child ops',
  schema: GlitchSchema,
  init: ({ params, width, height, random }) => {
    // Static noise is precomputed as a handful of tiles cycled per burst —
    // per-frame Math.random() pixel writes are neither cheap nor
    // deterministic.
    const noiseTiles: HTMLCanvasElement[] = [];
    if (params.types.includes('static')) {
      const tileW = Math.min(width, 512);
      const tileH = Math.min(height, 512);
      for (let n = 0; n < 4; n++) {
        const tile = document.createElement('canvas');
        tile.width = tileW;
        tile.height = tileH;
        const tctx = tile.getContext('2d');
        if (!tctx) continue;
        const img = tctx.createImageData(tileW, tileH);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = random() < 0.5 ? 0 : (random() * 255) | 0;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = random() < 0.4 ? 255 : 0;
        }
        tctx.putImageData(img, 0, 0);
        noiseTiles.push(tile);
      }
    }
    const channel = document.createElement('canvas');
    channel.width = width;
    channel.height = height;
    return { noiseTiles, channel };
  },
  apply: (ctx) => {
    const { g, params, state, frame, seed } = ctx;
    const { width, height } = frame;

    const burst = Math.floor(frame.frame / params.holdFrames);
    const random = mulberry32(combineSeed(seed, burst));
    const active = params.continuous || random() < params.frequency;

    const content = ctx.captureChildren();
    if (!active) {
      g.drawImage(content, 0, 0);
      return;
    }

    const shift = params.intensity * (random() * 2 - 1);

    // --- rgb channel separation (composite-op based) ---
    if (params.types.includes('rgb-shift') && state.channel) {
      const ch = state.channel;
      const chCtx = ch.getContext('2d');
      if (chCtx) {
        const prevOp = g.globalCompositeOperation;
        g.globalCompositeOperation = 'lighter';
        for (let c = 0; c < 3; c++) {
          chCtx.globalCompositeOperation = 'source-over';
          chCtx.clearRect(0, 0, width, height);
          chCtx.drawImage(content, 0, 0);
          chCtx.globalCompositeOperation = 'multiply';
          chCtx.fillStyle = CHANNEL_COLORS[c];
          chCtx.fillRect(0, 0, width, height);
          chCtx.globalCompositeOperation = 'destination-in';
          chCtx.drawImage(content, 0, 0);
          g.drawImage(ch, shift * CHANNEL_OFFSETS[c], 0);
        }
        g.globalCompositeOperation = prevOp;
      }
    } else {
      g.drawImage(content, 0, 0);
    }

    // --- horizontal slice displacement ---
    if (params.types.includes('slice')) {
      const sliceH = height / params.sliceCount;
      for (let i = 0; i < params.sliceCount; i++) {
        if (random() > 0.4) continue;
        const offset = (random() * 2 - 1) * params.intensity * 2;
        const sy = sliceH * i;
        g.drawImage(content, 0, sy, width, sliceH, offset, sy, width, sliceH);
      }
    }

    // --- displaced blocks ---
    if (params.types.includes('blocks')) {
      for (let i = 0; i < params.blockCount; i++) {
        const bw = random() * width * 0.3;
        const bh = random() * height * 0.15;
        const dx = random() * (width - bw);
        const dy = random() * (height - bh);
        const sx = random() * (width - bw);
        const sy = random() * (height - bh);
        g.drawImage(content, sx, sy, bw, bh, dx, dy, bw, bh);
      }
    }

    // --- static noise overlay ---
    if (params.types.includes('static') && state.noiseTiles.length > 0) {
      const tile = state.noiseTiles[burst % state.noiseTiles.length];
      const prevAlpha = g.globalAlpha;
      g.globalAlpha = prevAlpha * params.staticOpacity;
      for (let y = 0; y < height; y += tile.height) {
        for (let x = 0; x < width; x += tile.width) {
          g.drawImage(tile, x, y);
        }
      }
      g.globalAlpha = prevAlpha;
    }

    // --- scanline with local distortion ---
    if (params.types.includes('scan')) {
      const scanY = (frame.frame * 5) % height;
      const stripY = Math.max(0, scanY - 10);
      const stripH = Math.min(20, height - stripY);
      if (stripH > 0) {
        g.drawImage(
          content,
          0,
          stripY,
          width,
          stripH,
          params.intensity * (random() * 2 - 1),
          stripY,
          width,
          stripH
        );
      }
      g.fillStyle = `rgba(255,255,255,${Math.min(1, params.intensity / 100)})`;
      g.fillRect(0, scanY, width, 3);
    }
  },
});
