/**
 * Chromatic Aberration Pulse Effect (Internal Effect Preset)
 *
 * SINGLE EFFECT:
 * Simulates RGB channel separation with a pulsing animation using CSS drop-shadow filters.
 * The effect splits red and cyan channels and offsets them in different directions,
 * creating a glitchy chromatic aberration effect that pulses in and out.
 *
 * Effect behavior:
 * - Uses multiple drop-shadow filters to simulate RGB channel separation
 * - Pulses from no separation (prog: 0) → max separation (prog: 0.5) → no separation (prog: 1)
 * - Supports horizontal, vertical, and radial separation directions
 * - Smooth ease-in-out animation for organic pulsing
 *
 * Parameters:
 * - targetId: Component to apply the effect to
 * - intensity: Channel separation distance (0-20px, default: 10)
 * - pulseSpeed: Animation duration in seconds (default: 2)
 * - direction: Separation direction ('horizontal' | 'vertical' | 'radial')
 * - effectStart: Start time of the effect (relative to parent)
 * - effectId: Optional custom effect ID
 *
 * Usage:
 * Apply to any component (text, image, video) for chromatic aberration effect.
 * Use lower intensity (5-10px) for subtle glitch, higher (15-20px) for dramatic effect.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  intensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Channel separation intensity in pixels (0-20)'),
  pulseSpeed: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Pulse animation duration in seconds'),
  direction: z
    .enum(['horizontal', 'vertical', 'radial'])
    .default('horizontal')
    .describe('Direction of channel separation'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the chromatic aberration effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const intensity = params.intensity ?? 10;
  const pulseSpeed = params.pulseSpeed ?? 2;
  const direction = params.direction ?? 'horizontal';
  const effectStart = params.effectStart ?? 0;

  // Calculate channel offsets based on direction
  const calculateOffsets = (progress: number) => {
    const offset = intensity * progress;

    switch (direction) {
      case 'horizontal':
        return {
          red: { x: offset, y: 0 },
          cyan: { x: -offset, y: 0 },
        };
      case 'vertical':
        return {
          red: { x: 0, y: offset },
          cyan: { x: 0, y: -offset },
        };
      case 'radial':
        // Diagonal offsets for radial effect
        return {
          red: { x: offset * 0.707, y: offset * 0.707 },
          cyan: { x: -offset * 0.707, y: -offset * 0.707 },
        };
      default:
        return {
          red: { x: offset, y: 0 },
          cyan: { x: -offset, y: 0 },
        };
    }
  };

  // Build drop-shadow filter strings
  const buildFilterString = (progress: number) => {
    const offsets = calculateOffsets(progress);

    // Red channel (slightly transparent for blend effect)
    const redShadow = `drop-shadow(${offsets.red.x}px ${offsets.red.y}px 0px rgba(255,0,0,0.8))`;

    // Cyan channel (combination of green and blue for true cyan)
    const cyanShadow = `drop-shadow(${offsets.cyan.x}px ${offsets.cyan.y}px 0px rgba(0,255,255,0.8))`;

    return `${redShadow} ${cyanShadow}`;
  };

  // Create animation ranges for pulsing effect
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Start: No separation
      {
        key: 'filter',
        val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0)) drop-shadow(0px 0px 0px rgba(0,255,255,0))',
        prog: 0,
      },
      // Peak: Maximum separation
      {
        key: 'filter',
        val: buildFilterString(1),
        prog: 0.5,
      },
      // End: No separation (return to start)
      {
        key: 'filter',
        val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0)) drop-shadow(0px 0px 0px rgba(0,255,255,0))',
        prog: 1,
      },
    ],
  };

  const effect = {
    id: params.effectId || `chromatic-aberration-pulse-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'chromatic-aberration-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: pulseSpeed,
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
  id: 'chromatic-aberration-pulse',
  title: 'Chromatic Aberration Pulse Effect',
  description:
    'Internal effect preset that simulates RGB channel separation with a pulsing animation using CSS drop-shadow filters. Creates a glitchy chromatic aberration effect.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'chromatic', 'aberration', 'glitch', 'rgb', 'pulse', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    intensity: 10,
    pulseSpeed: 2,
    direction: 'horizontal',
    effectStart: 0,
  },
};

export const chromaticAberrationPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
