/**
 * MinimalReveal Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a sophisticated reveal animation combining opacity fade with directional blur
 * that decreases over time, simulating a camera rack focus with subtle directional wipe.
 * The effect supports five reveal directions (left, right, top, bottom, center) with
 * configurable duration and blur intensity.
 *
 * Features:
 * - Smooth opacity fade from 0 to 1
 * - Directional blur that reduces from initial intensity (default 20px) to 0
 * - Optional directional translation based on reveal direction
 * - Blur completes at 80% progress for rack-focus feel
 * - Smooth ease-out curves for natural motion
 *
 * Use cases:
 * - Element entrance animations with focus effect
 * - Content reveal transitions
 * - Camera-like rack focus simulations
 * - Sophisticated fade-in effects with motion blur
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the reveal effect to'),
  revealDirection: z
    .enum(['left', 'right', 'top', 'bottom', 'center'])
    .describe(
      'Direction from which the element reveals (left, right, top, bottom, or center for no directional movement)',
    ),
  revealDuration: z
    .number()
    .min(100)
    .max(5000)
    .default(600)
    .optional()
    .describe('Duration of the reveal animation in milliseconds'),
  blurIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe('Initial blur intensity in pixels (reduces to 0 at 80% progress)'),
  delay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before the effect starts in milliseconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = (params.revealDuration ?? 600) / 1000; // Convert to seconds
  const blurIntensity = params.blurIntensity ?? 20;
  const delay = (params.delay ?? 0) / 1000; // Convert to seconds
  const direction = params.revealDirection;

  // Helper function to calculate translation ranges based on direction
  const getTranslationRanges = (): Array<{
    key: string;
    val: number;
    prog: number;
  }> => {
    const translationDistance = 30; // pixels

    switch (direction) {
      case 'left':
        return [
          { key: 'translateX', val: -translationDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
      case 'right':
        return [
          { key: 'translateX', val: translationDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
      case 'top':
        return [
          { key: 'translateY', val: -translationDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ];
      case 'bottom':
        return [
          { key: 'translateY', val: translationDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ];
      case 'center':
      default:
        // No translation for center reveal
        return [];
    }
  };

  // Build animation ranges
  const opacityRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  const blurRanges = [
    { key: 'blur', val: blurIntensity, prog: 0 },
    { key: 'blur', val: 0, prog: 0.8 }, // Blur completes at 80% for rack-focus feel
  ];

  const translationRanges = getTranslationRanges();

  // Combine all ranges
  const ranges = [...opacityRanges, ...blurRanges, ...translationRanges];

  // Construct the effect data
  const effectData: GenericEffectData = {
    type: 'ease-out',
    start: delay,
    duration: duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: ranges,
  };

  // Create the effect object
  const effect = {
    id:
      params.effectId ||
      `minimal-reveal-${params.targetIds.join('-')}-${direction}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in a container structure
  // The system will extract effects when _internalPresetOutput is set to 'effects'
  const rootContainer: RenderableComponentData = {
    id: 'minimal-reveal-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: delay + duration,
      },
    },
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
  id: 'minimal-reveal',
  title: 'MinimalReveal',
  description:
    'Internal effect preset that creates a sophisticated reveal animation combining opacity fade with directional blur, simulating a camera rack focus with subtle directional wipe. Supports five reveal directions (left, right, top, bottom, center) with configurable duration and blur intensity.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'blur', 'fade', 'internal', 'generic', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    revealDirection: 'center',
    revealDuration: 600,
    blurIntensity: 20,
    delay: 0,
  },
};

// Export preset
export const minimalRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
