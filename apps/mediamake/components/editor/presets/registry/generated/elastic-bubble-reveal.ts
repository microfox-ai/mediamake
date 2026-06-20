/**
 * Elastic Bubble Reveal Preset
 *
 * Creates a playful elastic circle reveal with spring bounce physics and iridescent shimmer.
 * The circle expands with a satisfying bounce effect (overshoots to 1.15x, settles through
 * 2-3 oscillations). Features squash-and-stretch deformation for organic feel and rainbow
 * shimmer on edges like soap bubbles.
 *
 * Features:
 * - Spring physics with overshoot and bounce-back (0 → 1.15 → 0.95 → 1.05 → 1)
 * - Squash-and-stretch warping during expansion (scaleX/scaleY variations)
 * - Iridescent rainbow shimmer on circle edges
 * - Subtle blur during peak velocity for motion feel
 * - Light, playful, and organic animation perfect for cheerful/children's content
 *
 * Technical Implementation:
 * - Custom spring easing via keyframe ranges (approximating cubic-bezier(0.68, -0.55, 0.265, 1.55))
 * - clipPath circle mask for reveal effect
 * - Hue-rotate animation for rainbow shimmer
 * - Multiple colored box-shadows for iridescent edge glow
 * - Duration: 2.5 seconds to accommodate full bounce sequence
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackId: z
    .string()
    .default('elastic-bubble-reveal')
    .describe('Unique identifier for this reveal animation'),
  duration: z
    .number()
    .default(2.5)
    .describe('Total duration of the reveal animation in seconds'),
  overshootScale: z
    .number()
    .min(1.05)
    .max(1.3)
    .default(1.15)
    .describe('Peak scale during overshoot phase (default: 1.15 = 15% overshoot)'),
  bounceCount: z
    .number()
    .int()
    .min(2)
    .max(4)
    .default(3)
    .describe('Number of bounce oscillations before settling (default: 3)'),
  squashStretchIntensity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Intensity of squash-and-stretch warping (0 = none, 0.05 = subtle, 0.2 = extreme)'),
  shimmerSpeed: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Speed of rainbow shimmer rotation in seconds (lower = faster)'),
  edgeGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of iridescent edge glow (0 = none, 1 = maximum)'),
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable subtle blur during fast expansion for motion feel'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    duration,
    overshootScale,
    bounceCount,
    squashStretchIntensity,
    shimmerSpeed,
    edgeGlowIntensity,
    enableBlur,
  } = params;

  // Calculate bounce keyframes
  // Phases: expansion (0-0.4), overshoot (0.4-0.6), bounces (0.6-0.9), settle (0.9-1.0)
  const calculateBounceKeyframes = () => {
    const keyframes: Array<{ scale: number; scaleX: number; scaleY: number; prog: number; blur: number }> = [];
    
    // Phase 1: Initial expansion (0 to 0.4)
    keyframes.push({ scale: 0, scaleX: 0, scaleY: 0, prog: 0, blur: 0 });
    keyframes.push({ scale: 0.7, scaleX: 0.65, scaleY: 0.75, prog: 0.2, blur: enableBlur ? 2 : 0 }); // Squash during expansion
    
    // Phase 2: Overshoot (0.4 to 0.6)
    keyframes.push({ scale: overshootScale, scaleX: overshootScale + squashStretchIntensity, scaleY: overshootScale - squashStretchIntensity, prog: 0.5, blur: enableBlur ? 1 : 0 });
    
    // Phase 3: First bounce back (0.6 to 0.75)
    keyframes.push({ scale: 0.95, scaleX: 0.95 - squashStretchIntensity * 0.8, scaleY: 0.95 + squashStretchIntensity * 0.8, prog: 0.7, blur: 0 });
    
    // Phase 4: Second smaller bounce (0.75 to 0.9)
    if (bounceCount >= 2) {
      keyframes.push({ scale: 1.05, scaleX: 1.05 + squashStretchIntensity * 0.5, scaleY: 1.05 - squashStretchIntensity * 0.5, prog: 0.825, blur: 0 });
    }
    
    // Phase 5: Third tiny bounce (0.9 to 0.95)
    if (bounceCount >= 3) {
      keyframes.push({ scale: 0.98, scaleX: 0.98 - squashStretchIntensity * 0.3, scaleY: 0.98 + squashStretchIntensity * 0.3, prog: 0.9, blur: 0 });
      keyframes.push({ scale: 1.02, scaleX: 1.02 + squashStretchIntensity * 0.2, scaleY: 1.02 - squashStretchIntensity * 0.2, prog: 0.95, blur: 0 });
    }
    
    // Final settle
    keyframes.push({ scale: 1, scaleX: 1, scaleY: 1, prog: 1, blur: 0 });
    
    return keyframes;
  };

  const bounceKeyframes = calculateBounceKeyframes();

  // Build scale animation ranges
  const scaleRanges = bounceKeyframes.map(kf => ({
    key: 'scale' as const,
    val: kf.scale,
    prog: kf.prog,
  }));

  const scaleXRanges = bounceKeyframes.map(kf => ({
    key: 'scaleX' as const,
    val: kf.scaleX,
    prog: kf.prog,
  }));

  const scaleYRanges = bounceKeyframes.map(kf => ({
    key: 'scaleY' as const,
    val: kf.scaleY,
    prog: kf.prog,
  }));

  const blurRanges = enableBlur
    ? bounceKeyframes.map(kf => ({
        key: 'blur' as const,
        val: `${kf.blur}px`,
        prog: kf.prog,
      }))
    : [];

  // Opacity fade-in at start
  const opacityRanges = [
    { key: 'opacity' as const, val: 0, prog: 0 },
    { key: 'opacity' as const, val: 1, prog: 0.1 },
    { key: 'opacity' as const, val: 1, prog: 1 },
  ];

  // Generate rainbow colors for shimmer
  const rainbowColors = [
    'rgba(147,51,234,0.4)',   // Purple
    'rgba(59,130,246,0.4)',   // Blue
    'rgba(34,197,94,0.4)',    // Green
    'rgba(234,179,8,0.4)',    // Yellow
    'rgba(249,115,22,0.4)',   // Orange
    'rgba(239,68,68,0.4)',    // Red
  ];

  // Build shimmer overlay HTML
  const shimmerHtml = `
    <div class="absolute inset-0 rounded-full pointer-events-none" style="
      box-shadow: 
        inset 0 0 40px 4px rgba(255,255,255,${edgeGlowIntensity * 0.5}),
        0 0 30px 3px ${rainbowColors[0]},
        0 0 25px 3px ${rainbowColors[1]},
        0 0 20px 2px ${rainbowColors[2]},
        0 0 15px 2px ${rainbowColors[3]},
        0 0 10px 1px ${rainbowColors[4]},
        0 0 5px 1px ${rainbowColors[5]};
    "></div>
  `;

  // Main bubble mask container effect
  const bubbleMaskEffect = {
    id: `${trackId}-bubble-mask-effect`,
    componentId: 'generic',
    data: {
      type: 'spring' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [`${trackId}-bubble-mask`],
      ranges: [
        ...scaleRanges,
        ...scaleXRanges,
        ...scaleYRanges,
        ...opacityRanges,
        ...(enableBlur ? blurRanges : []),
      ],
    },
  };

  // Shimmer overlay effect (hue rotation)
  const shimmerEffect = {
    id: `${trackId}-shimmer-effect`,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [`${trackId}-shimmer-overlay`],
      ranges: [
        { key: 'hue-rotate', val: '0deg', prog: 0 },
        { key: 'hue-rotate', val: '360deg', prog: 1 },
      ],
    },
  };

  // Build component tree
  const bubbleMaskContainer: RenderableComponentData = {
    id: `${trackId}-bubble-mask`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          clipPath: 'circle(50% at 50% 50%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  const shimmerOverlay: RenderableComponentData = {
    id: `${trackId}-shimmer-overlay`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: shimmerHtml,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const rootContainer: RenderableComponentData = {
    id: `${trackId}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [bubbleMaskEffect, shimmerEffect],
    childrenData: [bubbleMaskContainer, shimmerOverlay],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-bubble-reveal',
  title: 'Elastic Bubble Reveal',
  description:
    'A playful circle reveal with bouncy elastic physics, squash-and-stretch deformation, and iridescent soap bubble shimmer effects. Perfect for cheerful, energetic, and children\'s content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'reveal',
    'circle',
    'elastic',
    'bounce',
    'playful',
    'bubble',
    'shimmer',
    'iridescent',
    'spring',
    'animation',
    'children',
    'cheerful',
  ],
  defaultInputParams: {
    trackId: 'elastic-bubble-reveal',
    duration: 2.5,
    overshootScale: 1.15,
    bounceCount: 3,
    squashStretchIntensity: 0.05,
    shimmerSpeed: 2,
    edgeGlowIntensity: 0.6,
    enableBlur: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const elasticBubbleRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
