import { z } from 'zod';

/**
 * Canvas pipeline type definitions.
 *
 * The canvas system mirrors the component registry: instead of monolithic
 * canvas effect components, drawing is described as a declarative tree of
 * small composable operations ("ops") resolved from a registry. Presets emit
 * plain JSON; the runtime handles asset loading (render-safe via
 * delayRender), heavy precomputation (cached `init` phase), deterministic
 * randomness, and per-frame drawing (pure `apply` phase).
 */

// ---------------------------------------------------------------------------
// Data model (what presets emit)
// ---------------------------------------------------------------------------

/** A named drawable input, loaded before the pipeline runs. */
export const CanvasSourceSchema = z.object({
  type: z.literal('image'),
  src: z.string().describe('Image URL (http/https or staticFile path)'),
});
export type CanvasSourceDef = z.infer<typeof CanvasSourceSchema>;

/**
 * Keyframe for animating an op param. Identical semantics to the
 * UniversalEffect AnimationRange: `key` is the param name, `val` the value at
 * `prog` (0..1 of the op's local progress).
 */
export const CanvasKeyframeSchema = z.object({
  key: z.string(),
  val: z.any(),
  prog: z.number().min(0).max(1),
});
export type CanvasKeyframe = z.infer<typeof CanvasKeyframeSchema>;

/**
 * Local timing for an op. Seconds, or '%' strings relative to the atom's
 * duration — same conventions as UniversalEffect. Ops read the eased result
 * as `progress` (0..1, clamped).
 */
export const CanvasOpTimingSchema = z.object({
  start: z.union([z.number(), z.string()]).optional(),
  duration: z.union([z.number(), z.string()]).optional(),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .optional(),
});
export type CanvasOpTiming = z.infer<typeof CanvasOpTimingSchema>;

/** One node in the drawing pipeline. */
export interface CanvasOpNode {
  /** Registry key, e.g. 'draw:image', 'clip:reveal', 'particles'. */
  op: string;
  /** Static params, validated against the op's zod schema. */
  params?: Record<string, any>;
  /** Keyframes interpolated over local progress, merged onto params. */
  ranges?: CanvasKeyframe[];
  /** Local timing window controlling this op's `progress`. */
  timing?: CanvasOpTiming;
  /** Child nodes; group/clip/post ops decide how these are rendered. */
  children?: CanvasOpNode[];
}

export const CanvasOpNodeSchema: z.ZodType<CanvasOpNode> = z.lazy(() =>
  z.object({
    op: z.string(),
    params: z.record(z.string(), z.any()).optional(),
    ranges: z.array(CanvasKeyframeSchema).optional(),
    timing: CanvasOpTimingSchema.optional(),
    children: z.array(CanvasOpNodeSchema).optional(),
  })
);

// ---------------------------------------------------------------------------
// Execution contexts (what ops receive)
// ---------------------------------------------------------------------------

export interface CanvasFrameInfo {
  frame: number;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
}

/** Loaded, decode-complete assets keyed by source name. */
export interface CanvasAssets {
  image: (name: string) => HTMLImageElement | undefined;
}

export interface CanvasOpInitContext<P = any> {
  params: P;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  assets: CanvasAssets;
  /** Deterministic PRNG seeded from (atom seed, node path). */
  random: () => number;
  seed: number;
}

export interface CanvasOpRenderContext<P = any, S = any> {
  g: CanvasRenderingContext2D;
  /** Schema-parsed params with keyframe ranges already applied. */
  params: P;
  /** Result of init(), or undefined when the op has no init. */
  state: S;
  /** Eased local progress (0..1, clamped) from the op's timing. */
  progress: number;
  frame: CanvasFrameInfo;
  assets: CanvasAssets;
  /**
   * Deterministic PRNG. Re-seeded identically every frame for this node —
   * mix `frame` into your math when you want per-frame variation.
   */
  random: () => number;
  seed: number;
  /** Render child nodes into the current context (inherits transforms/clip). */
  renderChildren: () => void;
  /**
   * Render child nodes into a reusable offscreen canvas and return it.
   * The canvas is owned by the runtime and reused between frames — draw from
   * it immediately, do not hold a reference across frames.
   */
  captureChildren: () => HTMLCanvasElement;
}

// ---------------------------------------------------------------------------
// Op definition (what gets registered)
// ---------------------------------------------------------------------------

export interface CanvasOpDefinition<P = any, S = any> {
  /** Registry key, e.g. 'draw:image'. */
  name: string;
  displayName: string;
  description?: string;
  /** Zod schema for params — enables uniform editor/AI introspection. */
  schema?: z.ZodType<P>;
  /**
   * Heavy, one-time precomputation (pixel sampling, burn maps, noise tiles).
   * Runs behind delayRender; result is cached keyed by (node path, params,
   * assets) and handed to every apply() call. May be async.
   */
  init?: (ctx: CanvasOpInitContext<P>) => S | Promise<S>;
  /** Pure per-frame draw. Must not allocate large buffers or mutate state. */
  apply: (ctx: CanvasOpRenderContext<P, S>) => void;
}

// ---------------------------------------------------------------------------
// Atom / effect data
// ---------------------------------------------------------------------------

export const CanvasPipelineDataSchema = z.object({
  sources: z.record(z.string(), CanvasSourceSchema).optional(),
  pipeline: z.array(CanvasOpNodeSchema),
  background: z
    .string()
    .optional()
    .describe('Background fill color; transparent when omitted'),
  seed: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Deterministic seed; defaults to the component id'),
  renderScale: z
    .number()
    .min(0.1)
    .max(1)
    .optional()
    .describe(
      'Backing-resolution multiplier. Preview additionally adapts to the player zoom automatically; server renders use full resolution unless this is set below 1.'
    ),
  className: z.string().optional(),
  style: z.record(z.string(), z.any()).optional(),
});
export type CanvasPipelineData = z.infer<typeof CanvasPipelineDataSchema>;

export const CanvasFxDataSchema = CanvasPipelineDataSchema.extend({
  mode: z
    .enum(['content', 'mask', 'overlay', 'underlay'])
    .default('overlay')
    .describe(
      'content: canvas replaces children · mask: pipeline alpha masks the children · overlay/underlay: canvas stacks above/below children'
    ),
  maskScale: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.5)
    .describe('Mask-mode resolution factor (lower = faster)'),
});
export type CanvasFxData = z.infer<typeof CanvasFxDataSchema>;
