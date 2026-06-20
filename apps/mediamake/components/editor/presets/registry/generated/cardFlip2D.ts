/**
 * Card Flip 2D Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a playing card-style flip animation using pure 2D transforms (no 3D perspective).
 * Achieves the flip illusion by combining scaleX/scaleY animation with opacity transitions
 * at the midpoint. Supports horizontal and vertical flip directions, customizable flip duration,
 * scale compression at midpoint, and spring easing for realistic card physics.
 *
 * Features:
 * - Pure 2D transforms (scaleX/scaleY + opacity)
 * - Horizontal and vertical flip directions
 * - Customizable compression amount (how thin the card gets at midpoint)
 * - Midpoint opacity control for enhanced flip illusion
 * - Spring easing for natural card physics
 * - No 3D perspective required
 *
 * Technical Details:
 * - For horizontal flip: scaleX animates from 1 → compressionAmount → 1
 * - For vertical flip: scaleY animates from 1 → compressionAmount → 1
 * - Opacity dips at midpoint to enhance the flip illusion
 * - Uses spring easing by default for realistic card movement
 *
 * Use cases:
 * - Card reveal animations
 * - Content swap transitions
 * - Interactive UI flip effects
 * - 2D flip animations without 3D transforms
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the flip effect to'),
  effectStart: z.number().describe('Start time of the flip effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the flip animation in seconds'),
  direction: z.enum(['horizontal', 'vertical']).default('horizontal').describe('Direction of the flip: horizontal (scaleX) or vertical (scaleY)'),
  compressionAmount: z.number().min(0).max(1).default(0).describe('How thin the card gets at midpoint (0 = invisible, 1 = no compression)'),
  midpointOpacity: z.number().min(0).max(1).default(0.5).describe('Opacity value at the flip midpoint (0-1)'),
  easing: z.enum(['spring', 'ease-in-out', 'ease-in', 'ease-out', 'linear']).default('spring').describe('Easing function for the flip animation'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    direction,
    compressionAmount,
    midpointOpacity,
    easing,
    effectId,
  } = params;

  // Determine which scale property to animate based on direction
  const scaleProperty = direction === 'horizontal' ? 'scaleX' : 'scaleY';

  // Create animation ranges for the flip effect
  // Phase 1 (0 → 0.5): Scale from 1 to compressionAmount, opacity from 1 to midpointOpacity
  // Phase 2 (0.5 → 1): Scale from compressionAmount to 1, opacity from midpointOpacity to 1
  const ranges = [
    // Scale animation
    { key: scaleProperty, val: 1, prog: 0 },
    { key: scaleProperty, val: compressionAmount, prog: 0.5 },
    { key: scaleProperty, val: 1, prog: 1 },
    // Opacity animation (dips at midpoint for flip illusion)
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: midpointOpacity, prog: 0.5 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Construct the generic effect data
  const effectData = {
    type: easing,
    start: effectStart,
    duration: effectDuration,
    mode: 'provider' as const,
    targetIds: [targetId],
    ranges,
  };

  // Create the effect node
  const effect = {
    id: effectId || `cardFlip2D-${targetId}-${direction}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in a container structure
  // The system will extract the effect via _internalPresetOutput: 'effects'
  const rootContainer: RenderableComponentData = {
    id: 'cardFlip2D-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [effect],
    childrenData: [],
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

const presetMetadata: PresetMetadata = {
  id: 'cardFlip2D',
  title: 'Card Flip 2D Effect',
  description: 'Internal effect preset that creates a playing card-style flip animation using pure 2D transforms (scaleX/scaleY + opacity). Achieves flip illusion without 3D perspective by combining scale compression at midpoint with opacity transitions. Supports horizontal and vertical flip directions, customizable duration, compression amount, midpoint opacity, and spring easing for natural card physics. Outputs generic AnimationRange[] for use with the effects system.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'flip', '2d', 'card', 'transform', 'internal', 'generic'],
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 0.6,
    direction: 'horizontal',
    compressionAmount: 0,
    midpointOpacity: 0.5,
    easing: 'spring',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const cardFlip2DPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
