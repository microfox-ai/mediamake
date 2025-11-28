/**
 * Hexadecimal Overflow Effect Preset
 *
 * Simulates memory overflow through color channel manipulation. This effect animates the
 * backgroundColor using rapidly cycling hex values that "overflow" through color space,
 * combined with box-shadow creating multiple offset copies to simulate data duplication.
 *
 * Features:
 * - Rapid color cycling through hex color space creating a "corrupted rainbow" effect
 * - Multiple shadow copies with varying offsets simulating memory duplication
 * - Configurable overflow speed (color changes per second)
 * - Duplicate count control (1-10 shadow copies)
 * - RGB channel masking to selectively affect specific color channels
 *
 * Use cases:
 * - Glitch effects and digital corruption aesthetics
 * - Cyberpunk or tech-themed visuals
 * - Error state or system failure visualizations
 * - Hypnotic background animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  overflowSpeed: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Color changes per second (0.5-10)'),
  duplicateCount: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of shadow duplicates (1-10)'),
  channelMask: z
    .object({
      r: z.boolean().default(true).describe('Enable red channel overflow'),
      g: z.boolean().default(true).describe('Enable green channel overflow'),
      b: z.boolean().default(true).describe('Enable blue channel overflow'),
    })
    .default({ r: true, g: true, b: true })
    .describe('Which RGB channels to affect'),
  duration: z
    .number()
    .min(0.5)
    .default(1.2)
    .describe('Duration of the effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate hex color based on channel mask and overflow value
  const generateHexColor = (
    time: number,
    mask: { r: boolean; g: boolean; b: boolean },
  ): string => {
    // Create overflow effect by using high-frequency oscillations
    const phase = time * Math.PI * 2;

    // Calculate each channel with different frequencies for complex color mixing
    const r = mask.r ? Math.floor(((Math.sin(phase * 1.3) + 1) / 2) * 255) : 0;
    const g = mask.g ? Math.floor(((Math.sin(phase * 1.7) + 1) / 2) * 255) : 0;
    const b = mask.b ? Math.floor(((Math.sin(phase * 2.1) + 1) / 2) * 255) : 0;

    // Convert to hex
    const toHex = (n: number) => {
      const hex = n.toString(16).padStart(2, '0');
      return hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper: Generate box-shadow for duplicates
  const generateBoxShadow = (
    count: number,
    mask: { r: boolean; g: boolean; b: boolean },
    time: number,
  ): string => {
    const shadows: string[] = [];

    for (let i = 0; i < count; i++) {
      // Create offset that increases with index
      const offsetX = (i + 1) * 4 * Math.sin(time * Math.PI + i);
      const offsetY = (i + 1) * 4 * Math.cos(time * Math.PI + i);
      const blur = (i + 1) * 2;

      // Generate color for this shadow with phase shift
      const shadowColor = generateHexColor(time + i * 0.1, mask);

      shadows.push(
        `${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px ${blur}px ${shadowColor}`,
      );
    }

    return shadows.join(', ');
  };

  const { overflowSpeed, duplicateCount, channelMask, duration } = params;

  // Calculate number of keyframes based on overflow speed
  // More keyframes = smoother, more rapid color changes
  const keyframeCount = Math.max(8, Math.ceil(overflowSpeed * duration * 2));

  // Generate color keyframes for backgroundColor
  const colorRanges: Array<{ key: string; val: string; prog: number }> = [];
  for (let i = 0; i <= keyframeCount; i++) {
    const progress = i / keyframeCount;
    const time = progress * duration * overflowSpeed;
    const color = generateHexColor(time, channelMask);

    colorRanges.push({
      key: 'backgroundColor',
      val: color,
      prog: progress,
    });
  }

  // Generate box-shadow keyframes
  const shadowRanges: Array<{ key: string; val: string; prog: number }> = [];
  for (let i = 0; i <= keyframeCount; i++) {
    const progress = i / keyframeCount;
    const time = progress * duration * overflowSpeed;
    const shadow = generateBoxShadow(duplicateCount, channelMask, time);

    shadowRanges.push({
      key: 'boxShadow',
      val: shadow,
      prog: progress,
    });
  }

  // Combine all ranges
  const allRanges = [...colorRanges, ...shadowRanges];

  // Create the generic effect
  const overflowEffect: GenericEffectData = {
    type: 'linear', // Linear for constant speed overflow
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['hex-overflow-target'],
    ranges: allRanges,
  };

  const targetComponent: RenderableComponentData = {
    id: 'hex-overflow-target',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
          boxShadow: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  const rootContainer: RenderableComponentData = {
    id: 'hex-overflow-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'hex-overflow-effect',
        componentId: 'generic',
        data: overflowEffect,
      },
    ],
    childrenData: [targetComponent],
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
  id: 'hexadecimal-overflow-effect',
  title: 'Hexadecimal Overflow Effect',
  description:
    'A hypnotic corrupted rainbow effect that simulates memory overflow through rapid color channel manipulation. Animates backgroundColor using hex values that "overflow" through color space, combined with box-shadow creating multiple offset copies to simulate data duplication. Features configurable overflow speed, duplicate count, and RGB channel masking.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'color',
    'glitch',
    'overflow',
    'hexadecimal',
    'rainbow',
    'corrupted',
    'cyberpunk',
    'tech',
    'memory',
    'duplication',
    'shadow',
    'animation',
    'hypnotic',
  ],
  defaultInputParams: {
    overflowSpeed: 3,
    duplicateCount: 5,
    channelMask: {
      r: true,
      g: true,
      b: true,
    },
    duration: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexadecimalOverflowEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
