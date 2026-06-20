/**
 * SlideAndFade Internal Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS depending on targetIds length):
 * This internal effect preset combines transform (translateX/Y) and opacity animations
 * for smooth element entrances. Elements slide in from a specified direction while
 * fading in simultaneously.
 *
 * Features:
 * - GPU-accelerated transforms (translateX/Y) for performance
 * - Supports 4 primary directions: left, right, top, bottom
 * - Supports 4 diagonal directions: top-left, top-right, bottom-left, bottom-right
 * - ElasticBounce parameter for subtle overshoot using spring easing
 * - FadeFirst parameter to control fade timing relationship (0-1, where fade completes at that progress)
 * - Stagger delay between multiple elements
 * - Provider mode targeting for precise component control
 *
 * Use cases:
 * - Smooth element entrances with combined motion and fade
 * - Staggered animations for lists or groups
 * - Dynamic directional animations
 * - Elastic bounce effects for playful animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the slide-fade effect to'),
  slideDistance: z
    .number()
    .min(0)
    .default(100)
    .describe('Distance to slide in pixels'),
  slideDirection: z
    .enum([
      'left',
      'right',
      'top',
      'bottom',
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ])
    .default('left')
    .describe('Direction from which elements slide in'),
  fadeDuration: z
    .number()
    .min(0)
    .default(1)
    .describe('Total animation duration in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .default(0.1)
    .describe('Delay between each element animation in seconds'),
  elasticBounce: z
    .boolean()
    .default(false)
    .describe('Add subtle overshoot and bounce-back using spring easing'),
  fadeFirst: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe(
      'Progress point (0-1) at which fade completes. 0.6 means fade finishes at 60% of animation. 1 means fade and slide finish together.',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    slideDistance,
    slideDirection,
    fadeDuration,
    staggerDelay,
    elasticBounce,
    fadeFirst,
  } = params;

  // Helper function to calculate translate values based on direction
  const getTranslateRanges = (
    direction: typeof slideDirection,
    distance: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    switch (direction) {
      case 'left':
        ranges.push(
          { key: 'translateX', val: -distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        );
        break;
      case 'right':
        ranges.push(
          { key: 'translateX', val: distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        );
        break;
      case 'top':
        ranges.push(
          { key: 'translateY', val: -distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
      case 'bottom':
        ranges.push(
          { key: 'translateY', val: distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
      case 'top-left':
        ranges.push(
          { key: 'translateX', val: -distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: -distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
      case 'top-right':
        ranges.push(
          { key: 'translateX', val: distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: -distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
      case 'bottom-left':
        ranges.push(
          { key: 'translateX', val: -distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
      case 'bottom-right':
        ranges.push(
          { key: 'translateX', val: distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        );
        break;
    }

    return ranges;
  };

  // Determine easing type based on elasticBounce
  const easingType = elasticBounce ? 'spring' : 'ease-out';

  // Create effects for each target
  const effects = targetIds.map((targetId, index) => {
    // Calculate translate ranges
    const translateRanges = getTranslateRanges(slideDirection, slideDistance);

    // Calculate opacity ranges based on fadeFirst parameter
    const opacityRanges =
      fadeFirst < 1
        ? [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: fadeFirst },
            { key: 'opacity', val: 1, prog: 1 },
          ]
        : [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ];

    // Combine all ranges
    const combinedRanges = [...translateRanges, ...opacityRanges];

    // Create effect data
    const effectData: GenericEffectData = {
      type: easingType as 'spring' | 'ease-out',
      start: index * staggerDelay,
      duration: fadeDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: combinedRanges,
    };

    // Return effect object
    return {
      id: `slide-fade-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return output with effects
  return {
    output: {
      childrenData: [
        {
          id: 'slide-fade-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration:
                fadeDuration + (targetIds.length - 1) * staggerDelay + 1,
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

const presetMetadata: PresetMetadata = {
  id: 'slide-and-fade-effect',
  title: 'SlideAndFade Internal Effect Preset',
  description:
    'Generic internal effect preset that combines transform (translateX/Y) and opacity animations for smooth element entrances. Elements slide in from a specified direction while fading in simultaneously, with support for GPU-accelerated transforms, elastic bounce, diagonal directions, staggered delays, and configurable fade timing.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'slide', 'fade', 'transform'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    slideDistance: 100,
    slideDirection: 'left',
    fadeDuration: 1,
    staggerDelay: 0.1,
    elasticBounce: false,
    fadeFirst: 1,
  },
};

export const slideAndFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
