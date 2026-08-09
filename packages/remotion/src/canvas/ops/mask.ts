import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import { computeFitRect } from '../runtime/geometry';

/**
 * mask:content-aware — reveal an image pixel-by-pixel ordered by its own
 * content (hue order, luminance, seeded random), optionally blended with a
 * directional sweep. The burn map and all buffers are computed ONCE in init;
 * apply only rewrites the alpha channel into reused buffers (the legacy
 * CanvasReveal re-allocated a canvas + full getImageData every frame).
 */

const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : delta / max, max];
};

const hueToVibgyorOrder = (hue: number): number => {
  if (hue >= 260 && hue <= 290) return 0.0;
  if (hue >= 240 && hue < 260) return 0.15;
  if (hue >= 200 && hue < 240) return 0.3;
  if (hue >= 120 && hue < 200) return 0.5;
  if (hue >= 50 && hue < 120) return 0.65;
  if (hue >= 20 && hue < 50) return 0.8;
  if (hue >= 290 || hue < 20) return 1.0;
  return hue / 360;
};

const MaskContentAwareSchema = z.object({
  source: z.string().describe('Name of an entry in the pipeline sources map'),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  order: z.enum(['vibgyor', 'luminance', 'random']).default('vibgyor'),
  progress: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Override reveal progress; defaults to the op timing progress'),
  direction: z
    .enum(['none', 'horizontal', 'vertical', 'diagonal-down', 'diagonal-up'])
    .default('none')
    .describe(
      'Optional directional sweep blended with the content order. horizontal = left-to-right, vertical = top-to-bottom'
    ),
  directionWeight: z.number().min(0).max(1).default(0.4),
  serpentine: z
    .boolean()
    .default(false)
    .describe(
      'Sweep back and forth in bands (boustrophedon) instead of one straight pass'
    ),
  layers: z
    .number()
    .min(1)
    .default(10)
    .describe('Number of bands when serpentine is enabled'),
  softness: z
    .number()
    .min(0.005)
    .max(0.5)
    .default(0.06)
    .describe('Width of the reveal transition band'),
  maxPixels: z
    .number()
    .default(1_000_000)
    .describe('Downscale cap for the pixel buffer (performance)'),
});

interface ContentAwareState {
  work: HTMLCanvasElement;
  workCtx: CanvasRenderingContext2D;
  basePixels: Uint8ClampedArray;
  frameData: ImageData;
  burnMap: Float32Array;
  imgWidth: number;
  imgHeight: number;
  lastProgressKey: number;
}

registerCanvasOp<z.infer<typeof MaskContentAwareSchema>, ContentAwareState | null>({
  name: 'mask:content-aware',
  displayName: 'Content-Aware Mask',
  description:
    'Reveal an image ordered by its own colors/luminance, optionally blended with a directional sweep',
  schema: MaskContentAwareSchema,
  init: ({ params, assets, random }) => {
    const img = assets.image(params.source);
    if (!img) return null;

    // Downscale the working buffer if the image is huge — the reveal is a
    // soft alpha effect; full-resolution per-pixel processing buys nothing.
    const total = img.width * img.height;
    const scale = total > params.maxPixels ? Math.sqrt(params.maxPixels / total) : 1;
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const work = document.createElement('canvas');
    work.width = w;
    work.height = h;
    const workCtx = work.getContext('2d', { willReadFrequently: true });
    if (!workCtx) return null;

    workCtx.drawImage(img, 0, 0, w, h);
    const frameData = workCtx.getImageData(0, 0, w, h);
    const basePixels = new Uint8ClampedArray(frameData.data);

    const count = w * h;
    const burnMap = new Float32Array(count);
    const raw = new Float32Array(count);

    for (let idx = 0; idx < count; idx++) {
      const i = idx * 4;
      const r = basePixels[i];
      const gc = basePixels[i + 1];
      const b = basePixels[i + 2];
      if (params.order === 'vibgyor') {
        const [hue, s] = rgbToHsv(r, gc, b);
        const v = hueToVibgyorOrder(hue);
        raw[idx] = v * s + 0.5 * (1 - s);
      } else if (params.order === 'luminance') {
        raw[idx] = (0.299 * r + 0.587 * gc + 0.114 * b) / 255;
      } else {
        raw[idx] = random();
      }
    }

    // Histogram equalization so the reveal advances at a uniform rate.
    const buckets = new Float64Array(256);
    for (let idx = 0; idx < count; idx++) {
      buckets[Math.min(255, Math.floor(raw[idx] * 256))]++;
    }
    let cumulative = 0;
    const cdf = new Float64Array(256);
    for (let b = 0; b < 256; b++) {
      cumulative += buckets[b];
      cdf[b] = cumulative / count;
    }
    for (let idx = 0; idx < count; idx++) {
      burnMap[idx] = cdf[Math.min(255, Math.floor(raw[idx] * 256))];
    }

    // Optional directional sweep blended into the content order.
    if (params.direction !== 'none') {
      const wgt = params.directionWeight;
      let min = Infinity;
      let max = -Infinity;
      for (let idx = 0; idx < count; idx++) {
        const x = idx % w;
        const y = Math.floor(idx / w);
        let dir: number;
        if (params.serpentine && (params.direction === 'horizontal' || params.direction === 'vertical')) {
          // Bands that alternate direction, so the sweep snakes back and
          // forth instead of resetting to the same edge each band.
          const along = params.direction === 'horizontal' ? y / h : x / w;
          const across = params.direction === 'horizontal' ? x / w : y / h;
          const band = Math.min(params.layers - 1, Math.floor(along * params.layers));
          const local = band % 2 === 1 ? 1 - across : across;
          dir = (band + local) / params.layers;
        } else {
          switch (params.direction) {
            case 'horizontal':
              dir = x / w;
              break;
            case 'vertical':
              dir = y / h;
              break;
            case 'diagonal-down':
              dir = (x + y) / (w + h);
              break;
            default:
              dir = (x + (h - y)) / (w + h);
          }
        }
        const v = burnMap[idx] * (1 - wgt) + dir * wgt;
        burnMap[idx] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const span = max - min || 1;
      for (let idx = 0; idx < count; idx++) {
        burnMap[idx] = (burnMap[idx] - min) / span;
      }
    }

    return {
      work,
      workCtx,
      basePixels,
      frameData,
      burnMap,
      imgWidth: w,
      imgHeight: h,
      lastProgressKey: -1,
    };
  },
  apply: ({ g, params, state, progress: timingProgress, frame }) => {
    if (!state) return;
    const progress = params.progress ?? timingProgress;
    if (progress <= 0) return;

    const { work, workCtx, basePixels, frameData, burnMap } = state;
    const { imgWidth, imgHeight } = state;

    if (progress >= 1) {
      // Fully revealed: restore original alpha once and draw.
      if (state.lastProgressKey !== 4096) {
        frameData.data.set(basePixels);
        workCtx.putImageData(frameData, 0, 0);
        state.lastProgressKey = 4096;
      }
    } else {
      // Quantize progress so repeated renders of the same frame (preview
      // scrubbing) reuse the buffer instead of re-writing identical alpha.
      const key = Math.round(progress * 4096);
      if (key !== state.lastProgressKey) {
        const soft = params.softness;
        const data = frameData.data;
        data.set(basePixels);
        for (let idx = 0; idx < burnMap.length; idx++) {
          const t = (progress - burnMap[idx]) / soft;
          if (t <= 0) {
            data[idx * 4 + 3] = 0;
          } else if (t < 1) {
            data[idx * 4 + 3] = (data[idx * 4 + 3] * t) | 0;
          }
        }
        workCtx.putImageData(frameData, 0, 0);
        state.lastProgressKey = key;
      }
    }

    const r = computeFitRect(imgWidth, imgHeight, frame.width, frame.height, params.fit);
    g.drawImage(
      work,
      r.sx,
      r.sy,
      r.sWidth,
      r.sHeight,
      r.dx,
      r.dy,
      r.dWidth,
      r.dHeight
    );
  },
});
