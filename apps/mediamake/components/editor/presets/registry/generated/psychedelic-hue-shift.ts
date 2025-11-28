/**
 * Psychedelic Hue Shift Effect Preset
 *
 * SINGLE EFFECT:
 * Continuously rotates through inverted color palettes using CSS hue-rotate and invert filters.
 * Animates through a full 360-degree hue rotation while simultaneously pulsing the invert filter
 * between 0% and 100%, creating a mesmerizing color transformation with subtle brightness oscillation.
 *
 * Features:
 * - Full 360-degree hue rotation with smooth progression
 * - Inverts filter pulsing between 0% and 100%
 * - Brightness oscillation between 0.8 and 1.2 for enhanced psychedelic effect
 * - GPU-accelerated filter transformations
 * - Configurable rotation duration, invert pulse speed, and initial hue offset
 * - Targets any component type (text, video, or image) via targetIds
 *
 * Use cases:
 * - Creating trippy visual effects for music videos
 * - Adding psychedelic overlays to images and videos
 * - Building dynamic color-shifting text animations
 * - Creating mesmerizing background effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1000)
    .max(30000)
    .default(4000)
    .describe('Duration of one complete hue rotation cycle in milliseconds'),
  invertSpeed: z
    .number()
    .min(500)
    .max(10000)
    .default(2000)
    .describe('Speed of the invert filter pulse in milliseconds (currently informational, synced with hue rotation)'),
  hueOffset: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Initial hue offset in degrees (0-360) to start the rotation from a different color'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the psychedelic effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the psychedelic hue shift effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds for effect timing
  const durationInSeconds = params.duration / 1000;
  
  // Apply hue offset to all keyframes
  const hueOffset = params.hueOffset;

  // Create the psychedelic hue shift effect with 5 keyframes for smooth animation
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // Keyframe 0: Start position
      {
        key: 'filter',
        val: `hue-rotate(${0 + hueOffset}deg) invert(0) brightness(1)`,
        prog: 0,
      },
      // Keyframe 1: 25% through cycle
      {
        key: 'filter',
        val: `hue-rotate(${90 + hueOffset}deg) invert(0.5) brightness(0.8)`,
        prog: 0.25,
      },
      // Keyframe 2: 50% through cycle (peak invert and brightness)
      {
        key: 'filter',
        val: `hue-rotate(${180 + hueOffset}deg) invert(1) brightness(1.2)`,
        prog: 0.5,
      },
      // Keyframe 3: 75% through cycle
      {
        key: 'filter',
        val: `hue-rotate(${270 + hueOffset}deg) invert(0.5) brightness(0.8)`,
        prog: 0.75,
      },
      // Keyframe 4: Full cycle complete (back to start)
      {
        key: 'filter',
        val: `hue-rotate(${360 + hueOffset}deg) invert(0) brightness(1)`,
        prog: 1,
      },
    ],
  };

  // Create the effect node
  const effect = {
    id: params.effectId || `psychedelic-hue-shift-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'psychedelic-hue-shift-container',
          type: 'layout',
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
              duration: durationInSeconds,
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
  id: 'psychedelic-hue-shift',
  title: 'Psychedelic Hue Shift Effect',
  description:
    'An internal effect preset that continuously rotates through inverted color palettes using CSS hue-rotate and invert filters. Creates mesmerizing color transformations by animating through a full 360-degree hue rotation while pulsing the invert filter between 0% and 100%, with subtle brightness oscillation between 0.8 and 1.2. Targets any component type (text, video, or image) via targetIds using GPU-accelerated filter transformations.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'psychedelic',
    'hue-shift',
    'color',
    'filter',
    'invert',
    'brightness',
    'generic',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    duration: 4000,
    invertSpeed: 2000,
    hueOffset: 0,
    targetIds: ['target-component-id'],
  },
};

export const psychedelicHueShiftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
