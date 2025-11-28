/**
 * Anticipate Slide Combined Effect Preset
 *
 * This internal effect preset creates a professional anticipation-slide animation that combines
 * horizontal or vertical sliding with anticipation easing. Elements pull back in the opposite
 * direction before sliding to their final position with a gentle overshoot, creating smooth,
 * organic motion.
 *
 * Features:
 * - **Anticipation Motion**: Elements pull back 10% in the opposite direction before moving
 * - **Gentle Overshoot**: Smooth overshoot at the end for natural deceleration
 * - **Complementary Opacity**: Opacity animates from 0 → 0.5 during pullback → 1 at final position
 * - **Directional Flexibility**: Supports 'left', 'right', 'up', 'down' slide directions
 * - **Configurable Parameters**: Custom slideDistance, pullbackRatio, overshootRatio
 * - **Professional Easing**: Uses cubic-bezier for smooth, anticipatory motion
 *
 * Animation Timeline:
 * - 0-20% progress: Pullback phase - element moves backward by slideDistance * pullbackRatio, opacity 0 → 0.5
 * - 20-80% progress: Slide with overshoot - element slides to final position + overshoot
 * - 80-100% progress: Settle - element settles to final position, opacity reaches 1 by 60%
 *
 * Use cases:
 * - Professional UI transitions with anticipation
 * - Engaging content reveals with natural motion
 * - Dynamic slide-in effects for titles, captions, images
 * - Any content type requiring smooth, attention-grabbing transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the anticipate-slide effect to'),
  slideDistance: z
    .number()
    .optional()
    .default(100)
    .describe('Distance to slide in pixels (default: 100px)'),
  pullbackRatio: z
    .number()
    .optional()
    .default(0.1)
    .describe('Ratio of pullback distance relative to slideDistance (default: 0.1 = 10%)'),
  overshootRatio: z
    .number()
    .optional()
    .default(0.05)
    .describe('Ratio of overshoot distance relative to slideDistance (default: 0.05 = 5%)'),
  slideDirection: z
    .enum(['left', 'right', 'up', 'down'])
    .optional()
    .default('right')
    .describe("Direction of slide: 'left', 'right', 'up', 'down' (default: 'right')"),
  duration: z
    .number()
    .optional()
    .default(1.2)
    .describe('Duration of the effect in seconds (default: 1.2s)'),
  effectStart: z
    .number()
    .optional()
    .default(0)
    .describe('Start time of the effect relative to parent component (default: 0)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    slideDistance = 100,
    pullbackRatio = 0.1,
    overshootRatio = 0.05,
    slideDirection = 'right',
    duration = 1.2,
    effectStart = 0,
    effectId,
  } = params;

  // Determine translation axis based on direction
  const translateKey = slideDirection === 'up' || slideDirection === 'down' 
    ? 'translateY' 
    : 'translateX';

  // Calculate direction multiplier
  // For 'left' and 'up': positive values move element in from off-screen
  // For 'right' and 'down': negative values move element in from off-screen
  const directionMultiplier = slideDirection === 'left' || slideDirection === 'up' ? 1 : -1;

  // Calculate keyframe values
  const pullbackValue = -(slideDistance * pullbackRatio) * directionMultiplier;
  const overshootValue = slideDistance * (1 + overshootRatio) * directionMultiplier;
  const finalValue = slideDistance * directionMultiplier;

  // Create the generic effect data with anticipation-slide + opacity curves
  const effectData: GenericEffectData = {
    type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Anticipation easing
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Translation animation with anticipation
      { key: translateKey, val: 0, prog: 0 },                    // Start at 0
      { key: translateKey, val: pullbackValue, prog: 0.2 },      // Pullback at 20%
      { key: translateKey, val: overshootValue, prog: 0.8 },     // Overshoot at 80%
      { key: translateKey, val: finalValue, prog: 1 },           // Settle at final position
      
      // Opacity animation
      { key: 'opacity', val: 0, prog: 0 },                       // Start invisible
      { key: 'opacity', val: 0.5, prog: 0.2 },                   // Half visible during pullback
      { key: 'opacity', val: 1, prog: 0.6 },                     // Full visible at 60%
      { key: 'opacity', val: 1, prog: 1 },                       // Hold full visibility
    ],
  };

  // Create the effect object
  const effect = {
    id: effectId || `anticipate-slide-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'anticipate-slide-effect-container',
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
        duration: duration,
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
  id: 'anticipate-slide-effect',
  title: 'Anticipate Slide Combined Effect',
  description: 'A reusable generic effect preset that merges horizontal/vertical sliding with anticipation easing. Elements pull back 10% in the opposite direction before sliding to their final position with gentle overshoot. Includes a complementary opacity curve (0 → 0.5 during pullback → 1). Configurable slideDistance, pullbackRatio, overshootRatio, and slideDirection parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'slide', 'anticipation', 'animation', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    slideDistance: 100,
    pullbackRatio: 0.1,
    overshootRatio: 0.05,
    slideDirection: 'right',
    duration: 1.2,
    effectStart: 0,
  },
};

export const anticipateSlideEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
