/**
 * RGB Channel Split Effect (Internal Preset)
 *
 * This internal effect preset creates a chromatic aberration effect by splitting
 * RGB color channels with animated offsets. It simulates classic prismatic distortion
 * by separating red, green, and blue channels with independent translateX/Y animations
 * and hue-rotation filters.
 *
 * ARRAY OF EFFECTS:
 * Returns 3 parallel generic effects (red, green, blue channels) that create a glitchy
 * chromatic aberration effect with breathing animations where channels drift apart and
 * converge smoothly.
 *
 * Features:
 * - Three separate color channel effects (R/G/B) with independent offsets
 * - Configurable split intensity (0-50px offset range)
 * - Direction control (horizontal, vertical, diagonal)
 * - Smooth ease-in-out breathing effect with converge pattern
 * - Hue-rotation filters to simulate color channel separation
 * - Works universally on text, images, and video elements
 *
 * Technical Implementation:
 * - Uses generic effects with AnimationRange[] for keyframe animations
 * - Three keyframes at prog [0, 0.5, 1] for breathing motion
 * - Red channel: positive offset, hue-rotate 0deg (red)
 * - Green channel: opposite offset, hue-rotate 120deg (green)
 * - Blue channel: minimal offset, hue-rotate 240deg (blue)
 * - Provider mode targets components via targetIds array
 *
 * Use Cases:
 * - Adding glitchy chromatic aberration to text overlays
 * - Creating prismatic split effects on images
 * - Building retro VHS-style visual effects
 * - Simulating RGB shift for video glitches
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfx/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the RGB split effect to'),
  intensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Split intensity in pixels (0-50px offset range)'),
  duration: z
    .number()
    .min(100)
    .default(1000)
    .describe('Duration of the effect in milliseconds'),
  direction: z
    .enum(['horizontal', 'vertical', 'diagonal'])
    .default('horizontal')
    .describe('Direction of the channel split (horizontal, vertical, or diagonal)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const intensity = params.intensity ?? 10;
  const duration = (params.duration ?? 1000) / 1000; // Convert ms to seconds
  const direction = params.direction ?? 'horizontal';
  const effectStart = params.effectStart ?? 0;
  const targetIds = params.targetIds;

  // Calculate offsets based on direction and intensity
  const calculateOffsets = (
    channelType: 'red' | 'green' | 'blue',
  ): { xStart: number; yStart: number; xPeak: number; yPeak: number } => {
    const xStart = 0;
    const yStart = 0;
    let xPeak = 0;
    let yPeak = 0;

    if (direction === 'horizontal') {
      // Red: positive X offset
      // Green: negative X offset
      // Blue: minimal offset
      if (channelType === 'red') {
        xPeak = intensity;
      } else if (channelType === 'green') {
        xPeak = -intensity;
      } else {
        xPeak = intensity * 0.3;
      }
    } else if (direction === 'vertical') {
      // Red: positive Y offset
      // Green: negative Y offset
      // Blue: minimal offset
      if (channelType === 'red') {
        yPeak = intensity;
      } else if (channelType === 'green') {
        yPeak = -intensity;
      } else {
        yPeak = intensity * 0.3;
      }
    } else if (direction === 'diagonal') {
      // Red: positive X and Y
      // Green: negative X and Y
      // Blue: minimal offset in opposite diagonal
      if (channelType === 'red') {
        xPeak = intensity * 0.7;
        yPeak = intensity * 0.7;
      } else if (channelType === 'green') {
        xPeak = -intensity * 0.7;
        yPeak = -intensity * 0.7;
      } else {
        xPeak = intensity * 0.2;
        yPeak = -intensity * 0.2;
      }
    }

    return { xStart, yStart, xPeak, yPeak };
  };

  // Create red channel effect (hue-rotate 0deg = red)
  const redOffsets = calculateOffsets('red');
  const redChannelEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // TranslateX animation (breathe out and back)
      { key: 'translateX', val: redOffsets.xStart, prog: 0 },
      { key: 'translateX', val: redOffsets.xPeak, prog: 0.5 },
      { key: 'translateX', val: redOffsets.xStart, prog: 1 },
      // TranslateY animation (breathe out and back)
      { key: 'translateY', val: redOffsets.yStart, prog: 0 },
      { key: 'translateY', val: redOffsets.yPeak, prog: 0.5 },
      { key: 'translateY', val: redOffsets.yStart, prog: 1 },
      // Hue rotation for red channel (0deg = red)
      { key: 'filter:hue-rotate', val: '0deg', prog: 0 },
      { key: 'filter:hue-rotate', val: '0deg', prog: 0.5 },
      { key: 'filter:hue-rotate', val: '0deg', prog: 1 },
    ],
  };

  // Create green channel effect (hue-rotate 120deg = green)
  const greenOffsets = calculateOffsets('green');
  const greenChannelEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // TranslateX animation (breathe opposite direction)
      { key: 'translateX', val: greenOffsets.xStart, prog: 0 },
      { key: 'translateX', val: greenOffsets.xPeak, prog: 0.5 },
      { key: 'translateX', val: greenOffsets.xStart, prog: 1 },
      // TranslateY animation (breathe opposite direction)
      { key: 'translateY', val: greenOffsets.yStart, prog: 0 },
      { key: 'translateY', val: greenOffsets.yPeak, prog: 0.5 },
      { key: 'translateY', val: greenOffsets.yStart, prog: 1 },
      // Hue rotation for green channel (120deg = green)
      { key: 'filter:hue-rotate', val: '120deg', prog: 0 },
      { key: 'filter:hue-rotate', val: '120deg', prog: 0.5 },
      { key: 'filter:hue-rotate', val: '120deg', prog: 1 },
    ],
  };

  // Create blue channel effect (hue-rotate 240deg = blue)
  const blueOffsets = calculateOffsets('blue');
  const blueChannelEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // TranslateX animation (minimal breathing)
      { key: 'translateX', val: blueOffsets.xStart, prog: 0 },
      { key: 'translateX', val: blueOffsets.xPeak, prog: 0.5 },
      { key: 'translateX', val: blueOffsets.xStart, prog: 1 },
      // TranslateY animation (minimal breathing)
      { key: 'translateY', val: blueOffsets.yStart, prog: 0 },
      { key: 'translateY', val: blueOffsets.yPeak, prog: 0.5 },
      { key: 'translateY', val: blueOffsets.yStart, prog: 1 },
      // Hue rotation for blue channel (240deg = blue)
      { key: 'filter:hue-rotate', val: '240deg', prog: 0 },
      { key: 'filter:hue-rotate', val: '240deg', prog: 0.5 },
      { key: 'filter:hue-rotate', val: '240deg', prog: 1 },
    ],
  };

  // Wrap effects in base effect structure
  const redEffect = {
    id: `rgb-split-red-${targetIds.join('-')}`,
    componentId: 'generic',
    data: redChannelEffect,
  };

  const greenEffect = {
    id: `rgb-split-green-${targetIds.join('-')}`,
    componentId: 'generic',
    data: greenChannelEffect,
  };

  const blueEffect = {
    id: `rgb-split-blue-${targetIds.join('-')}`,
    componentId: 'generic',
    data: blueChannelEffect,
  };

  // Return output structure with all three effects
  return {
    output: {
      childrenData: [
        {
          id: 'rgb-channel-split-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [redEffect, greenEffect, blueEffect],
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
  id: 'rgbChannelSplitEffect',
  title: 'RGB Channel Split Effect (Internal)',
  description:
    'Internal effect preset that generates chromatic aberration by splitting RGB channels with animated offsets. Returns array of 3 generic effects targeting red, green, and blue color channels with configurable intensity, duration, direction, and breathing animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'rgb', 'chromatic-aberration', 'glitch', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    intensity: 10,
    duration: 1000,
    direction: 'horizontal',
    effectStart: 0,
  },
};

// Export preset
export const rgbChannelSplitEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
