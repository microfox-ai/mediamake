/**
 * Parallax Float Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates depth through differential movement speeds, simulating a hovering parallax effect.
 * This generic effect accepts a depth parameter (0-1) that determines how much an element moves
 * relative to a base drift pattern. Elements with lower depth values move less (appear further away),
 * while higher depth values create more movement (appear closer).
 *
 * The effect combines:
 * - Slow horizontal drift (8-second loop) with ease-in-out between -amplitude and +amplitude
 * - Even slower vertical bobbing (6-second loop) with 0.3x horizontal amplitude
 * - Optional blur scaling based on depth to enhance depth perception
 *
 * Advanced Usage:
 * Ideal for creating layered text compositions or image galleries where elements appear to float
 * at different distances from the viewer. Supports staggered delays for multiple targets.
 *
 * Technical Details:
 * - Effect type: Generic with calculated ranges
 * - Properties: translateX, translateY, optional blur
 * - Movement amplitude: baseRadius * depth
 * - Horizontal drift: 8-second loop with ease-in-out
 * - Vertical bob: 6-second loop, smaller amplitude (0.3x horizontal)
 * - Blur calculation: (1 - depth) * blurRange (if enabled)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target with the parallax float effect'),
  depth: z
    .number()
    .min(0)
    .max(1)
    .describe('Depth parameter (0-1) - higher values create more movement (appear closer), lower values create less movement (appear further away)'),
  baseRadius: z
    .number()
    .default(50)
    .describe('Base movement radius in pixels - actual movement is baseRadius * depth'),
  includeDepthBlur: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether to apply blur based on depth to enhance depth perception'),
  blurRange: z
    .array(z.number())
    .length(2)
    .default([0, 10])
    .optional()
    .describe('Blur range [min, max] in pixels - blur = (1 - depth) * (max - min) + min'),
  delay: z
    .number()
    .default(0)
    .optional()
    .describe('Start delay in seconds for staggered application across multiple targets'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate movement amplitude based on depth
  const horizontalAmplitude = params.baseRadius * params.depth;
  const verticalAmplitude = horizontalAmplitude * 0.3;

  // Calculate blur if enabled
  const blurMin = params.blurRange?.[0] ?? 0;
  const blurMax = params.blurRange?.[1] ?? 10;
  const blurValue = params.includeDepthBlur
    ? (1 - params.depth) * (blurMax - blurMin) + blurMin
    : 0;

  // Horizontal drift: 8-second loop with ease-in-out
  // 0s: center (0)
  // 4s: max displacement (+amplitude or -amplitude)
  // 8s: back to center (0)
  const horizontalRanges = [
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateX', val: horizontalAmplitude, prog: 0.25 },
    { key: 'translateX', val: 0, prog: 0.5 },
    { key: 'translateX', val: -horizontalAmplitude, prog: 0.75 },
    { key: 'translateX', val: 0, prog: 1 },
  ];

  // Vertical bob: 6-second loop (relative to 8-second total duration)
  // Smaller amplitude, offset phase for natural motion
  // 0s: center (0)
  // 3s: max up (+verticalAmplitude)
  // 6s: back to center (0)
  // 8s: slightly down for smooth loop
  const verticalRanges = [
    { key: 'translateY', val: 0, prog: 0 },
    { key: 'translateY', val: verticalAmplitude, prog: 0.375 }, // 3s / 8s = 0.375
    { key: 'translateY', val: 0, prog: 0.75 }, // 6s / 8s = 0.75
    { key: 'translateY', val: -verticalAmplitude * 0.3, prog: 0.875 },
    { key: 'translateY', val: 0, prog: 1 },
  ];

  // Blur ranges if enabled
  const blurRanges = params.includeDepthBlur
    ? [
        { key: 'filter', val: `blur(${blurValue}px)`, prog: 0 },
        { key: 'filter', val: `blur(${blurValue}px)`, prog: 1 },
      ]
    : [];

  // Combine all ranges
  const ranges = [...horizontalRanges, ...verticalRanges, ...blurRanges];

  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.delay ?? 0,
    duration: 8, // 8-second loop cycle
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
    loop: true, // Enable looping for continuous parallax
  };

  const effect = {
    id: params.effectId || `parallax-float-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'parallax-float-effect-container',
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

const presetMetadata: PresetMetadata = {
  id: 'parallax-float-effect',
  title: 'Parallax Float Effect',
  description:
    'An internal effect preset that creates depth through differential movement speeds, simulating a hovering parallax effect. Accepts a depth parameter (0-1) that determines movement amplitude relative to a base drift pattern. Lower depth values create less movement (appearing further away), while higher values create more movement (appearing closer). Combines slow horizontal drift with even slower vertical bobbing. Optional blur scaling based on depth enhances depth perception. Ideal for layered text compositions or image galleries where elements appear to float at different distances.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'parallax', 'float', 'depth', 'drift', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    depth: 0.5,
    baseRadius: 50,
    includeDepthBlur: false,
    blurRange: [0, 10],
    delay: 0,
  },
};

export const parallaxFloatEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};