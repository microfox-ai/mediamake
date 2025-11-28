/**
 * Smooth Slide-In Effect Preset
 *
 * SINGLE EFFECT:
 * Provides elegant slide-in positioning animations for text, video, and image elements using GPU-accelerated
 * transform3d with customizable direction, distance, and easing. Includes subtle opacity fade during entrance.
 *
 * Features:
 * - 8 directional slide options (left, right, top, bottom, topLeft, topRight, bottomLeft, bottomRight)
 * - GPU-accelerated transform3d for optimal performance
 * - Configurable slide distance (pixels or viewport units)
 * - Multiple easing types (ease-out, ease-in-out, spring)
 * - Subtle opacity fade from 0.3 to 1 during first 40% of animation
 * - Smooth interpolation with 3-keyframe system for natural motion
 *
 * Use cases:
 * - Animating text overlays with smooth entrances
 * - Creating elegant video clip transitions
 * - Building professional image reveal effects
 * - Adding motion to any visual element
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  slideDirection: z
    .enum([
      'left',
      'right',
      'top',
      'bottom',
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ])
    .describe('Direction from which the element slides in'),
  slideDistance: z
    .number()
    .default(100)
    .describe('Distance to slide in pixels (or viewport units if specified)'),
  duration: z
    .number()
    .default(800)
    .describe('Duration of the slide animation in milliseconds'),
  delay: z
    .number()
    .optional()
    .describe('Delay before animation starts in milliseconds'),
  easingType: z
    .enum(['ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function for the animation'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    slideDirection,
    slideDistance,
    duration,
    delay,
    easingType,
    targetIds,
  } = params;

  // Convert duration from milliseconds to seconds
  const durationInSeconds = duration / 1000;
  const delayInSeconds = (delay || 0) / 1000;

  // Helper function to calculate slide ranges based on direction
  const calculateSlideRanges = (): Array<{
    key: string;
    val: number;
    prog: number;
  }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    // Determine translateX and translateY values based on direction
    let translateXStart = 0;
    let translateYStart = 0;

    switch (slideDirection) {
      case 'left':
        translateXStart = -slideDistance;
        break;
      case 'right':
        translateXStart = slideDistance;
        break;
      case 'top':
        translateYStart = -slideDistance;
        break;
      case 'bottom':
        translateYStart = slideDistance;
        break;
      case 'topLeft':
        translateXStart = -slideDistance;
        translateYStart = -slideDistance;
        break;
      case 'topRight':
        translateXStart = slideDistance;
        translateYStart = -slideDistance;
        break;
      case 'bottomLeft':
        translateXStart = -slideDistance;
        translateYStart = slideDistance;
        break;
      case 'bottomRight':
        translateXStart = slideDistance;
        translateYStart = slideDistance;
        break;
    }

    // Add translateX ranges if horizontal movement
    if (translateXStart !== 0) {
      ranges.push(
        { key: 'translateX', val: translateXStart, prog: 0 },
        { key: 'translateX', val: translateXStart * 0.1, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
      );
    }

    // Add translateY ranges if vertical movement
    if (translateYStart !== 0) {
      ranges.push(
        { key: 'translateY', val: translateYStart, prog: 0 },
        { key: 'translateY', val: translateYStart * 0.1, prog: 0.6 },
        { key: 'translateY', val: 0, prog: 1 },
      );
    }

    return ranges;
  };

  // Build animation ranges
  const slideRanges = calculateSlideRanges();

  // Add opacity fade ranges (0.3 → 0.95 → 1 during first 40%)
  const opacityRanges = [
    { key: 'opacity', val: 0.3, prog: 0 },
    { key: 'opacity', val: 0.95, prog: 0.4 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Combine all ranges
  const allRanges = [...slideRanges, ...opacityRanges];

  // Create effect data
  const effectData: GenericEffectData = {
    type: easingType,
    start: delayInSeconds,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: allRanges,
  };

  // Create effect object
  const effect = {
    id: `smooth-slide-in-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'smoothSlideIn-effect-container',
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
  id: 'smoothSlideIn',
  title: 'Smooth Slide-In Effect',
  description:
    'Internal effect preset module that provides elegant slide-in positioning animations for text, video, and image elements using GPU-accelerated transform3d with customizable direction, distance, and easing',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'slide', 'animation', 'internal', 'generic', 'entrance'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    slideDirection: 'left',
    slideDistance: 100,
    duration: 800,
    delay: 0,
    easingType: 'ease-out',
    targetIds: ['component-1'],
  },
};

// Export preset
export const smoothSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
