/**
 * Sequential Fade Reveal Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates an array of generic opacity effects that create a
 * staggered fade-in effect for multiple elements. Each target element fades in sequentially,
 * creating a cascading reveal effect with configurable delay, duration, easing, and overlap.
 *
 * Features:
 * - Staggered fade-in for multiple elements (0 to 1 opacity)
 * - Configurable fade delay between elements
 * - Configurable fade duration for each element
 * - Customizable easing curves (linear, ease-in, ease-out, ease-in-out)
 * - Optional reverse order (fade from last to first)
 * - Overlap control (0 = no overlap, 1 = fully overlapped/simultaneous)
 * - Automatic timing calculation based on element index
 *
 * Use cases:
 * - Creating cascading reveal animations for lists
 * - Staggered text appearances
 * - Sequential image reveals
 * - Multi-element entrance effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the staggered fade effect to'),
  fadeDelay: z
    .number()
    .min(0)
    .default(200)
    .describe('Time in milliseconds between each element\'s fade start'),
  fadeDuration: z
    .number()
    .min(100)
    .default(500)
    .describe('Duration in milliseconds for each element\'s fade animation'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-out')
    .describe('Easing curve to use for the fade animation'),
  reverse: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether to fade elements in reverse order (last to first)'),
  overlap: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .optional()
    .describe('How much the fades overlap (0 = no overlap, 1 = fully overlapped)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    fadeDelay,
    fadeDuration,
    easingType,
    reverse = false,
    overlap = 0,
  } = params;

  // Convert milliseconds to seconds for Remotion timing
  const fadeDelaySeconds = fadeDelay / 1000;
  const fadeDurationSeconds = fadeDuration / 1000;

  // Calculate the stagger delay based on overlap
  // overlap = 0: full delay between each element
  // overlap = 1: no delay (all start together)
  const staggerDelay = fadeDelaySeconds * (1 - overlap);

  // Determine the order of target IDs
  const orderedTargetIds = reverse ? [...targetIds].reverse() : targetIds;

  // Generate an effect for each target ID
  const effects = orderedTargetIds.map((targetId, index) => {
    // Calculate start time for this element based on its index and stagger delay
    const startTime = index * staggerDelay;

    // Create the generic opacity effect data
    const effectData: GenericEffectData = {
      type: easingType,
      start: startTime,
      duration: fadeDurationSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Return the complete effect node
    return {
      id: `sequential-fade-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Calculate total duration: last element start + fade duration
  const totalDuration =
    orderedTargetIds.length > 0
      ? (orderedTargetIds.length - 1) * staggerDelay + fadeDurationSeconds
      : fadeDurationSeconds;

  // Return the effects in a container structure
  // The system will extract these via _internalPresetOutput: 'effects'
  const rootContainer: RenderableComponentData = {
    id: 'sequential-fade-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'pointer-events-none absolute inset-0',
        style: {
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'sequential-fade-reveal',
  title: 'Sequential Fade Reveal',
  description:
    'Internal effect preset that provides a staggered fade-in effect for multiple elements. Creates a cascading reveal effect where elements fade in sequentially with configurable overlap, delay, and easing. Returns an array of generic opacity effects targeting specific component IDs.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'opacity', 'fade', 'stagger', 'sequential', 'cascade', 'reveal', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    fadeDelay: 200,
    fadeDuration: 500,
    easingType: 'ease-out',
    reverse: false,
    overlap: 0,
  },
};

export const sequentialFadeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
