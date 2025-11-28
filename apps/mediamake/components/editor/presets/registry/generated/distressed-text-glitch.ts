/**
 * Distressed Text Glitch Effect Preset
 *
 * INTERNAL EFFECT PRESET:
 * Creates a digital distortion aesthetic for text elements through multi-layer effects:
 * - RGB channel separation (chromatic aberration) for cyan/magenta split
 * - Letter spacing glitches for horizontal displacement
 * - Transform skewing for additional distortion
 *
 * The effect creates brief, snappy glitch moments with spring-based recovery to
 * maintain text readability. Perfect for tech content, cyberpunk aesthetics, or
 * adding digital edge to typography.
 *
 * Features:
 * - Multi-property animation (textShadow, letterSpacing, transform)
 * - Configurable intensity, chroma offset, and frequency
 * - Spring easing for rapid recovery
 * - Optimized for text readability
 *
 * Technical:
 * - Returns THREE separate effects that layer together
 * - RGB split peaks at 20% progress
 * - Letter spacing peaks at 30% progress
 * - Transform skew peaks at 35% progress
 * - Creates cascading glitch aesthetic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the text component to apply glitch effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(0.2)
    .describe('Duration of the glitch effect in seconds'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for the glitch effect (0.1-3)'),
  chromaOffset: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Pixel offset for RGB channel separation (1-10px)'),
  glitchFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Frequency multiplier for glitch occurrence (0.1-5)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID prefix for the effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const glitchIntensity = params.glitchIntensity ?? 1;
  const chromaOffset = params.chromaOffset ?? 2;
  const effectDuration = params.effectDuration ?? 0.2;
  const effectIdPrefix = params.effectId || `distressed-glitch-${params.targetId}`;

  // Effect 1: RGB Channel Separation (Chromatic Aberration)
  const rgbSplitEffect: GenericEffectData = {
    type: 'spring',
    start: params.effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Start: No shadow
      {
        key: 'textShadow',
        val: '0 0 transparent, 0 0 transparent',
        prog: 0,
      },
      // Peak (20%): Maximum RGB separation
      {
        key: 'textShadow',
        val: `${chromaOffset * glitchIntensity}px 0 #0ff, -${chromaOffset * glitchIntensity}px 0 #f0f`,
        prog: 0.2,
      },
      // End: Return to normal
      {
        key: 'textShadow',
        val: '0 0 transparent, 0 0 transparent',
        prog: 1,
      },
    ],
  };

  // Effect 2: Letter Spacing Glitch
  const letterSpacingEffect: GenericEffectData = {
    type: 'spring',
    start: params.effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Start: Normal spacing
      {
        key: 'letterSpacing',
        val: '0em',
        prog: 0,
      },
      // Peak (30%): Expanded spacing
      {
        key: 'letterSpacing',
        val: `${glitchIntensity * 0.05}em`,
        prog: 0.3,
      },
      // End: Return to normal
      {
        key: 'letterSpacing',
        val: '0em',
        prog: 1,
      },
    ],
  };

  // Effect 3: Transform Skew + Translation
  const transformSkewEffect: GenericEffectData = {
    type: 'spring',
    start: params.effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Start: No transform
      {
        key: 'transform',
        val: 'skewX(0deg) translateX(0px)',
        prog: 0,
      },
      // Peak (35%): Maximum skew and displacement
      {
        key: 'transform',
        val: `skewX(${glitchIntensity * 5}deg) translateX(${glitchIntensity * 3}px)`,
        prog: 0.35,
      },
      // End: Return to normal
      {
        key: 'transform',
        val: 'skewX(0deg) translateX(0px)',
        prog: 1,
      },
    ],
  };

  // Create effect objects
  const rgbSplitEffectNode = {
    id: `${effectIdPrefix}-rgb-split`,
    componentId: 'generic',
    data: rgbSplitEffect,
  };

  const letterSpacingEffectNode = {
    id: `${effectIdPrefix}-letter-spacing`,
    componentId: 'generic',
    data: letterSpacingEffect,
  };

  const transformSkewEffectNode = {
    id: `${effectIdPrefix}-transform-skew`,
    componentId: 'generic',
    data: transformSkewEffect,
  };

  // Return output structure
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [
            rgbSplitEffectNode,
            letterSpacingEffectNode,
            transformSkewEffectNode,
          ],
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
  id: 'distressed-text-glitch',
  title: 'Distressed Text Glitch Effect',
  description:
    'An internal effect preset that adds digital distortion aesthetic to text elements through RGB channel separation (chromatic aberration), letter-spacing glitches, and transform skewing. Creates brief, snappy glitch moments with spring-based recovery for optimal readability.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'text',
    'glitch',
    'distortion',
    'rgb-split',
    'chromatic-aberration',
    'cyberpunk',
    'digital',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component',
    effectStart: 0,
    effectDuration: 0.2,
    glitchIntensity: 1,
    chromaOffset: 2,
    glitchFrequency: 1,
  },
};

// Export preset
export const distressedTextGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
