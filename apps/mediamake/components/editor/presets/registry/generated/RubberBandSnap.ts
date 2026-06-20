/**
 * RubberBandSnap Internal Effect Preset
 *
 * Creates a rubber band-like snap-back effect for text elements. The effect simulates
 * stretching and releasing elastic material, with the text stretching horizontally (scaleX)
 * while compressing vertically (scaleY) during the snap motion. Includes translateY movement
 * that creates a subtle bounce.
 *
 * SINGLE EFFECT:
 * Returns a single generic effect with three-phase animation:
 * - Stretch phase (0-30%): Text stretches horizontally and compresses vertically
 * - Snap release (30-70%): Rapid contraction with opposing scale values
 * - Elastic settle (70-100%): Bounces to rest with damped oscillations
 *
 * GPU-accelerated transform-only for optimal performance.
 *
 * Parameters:
 * - targetId: Component ID to apply effect to
 * - effectStart: Start time relative to parent timeline
 * - effectDuration: Duration of the effect
 * - intensity: Multiplier for effect amplitude (0-2 recommended)
 * - direction: Horizontal movement direction ('left', 'right', 'center')
 * - easingType: Easing curve ('ease-in', 'ease-out', 'ease-in-out', 'spring')
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  intensity: z.number().min(0.1).max(2).default(1).optional().describe('Multiplier for effect amplitude (0-2 recommended)'),
  direction: z.enum(['left', 'right', 'center']).default('center').optional().describe('Direction of the snap motion'),
  easingType: z.enum(['ease-in', 'ease-out', 'ease-in-out', 'spring']).default('ease-out').optional().describe('Easing curve for the animation'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const intensity = params.intensity ?? 1;
  const direction = params.direction ?? 'center';
  const easingType = params.easingType ?? 'ease-out';

  // Calculate direction-based translateX values
  const calculateTranslateX = (progress: number, multiplier: number): number => {
    if (direction === 'center') return 0;
    const baseValue = intensity * multiplier;
    return direction === 'left' ? -baseValue : baseValue;
  };

  // Construct effect data with three-phase animation
  const effectData: GenericEffectData = {
    type: easingType,
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Phase 1: Stretch (0-30%)
      // scaleX increases, scaleY decreases
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1 + (intensity * 0.4), prog: 0.3 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 1 - (intensity * 0.15), prog: 0.3 },

      // Phase 2: Snap Release (30-70%)
      // Rapid contraction - scaleX decreases, scaleY increases
      { key: 'scaleX', val: 1 + (intensity * 0.4), prog: 0.3 },
      { key: 'scaleX', val: 1 - (intensity * 0.15), prog: 0.7 },
      { key: 'scaleY', val: 1 - (intensity * 0.15), prog: 0.3 },
      { key: 'scaleY', val: 1 + (intensity * 0.1), prog: 0.7 },

      // Phase 3: Elastic Settle (70-100%)
      // Bounce to rest with damped oscillations
      { key: 'scaleX', val: 1 - (intensity * 0.15), prog: 0.7 },
      { key: 'scaleX', val: 1 + (intensity * 0.05), prog: 0.85 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1 + (intensity * 0.1), prog: 0.7 },
      { key: 'scaleY', val: 1 - (intensity * 0.03), prog: 0.85 },
      { key: 'scaleY', val: 1, prog: 1 },

      // Bounce motion - translateY with subtle vertical movement
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: intensity * -8, prog: 0.3 },
      { key: 'translateY', val: intensity * 5, prog: 0.7 },
      { key: 'translateY', val: intensity * -2, prog: 0.85 },
      { key: 'translateY', val: 0, prog: 1 },

      // Horizontal motion based on direction parameter
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: calculateTranslateX(0.3, 15), prog: 0.3 },
      { key: 'translateX', val: calculateTranslateX(0.7, -5), prog: 0.7 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `rubber-band-snap-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return output structure for internal effect extraction
  return {
    output: {
      childrenData: [
        {
          id: 'rubber-band-snap-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'RubberBandSnap',
  title: 'Rubber Band Snap Effect',
  description: 'Internal effect preset that creates a rubber band-like snap-back effect for text elements. Simulates stretching and releasing elastic material with horizontal/vertical scaling and bounce motion. Three-phase animation: stretch (0-30%), snap release (30-70%), and elastic settle (70-100%). GPU-accelerated transform-only for optimal performance. Returns effect data to be applied to target components via provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'rubber-band', 'snap', 'elastic', 'bounce', 'internal', 'generic', 'transform', 'gpu-accelerated'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component-1',
    effectStart: 0,
    effectDuration: 0.6,
    intensity: 1,
    direction: 'center',
    easingType: 'ease-out',
  },
};

// Export preset
export const RubberBandSnapPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
