/**
 * Binary Scramble Text Effect Preset
 *
 * This internal effect preset simulates data corruption at the character level by applying:
 * - Letter-spacing animation (0-5px expansion/contraction)
 * - fontSize micro-adjustments (98%-102% via scale for instability)
 * - Random multi-shadow text glitches in customizable colors (red/green/blue by default)
 *
 * Features:
 * - Organic corruption flow with ease-in-out easing
 * - Configurable scramble intensity (affects all parameters)
 * - Configurable shadow count (1-5 shadows)
 * - Customizable color palette for glitch shadows
 * - Targets text elements via provider mode
 *
 * Use cases:
 * - Creating digital glitch/corruption effects on text
 * - Simulating data transmission errors
 * - Adding cyberpunk/tech aesthetic to typography
 * - Creating unstable/corrupted text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the text component to target'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the effect in seconds'),
  scrambleIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe(
      'Intensity multiplier for all scramble effects (0.1-3, default: 1)',
    ),
  shadowCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .optional()
    .describe('Number of text shadows to generate (1-5, default: 3)'),
  colorPalette: z
    .array(z.string())
    .default(['#ff0000', '#00ff00', '#0000ff'])
    .optional()
    .describe(
      'Array of hex colors for glitch shadows (default: red/green/blue)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const intensity = params.scrambleIntensity ?? 1;
  const shadowCount = params.shadowCount ?? 3;
  const colorPalette = params.colorPalette ?? [
    '#ff0000',
    '#00ff00',
    '#0000ff',
  ];
  const duration = params.effectDuration;

  // Helper function to generate random text-shadow values
  const generateTextShadow = (
    count: number,
    maxOffset: number,
    colors: string[],
  ): string => {
    const shadows: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * maxOffset * 2 - maxOffset).toFixed(1);
      const y = (Math.random() * maxOffset * 2 - maxOffset).toFixed(1);
      const blur = (Math.random() * 4).toFixed(1);
      const color = colors[i % colors.length];
      shadows.push(`${x}px ${y}px ${blur}px ${color}`);
    }
    return shadows.join(', ');
  };

  // Letter-spacing effect (0-5px with expansion/contraction)
  const letterSpacingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      { key: 'letterSpacing', val: '0px', prog: 0 },
      { key: 'letterSpacing', val: `${3 * intensity}px`, prog: 0.3 },
      { key: 'letterSpacing', val: `${5 * intensity}px`, prog: 0.5 },
      { key: 'letterSpacing', val: `${2 * intensity}px`, prog: 0.7 },
      { key: 'letterSpacing', val: '0px', prog: 1 },
    ],
  };

  // FontSize instability (98%-102% via scale)
  const fontSizeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      {
        key: 'scale',
        val: 1 + 0.02 * intensity,
        prog: 0.15,
      },
      {
        key: 'scale',
        val: 1 - 0.02 * intensity,
        prog: 0.35,
      },
      {
        key: 'scale',
        val: 1 + 0.01 * intensity,
        prog: 0.6,
      },
      {
        key: 'scale',
        val: 1 - 0.01 * intensity,
        prog: 0.8,
      },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Text-shadow glitch effect with random positions
  const maxOffset = 8 * intensity;
  const textShadowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      { key: 'textShadow', val: 'none', prog: 0 },
      {
        key: 'textShadow',
        val: generateTextShadow(shadowCount, maxOffset * 0.5, colorPalette),
        prog: 0.25,
      },
      {
        key: 'textShadow',
        val: generateTextShadow(shadowCount, maxOffset, colorPalette),
        prog: 0.5,
      },
      {
        key: 'textShadow',
        val: generateTextShadow(shadowCount, maxOffset * 0.7, colorPalette),
        prog: 0.75,
      },
      { key: 'textShadow', val: 'none', prog: 1 },
    ],
  };

  // Create effect nodes
  const effects = [
    {
      id: `${params.effectId || 'binary-scramble'}-letter-spacing-${params.targetId}`,
      componentId: 'generic',
      data: letterSpacingEffect,
    },
    {
      id: `${params.effectId || 'binary-scramble'}-font-size-${params.targetId}`,
      componentId: 'generic',
      data: fontSizeEffect,
    },
    {
      id: `${params.effectId || 'binary-scramble'}-text-shadow-${params.targetId}`,
      componentId: 'generic',
      data: textShadowEffect,
    },
  ];

  return {
    output: {
      childrenData: [
        {
          id: 'binary-scramble-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration + params.effectStart,
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
  id: 'binaryScrambleTextEffect',
  title: 'Binary Scramble Text Effect',
  description:
    'Simulates data corruption at character level with letter-spacing (0-5px), fontSize micro-adjustments (98%-102%), and multi-shadow glitches in customizable colors',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'text',
    'glitch',
    'corruption',
    'scramble',
    'generic',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-1',
    effectStart: 0,
    effectDuration: 0.6,
    scrambleIntensity: 1,
    shadowCount: 3,
    colorPalette: ['#ff0000', '#00ff00', '#0000ff'],
  },
};

export const binaryScrambleTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};