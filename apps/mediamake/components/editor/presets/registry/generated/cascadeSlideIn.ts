/**
 * Cascade Slide-In Internal Effect Preset
 *
 * This internal effect preset creates a sophisticated staggered slide-in effect for multiple elements.
 * Perfect for text lines, image galleries, or video grids, it combines multiple generic effects with
 * calculated delays to create a cascading animation where each element slides in sequentially.
 *
 * Features:
 * - Multiple slide directions: left, right, or alternate
 * - Configurable cascade delay between elements
 * - Adjustable overlap factor for smooth transitions
 * - Per-element duration control
 * - Multiple easing curve options
 * - Optional reverse ordering
 * - Linear or exponential delay patterns
 * - Combines translateX, scale, and opacity transformations
 *
 * Technical Implementation:
 * - Each element slides from 120% off-screen to final position
 * - Scale transformation: 0.85 → 0.95 → 1.0
 * - Opacity transformation: 0 → 0.8 → 1.0
 * - Delay calculation: baseDelay + (index * cascadeDelay * (1 - overlapFactor))
 * - Supports exponential delay pattern for more dramatic cascading
 *
 * Use Cases:
 * - Animated text line reveals
 * - Image gallery entrances
 * - Video grid introductions
 * - List item animations
 * - Card/tile cascading effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the cascade effect to'),
  slideFrom: z
    .enum(['left', 'right', 'alternate'])
    .default('left')
    .describe(
      "Direction to slide from: 'left' (all from left), 'right' (all from right), 'alternate' (alternating pattern)",
    ),
  cascadeDelay: z
    .number()
    .min(0)
    .default(100)
    .describe('Delay in milliseconds between each element starting its animation'),
  itemDuration: z
    .number()
    .min(100)
    .default(600)
    .describe('Duration in milliseconds for each element\'s animation'),
  overlapFactor: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'How much animations overlap (0 = no overlap, 1 = full overlap). Higher values create smoother cascades.',
    ),
  easingCurve: z
    .enum(['ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing curve for the slide-in animation'),
  reverse: z
    .boolean()
    .optional()
    .describe('If true, cascade from last element to first instead of first to last'),
  delayPattern: z
    .enum(['linear', 'exponential'])
    .default('linear')
    .optional()
    .describe(
      "Delay progression pattern: 'linear' (constant delay) or 'exponential' (accelerating delays)",
    ),
  baseDelay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Base delay in milliseconds before the first element starts (default: 0)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    slideFrom,
    cascadeDelay,
    itemDuration,
    overlapFactor,
    easingCurve,
    reverse,
    delayPattern,
    baseDelay,
  } = params;

  // Convert milliseconds to seconds for Remotion timing
  const cascadeDelaySec = cascadeDelay / 1000;
  const itemDurationSec = itemDuration / 1000;
  const baseDelaySec = (baseDelay || 0) / 1000;

  // Helper function to calculate delay based on pattern
  const calculateDelay = (index: number, total: number): number => {
    if (delayPattern === 'exponential') {
      // Exponential pattern: delay grows exponentially
      const exponentialFactor = Math.pow(1.2, index);
      return baseDelaySec + exponentialFactor * cascadeDelaySec * (1 - overlapFactor);
    }
    // Linear pattern (default)
    return baseDelaySec + index * cascadeDelaySec * (1 - overlapFactor);
  };

  // Helper function to determine slide direction for an element
  const getSlideDirection = (index: number): number => {
    if (slideFrom === 'left') return -120; // Slide from left (-120%)
    if (slideFrom === 'right') return 120; // Slide from right (+120%)
    // Alternate pattern
    return index % 2 === 0 ? -120 : 120;
  };

  // Create effects array
  const effects = targetIds.map((targetId, idx) => {
    // Determine actual index based on reverse option
    const actualIndex = reverse ? targetIds.length - 1 - idx : idx;
    const slideDirection = getSlideDirection(actualIndex);

    // Calculate delay for this element
    const elementDelay = calculateDelay(actualIndex, targetIds.length);

    // Create generic effect data
    const effectData: GenericEffectData = {
      type: easingCurve as 'ease-out' | 'ease-in-out' | 'spring',
      start: elementDelay,
      duration: itemDurationSec,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // TranslateX: slide from off-screen to position
        { key: 'translateX', val: `${slideDirection}%`, prog: 0 },
        { key: 'translateX', val: '0%', prog: 0.3 },
        { key: 'translateX', val: '0%', prog: 0.7 },
        { key: 'translateX', val: '0%', prog: 1 },

        // Scale: grow from 0.85 to 1
        { key: 'scale', val: 0.85, prog: 0 },
        { key: 'scale', val: 0.95, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },

        // Opacity: fade in from 0 to 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `cascade-slide-in-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'cascade-slide-in-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
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
  id: 'cascadeSlideIn',
  title: 'Cascade Slide-In Effect',
  description:
    'Internal effect preset that creates a staggered slide-in animation for multiple elements with cascading delays. Each element slides from off-screen with scale and opacity transformations, creating a smooth wave-like entrance. Supports multiple directions, overlap control, and reverse ordering.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'cascade', 'slide-in', 'stagger', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    slideFrom: 'left',
    cascadeDelay: 100,
    itemDuration: 600,
    overlapFactor: 0.3,
    easingCurve: 'ease-out',
    reverse: false,
    delayPattern: 'linear',
    baseDelay: 0,
  },
};

export const cascadeSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
