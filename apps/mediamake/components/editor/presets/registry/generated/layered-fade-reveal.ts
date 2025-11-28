/**
 * LayeredFadeReveal Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates overlapping transparency animations with staggered timing on multiple target elements.
 * Produces a cascading fade-in/out/cross pattern where each layer reveals at different speeds,
 * creating a depth effect like layers of glass sliding over each other.
 *
 * This is an internal effect preset that outputs AnimationRange[] effects for opacity manipulation.
 * Supports fadeDirection (in/out/cross), layerCount, overlapFactor, baseDuration, and easingCurve.
 *
 * Technical Details:
 * - Staggered start times: start = index * baseDuration * (1 - overlapFactor) / layerCount
 * - Each effect duration: baseDuration / layerCount
 * - Prog points: 0 (opacity 0), 0.5 (opacity 0.5 for overlap effect), 1 (opacity 1 for fadeIn, 0 for fadeOut)
 * - For cross-fade: creates two effects per target with inverted opacity values
 *
 * Usage:
 * Call this preset with parameters including targetIds array, fadeDirection, layerCount, overlapFactor,
 * baseDuration, and easingCurve. Extract the effects array from output._extractedEffects and apply
 * to your target components.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply staggered fade effects to'),
  fadeDirection: z
    .enum(['in', 'out', 'cross'])
    .default('in')
    .describe('Fade direction: in (fade in), out (fade out), or cross (crossfade)'),
  layerCount: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Number of overlapping layers (2-10)'),
  overlapFactor: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Timing overlap factor (0 = no overlap, 1 = full overlap, 0.5 = 50% overlap)'),
  baseDuration: z
    .number()
    .min(0.1)
    .default(2)
    .describe('Total animation time in seconds'),
  easingCurve: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in-out')
    .describe('Easing curve for the animation'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    fadeDirection,
    layerCount,
    overlapFactor,
    baseDuration,
    easingCurve,
  } = params;

  // Calculate individual effect duration
  const effectDuration = baseDuration / layerCount;

  const effects: any[] = [];

  // Create effects for each target
  targetIds.forEach((targetId, index) => {
    // Calculate staggered start time
    const startTime = (index * baseDuration * (1 - overlapFactor)) / layerCount;

    if (fadeDirection === 'cross') {
      // Cross-fade: create fade-out effect
      const fadeOutEffect: GenericEffectData = {
        type: easingCurve,
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `fade-out-${targetId}-${index}`,
        componentId: 'generic',
        data: fadeOutEffect,
      });

      // Cross-fade: create fade-in effect (inverted)
      const fadeInEffect: GenericEffectData = {
        type: easingCurve,
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      effects.push({
        id: `fade-in-${targetId}-${index}`,
        componentId: 'generic',
        data: fadeInEffect,
      });
    } else if (fadeDirection === 'in') {
      // Fade in
      const fadeInEffect: GenericEffectData = {
        type: easingCurve,
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      effects.push({
        id: `fade-in-${targetId}-${index}`,
        componentId: 'generic',
        data: fadeInEffect,
      });
    } else if (fadeDirection === 'out') {
      // Fade out
      const fadeOutEffect: GenericEffectData = {
        type: easingCurve,
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `fade-out-${targetId}-${index}`,
        componentId: 'generic',
        data: fadeOutEffect,
      });
    }
  });

  // Return effects in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'layered-fade-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Placeholder duration
      },
    },
    effects: effects,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'layered-fade-reveal',
  title: 'LayeredFadeReveal',
  description:
    'Internal effect preset that creates overlapping transparency animations with staggered timing. Creates a cascading fade-in/out/cross pattern where each layer reveals at different speeds, producing a depth effect like layers of glass sliding over each other. Outputs AnimationRange[] effects for opacity manipulation on multiple target elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'opacity', 'fade', 'layered', 'staggered', 'cascading', 'internal', 'generic'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1', 'component-2', 'component-3'],
    fadeDirection: 'in',
    layerCount: 3,
    overlapFactor: 0.5,
    baseDuration: 2,
    easingCurve: 'ease-in-out',
  },
};

// Export preset
export const layeredFadeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
