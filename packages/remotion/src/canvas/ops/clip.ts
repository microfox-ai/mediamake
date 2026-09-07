import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import {
  drawEdgeGlow,
  traceRadialPath,
  traceWipePath,
} from '../runtime/geometry';

/**
 * clip:reveal — the generalized wipe/radial reveal. Unlike the legacy
 * CanvasWipeReveal (which could only reveal an imageUrl it loaded itself),
 * this clips whatever its children draw: images, text, shapes, particles,
 * other reveals. Progress defaults to the op's local timing, so
 * `timing: { start, duration }` alone animates it; pass `progress`
 * keyframes for custom curves.
 */

const ClipRevealSchema = z.object({
  revealType: z.enum(['wipe', 'radial']).default('wipe'),
  progress: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Override reveal progress; defaults to the op timing progress'),
  angle: z.number().default(0).describe('Wipe direction in degrees'),
  cx: z.number().optional().describe('Radial center x, defaults to center'),
  cy: z.number().optional().describe('Radial center y, defaults to center'),
  edgeStyle: z.enum(['straight', 'organic', 'burn']).default('straight'),
  edgeWaviness: z.number().default(30),
  edgeFrequency: z.number().default(4),
  organicRandomAmplitude: z.boolean().default(true),
  organicRandomWavelength: z.boolean().default(false),
  invert: z.boolean().default(false).describe('Hide instead of reveal'),
  glow: z.boolean().default(false).describe('Burn glow along the edge'),
  glowColor: z.string().default('#ff6600'),
  glowIntensity: z.number().default(1),
});

registerCanvasOp<z.infer<typeof ClipRevealSchema>, void>({
  name: 'clip:reveal',
  displayName: 'Reveal Clip',
  description:
    'Wipe/radial reveal with straight, organic or burn edges — clips child ops',
  schema: ClipRevealSchema,
  apply: (ctx) => {
    const { g, params, frame, seed, progress: timingProgress } = ctx;
    const progress = params.progress ?? timingProgress;
    const { width, height } = frame;
    const diagonal = Math.sqrt(width * width + height * height);

    if (progress <= 0 && !params.invert) return;
    if (progress >= 1 && !params.invert) {
      // Fully revealed: skip the clip entirely.
      ctx.renderChildren();
      return;
    }

    const edgeOpts = {
      edgeStyle: params.edgeStyle,
      waviness: params.edgeWaviness,
      frequency: params.edgeFrequency,
      randomAmplitude: params.organicRandomAmplitude,
      randomWavelength: params.organicRandomWavelength,
      seed,
      frame: frame.frame,
    };

    const path = new Path2D();
    let edgePoints;

    if (params.revealType === 'radial') {
      const cx = params.cx ?? width / 2;
      const cy = params.cy ?? height / 2;
      edgePoints = traceRadialPath(
        path,
        cx,
        cy,
        (diagonal / 2) * progress,
        progress,
        edgeOpts
      );
    } else {
      // The wipe path is traced in a local space centered on the canvas and
      // rotated by `angle`; bake that transform into the path so the clip
      // and the glow decoration share final canvas coordinates.
      const local = new Path2D();
      edgePoints = traceWipePath(
        local,
        progress * diagonal - diagonal / 2,
        diagonal,
        edgeOpts
      );
      const transform = new DOMMatrix()
        .translateSelf(width / 2, height / 2)
        .rotateSelf(params.angle);
      path.addPath(local, transform);
      edgePoints = edgePoints.map((pt) => {
        const p = transform.transformPoint(new DOMPoint(pt.x, pt.y));
        return { ...pt, x: p.x, y: p.y };
      });
    }

    g.save();
    if (params.invert) {
      // Clip to everything OUTSIDE the reveal path.
      const outer = new Path2D();
      outer.rect(0, 0, width, height);
      outer.addPath(path);
      g.clip(outer, 'evenodd');
    } else {
      g.clip(path);
    }
    ctx.renderChildren();
    g.restore();

    if (
      params.glow &&
      params.edgeStyle === 'burn' &&
      progress > 0.01 &&
      progress < 1 &&
      edgePoints.length > 0
    ) {
      drawEdgeGlow(
        g,
        edgePoints,
        params.glowColor,
        params.glowIntensity,
        seed,
        frame.frame
      );
    }
  },
});
