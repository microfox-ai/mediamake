/**
 * Chromatic Aberration Invert Effect - Internal Effect Preset
 *
 * This internal effect preset simulates psychedelic chromatic aberration with color inversion.
 * It splits RGB channels using drop-shadow filters with offset transforms while applying
 * selective inversion to each channel. Features breathing/prismatic animation with configurable
 * aberration strength, animation speed, inversion patterns (all/alternating/random), and
 * optional color temperature shift.
 *
 * SINGLE EFFECT:
 * Returns a generic effect that applies chromatic aberration with animated channel separation
 * and color inversion using CSS filters. The effect creates a prismatic, breathing visual
 * with GPU-optimized rendering.
 *
 * Features:
 * - Configurable aberration strength (controls channel separation distance)
 * - Adjustable animation speed (duration of breathing cycle)
 * - Multiple inversion patterns (all channels, alternating, or random)
 * - Optional color temperature shift for enhanced psychedelic effect
 * - GPU-optimized using CSS filters and transforms
 *
 * Use cases:
 * - Creating psychedelic visual effects
 * - Adding glitch-style chromatic aberration
 * - Building music video effects with prismatic color separation
 * - Creating breathing, pulsing visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(3000)
    .describe('Duration of one complete aberration cycle in milliseconds'),
  aberrationStrength: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe(
      'Strength of chromatic aberration effect (controls channel separation distance in pixels)',
    ),
  animationSpeed: z
    .number()
    .min(1000)
    .max(10000)
    .default(3000)
    .describe('Speed of the breathing animation cycle in milliseconds'),
  inversionPattern: z
    .enum(['all', 'alternating', 'random'])
    .default('alternating')
    .describe(
      'Pattern for color inversion: all (invert all channels), alternating (cycle inversion), or random (randomized inversion)',
    ),
  includeTemperatureShift: z
    .boolean()
    .default(true)
    .describe(
      'Whether to include color temperature shift for enhanced psychedelic effect',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate filter values based on inversion pattern
  const generateFilterValue = (
    prog: number,
    strength: number,
    pattern: 'all' | 'alternating' | 'random',
    includeTemp: boolean,
  ): string => {
    const maxOffset = strength;
    // Calculate offset based on progress (creates breathing effect)
    const offset =
      prog <= 0.5
        ? maxOffset * (prog * 2) // 0 to max (0 to 0.5)
        : maxOffset * (2 - prog * 2); // max to 0 (0.5 to 1)

    let invert = 0;
    if (pattern === 'all') {
      // All channels inverted at peak
      invert = prog <= 0.5 ? prog * 2 : 2 - prog * 2;
    } else if (pattern === 'alternating') {
      // Alternating inversion cycle
      invert = prog < 0.25 ? 0 : prog < 0.75 ? 1 : 0;
    } else if (pattern === 'random') {
      // Random-like inversion (using deterministic pattern based on prog)
      const step = Math.floor(prog * 4); // 4 steps in cycle
      invert = step % 2 === 0 ? 0 : 1;
    }

    // Color channel offsets using drop-shadow (RGB separation)
    const redOffset = `drop-shadow(${offset}px 0 0 red)`;
    const cyanOffset = `drop-shadow(-${offset}px 0 0 cyan)`;
    const magentaOffset = `drop-shadow(${offset}px ${offset / 2}px 0 magenta)`;
    const greenOffset = `drop-shadow(-${offset}px -${offset / 2}px 0 green)`;

    let filters = `invert(${invert})`;

    // Add chromatic aberration channels
    filters += ` ${redOffset} ${cyanOffset}`;

    // Add secondary channels at higher strength
    if (offset > maxOffset * 0.5) {
      filters += ` ${magentaOffset} ${greenOffset}`;
    }

    // Optional color temperature shift
    if (includeTemp) {
      const hueShift = offset * 10; // Shift hue based on offset
      const saturation = 1 + offset / maxOffset; // Increase saturation at peak
      filters += ` hue-rotate(${hueShift}deg) saturate(${saturation})`;
    }

    return filters;
  };

  const {
    targetId,
    effectStart,
    aberrationStrength,
    animationSpeed,
    inversionPattern,
    includeTemperatureShift,
    effectId,
  } = params;

  // Convert animation speed from milliseconds to seconds
  const durationInSeconds = animationSpeed / 1000;

  // Generate keyframes for the breathing cycle
  const ranges = [
    {
      key: 'filter',
      val: generateFilterValue(
        0,
        aberrationStrength,
        inversionPattern,
        includeTemperatureShift,
      ),
      prog: 0,
    },
    {
      key: 'filter',
      val: generateFilterValue(
        0.25,
        aberrationStrength,
        inversionPattern,
        includeTemperatureShift,
      ),
      prog: 0.25,
    },
    {
      key: 'filter',
      val: generateFilterValue(
        0.5,
        aberrationStrength,
        inversionPattern,
        includeTemperatureShift,
      ),
      prog: 0.5,
    },
    {
      key: 'filter',
      val: generateFilterValue(
        0.75,
        aberrationStrength,
        inversionPattern,
        includeTemperatureShift,
      ),
      prog: 0.75,
    },
    {
      key: 'filter',
      val: generateFilterValue(
        1,
        aberrationStrength,
        inversionPattern,
        includeTemperatureShift,
      ),
      prog: 1,
    },
  ];

  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: [targetId],
    ranges,
  };

  const effect = {
    id: effectId || `chromatic-aberration-invert-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'chromatic-aberration-invert-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none' as const,
              },
            },
          },
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

const presetMetadata: PresetMetadata = {
  id: 'chromatic-aberration-invert',
  title: 'Chromatic Aberration Invert Effect',
  description:
    'Internal effect preset that simulates psychedelic chromatic aberration with color inversion. Splits RGB channels using drop-shadow filters with offset transforms while applying selective inversion. Features breathing/prismatic animation with configurable aberration strength, animation speed, inversion patterns (all/alternating/random), and optional color temperature shift. Uses CSS filters for GPU-optimized rendering.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'chromatic-aberration',
    'glitch',
    'psychedelic',
    'inversion',
    'rgb-split',
    'prismatic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3000,
    aberrationStrength: 5,
    animationSpeed: 3000,
    inversionPattern: 'alternating',
    includeTemperatureShift: true,
  },
};

export const chromaticAberrationInvertPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
