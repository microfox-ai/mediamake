/**
 * CrossFade Transition Internal Effect Preset
 * 
 * ARRAY OF EFFECTS
 * 
 * This internal effect preset orchestrates sophisticated crossfade transitions between multiple elements.
 * It creates staggered opacity animations where elements fade out while others fade in, with customizable
 * overlap and hold durations. Supports multiple direction modes and independent easing curves for fade-in
 * and fade-out animations.
 * 
 * Features:
 * - **Staggered Transitions**: Elements fade in sequence with configurable overlap
 * - **Hold Duration**: Pause at full opacity before fading out
 * - **Overlap Control**: 0% = sequential, 100% = simultaneous fading
 * - **Direction Modes**: forward, reverse, alternate, random ordering
 * - **Independent Easing**: Different easing curves for fade-in vs fade-out
 * - **Multi-Element Support**: Handles any number of target elements
 * 
 * Technical Implementation:
 * - Calculates stagger offsets based on element index and overlap ratio
 * - Creates paired fade-out and fade-in effects for each element
 * - Uses progress keyframes to control opacity transitions with hold periods
 * - Returns array of generic effects with provider mode targeting
 * 
 * Use cases:
 * - Creating sophisticated multi-element crossfade sequences
 * - Building cascading fade animations with custom timing
 * - Implementing slideshow transitions with hold periods
 * - Orchestrating complex multi-layer opacity animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply crossfade transitions to'),
  duration: z
    .number()
    .default(2)
    .optional()
    .describe('Base duration for each element\'s fade cycle in seconds'),
  overlapRatio: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Overlap percentage between fades (0 = sequential, 1 = simultaneous)'),
  holdDuration: z
    .number()
    .default(0)
    .optional()
    .describe('Duration to hold at full opacity before fading out (seconds)'),
  direction: z
    .enum(['forward', 'reverse', 'alternate', 'random'])
    .default('forward')
    .optional()
    .describe('Order of element processing (forward, reverse, alternate, random)'),
  fadeInEasing: z
    .string()
    .default('ease-out')
    .optional()
    .describe('Easing curve for fade-in animation (ease-in, ease-out, ease-in-out, linear, spring)'),
  fadeOutEasing: z
    .string()
    .default('ease-in')
    .optional()
    .describe('Easing curve for fade-out animation (ease-in, ease-out, ease-in-out, linear, spring)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    duration = 2,
    overlapRatio = 0.5,
    holdDuration = 0,
    direction = 'forward',
    fadeInEasing = 'ease-out',
    fadeOutEasing = 'ease-in',
  } = params;

  // Helper function to process target IDs based on direction
  const processTargetIds = (ids: string[], dir: string): string[] => {
    switch (dir) {
      case 'reverse':
        return [...ids].reverse();
      case 'alternate':
        // Alternate pattern: 0, 2, 4... then 1, 3, 5...
        const even = ids.filter((_, i) => i % 2 === 0);
        const odd = ids.filter((_, i) => i % 2 === 1);
        return [...even, ...odd];
      case 'random':
        // Fisher-Yates shuffle
        const shuffled = [...ids];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      case 'forward':
      default:
        return ids;
    }
  };

  const orderedTargetIds = processTargetIds(targetIds, direction);
  const allEffects: any[] = [];

  // Calculate total element duration (fade-in + hold + fade-out)
  const elementDuration = duration + holdDuration;
  
  // Calculate hold ratio within the effect duration
  const holdRatio = holdDuration / elementDuration;

  orderedTargetIds.forEach((targetId, index) => {
    // Calculate stagger offset for this element
    const staggerOffset = index * (duration * (1 - overlapRatio));
    
    // Calculate fade-in and fade-out transition points
    const fadeInDuration = duration * (1 - overlapRatio);
    const fadeOutStart = duration + holdDuration - (duration * overlapRatio);
    
    // Fade-out effect (opacity 1 → hold → 0)
    const fadeOutRanges = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: holdRatio },
      { key: 'opacity', val: 0, prog: 1 },
    ];

    const fadeOutEffect = {
      id: `crossfade-out-${targetId}-${index}`,
      componentId: 'generic',
      data: {
        type: fadeOutEasing,
        start: staggerOffset,
        duration: elementDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: fadeOutRanges,
      } as GenericEffectData,
    };

    // Fade-in effect (opacity 0 → 0 until overlap → 1)
    const fadeInStartRatio = 1 - overlapRatio;
    const fadeInRanges = [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0, prog: fadeInStartRatio },
      { key: 'opacity', val: 1, prog: 1 },
    ];

    const fadeInEffect = {
      id: `crossfade-in-${targetId}-${index}`,
      componentId: 'generic',
      data: {
        type: fadeInEasing,
        start: staggerOffset,
        duration: elementDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: fadeInRanges,
      } as GenericEffectData,
    };

    // Add both effects for this element
    allEffects.push(fadeOutEffect);
    allEffects.push(fadeInEffect);
  });

  // Return effects in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'crossfade-transition-effect-container',
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
          effects: allEffects,
          childrenData: [],
        },
      ],
      _extractedEffects: allEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'crossfade-transition-effect',
  title: 'CrossFade Transition Effect',
  description: 'A sophisticated internal effect preset that orchestrates overlapping fade transitions between multiple elements. Creates cascading crossfade effects with customizable overlap percentage, hold duration, directional fade curves (ease-in for fade-out, ease-out for fade-in), and direction options (forward, reverse, alternate, random). Returns effect data for opacity-based transitions where one element fades out while another fades in, with configurable crossover visibility.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'crossfade', 'transition', 'opacity', 'internal', 'generic', 'cascade', 'stagger'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    duration: 2,
    overlapRatio: 0.5,
    holdDuration: 0.5,
    direction: 'forward',
    fadeInEasing: 'ease-out',
    fadeOutEasing: 'ease-in',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crossfadeTransitionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
