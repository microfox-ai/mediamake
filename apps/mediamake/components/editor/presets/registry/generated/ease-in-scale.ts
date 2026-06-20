/**
 * Ease-In Scale Effect Preset
 *
 * SINGLE EFFECT:
 * Internal effect preset that creates a smooth scale-in animation with opacity fade and optional blur.
 * Starts from configurable scale (0.7-0.95) with opacity 0, then eases into full scale 1.0 with opacity 1
 * using ease-out easing for a natural decelerating curve. Perfect for revealing content like introducing
 * new elements on screen with a polished, professional feel.
 *
 * Features:
 * - Configurable start scale (0.7-0.95 range)
 * - Smooth opacity fade-in (0 → 1)
 * - Optional blur effect (0-10px at start, fading to 0)
 * - Ease-out easing for natural deceleration
 * - Supports targeting multiple elements via targetIds array
 * - Generic effect type for maximum flexibility
 *
 * Use cases:
 * - Revealing text, images, or UI elements smoothly
 * - Video editor-style transitions for introducing content
 * - Professional card/panel entrances
 * - Modal or overlay appearances
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with validation and descriptions
const presetParams = z.object({
  startScale: z
    .number()
    .min(0.7)
    .max(0.95)
    .default(0.8)
    .describe('Starting scale value (0.7-0.95), animates to 1.0'),
  duration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of the scale-in animation in seconds (0.3-2s)'),
  withBlur: z
    .boolean()
    .default(false)
    .describe('Whether to include blur effect at the start'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Blur amount in pixels at start (0-10px), animates to 0'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID, defaults to auto-generated'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { startScale, duration, withBlur, blurAmount, targetIds, effectId } =
    params;

  // Build animation ranges array
  const ranges: Array<{ key: string; val: any; prog: number }> = [
    // Scale animation: start scale → 1.0
    { key: 'scale', val: startScale, prog: 0 },
    { key: 'scale', val: 1, prog: 1 },
    // Opacity animation: 0 → 1
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Add blur effect if enabled
  if (withBlur && blurAmount > 0) {
    ranges.push(
      { key: 'blur', val: blurAmount, prog: 0 },
      { key: 'blur', val: 0, prog: 1 },
    );
  }

  // Construct the generic effect data
  const effectData = {
    type: 'ease-out' as const,
    start: 0,
    duration,
    mode: 'provider' as const,
    targetIds,
    ranges,
  };

  // Create the effect node
  const effect = {
    id: effectId || `ease-in-scale-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in a container structure for extraction
  const container: RenderableComponentData = {
    id: 'ease-in-scale-effect-container',
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
        duration: 10, // Placeholder duration
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'ease-in-scale',
  title: 'Ease-In Scale Effect',
  description:
    'Internal effect preset that creates a smooth scale-in animation with opacity fade and optional blur. Starts from configurable scale (0.7-0.95) with opacity 0, then eases into full scale 1.0 with opacity 1 using ease-out easing. Perfect for revealing content with a natural decelerating curve. Supports parameters for startScale, duration, and optional blur effect. Uses generic AnimationRange with combined properties to animate multiple elements simultaneously via targetIds array.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'scale', 'opacity', 'blur', 'reveal', 'internal', 'generic'],
  defaultInputParams: {
    startScale: 0.8,
    duration: 0.5,
    withBlur: false,
    blurAmount: 5,
    targetIds: ['component-1'],
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const easeInScalePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
