/**
 * Poetic Float Typokinetic Preset
 *
 * This preset creates a dreamlike typokinetic effect where text lines float upward
 * with organic, meandering motion - like thoughts rising from the subconscious.
 *
 * Features:
 * - Weightless floating motion with gentle wave pattern (translateY + sine wave translateX)
 * - Opacity fade from 100% to 30% as lines stack higher (fog effect)
 * - Subtle blur increase from 0 to 2px for distant lines
 * - Poetic aesthetic with serif fonts and italic styling
 * - Customizable text array, timing, and visual parameters
 *
 * Use cases:
 * - Poetic content and introspective text
 * - Philosophical quotes and thoughts
 * - Dreamlike narrative sequences
 * - Meditative and contemplative visuals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  textLines: z
    .array(z.string())
    .describe('Array of text lines to display (poetic lines, thoughts, quotes)'),
  fontFamily: z
    .string()
    .default('Merriweather')
    .optional()
    .describe('Font family for text (serif fonts recommended for poetic feel)'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  riseDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration for each line to rise (seconds)'),
  lineDelay: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Delay between each line appearance (seconds)'),
  waveAmplitude: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .optional()
    .describe('Horizontal wave oscillation amplitude (pixels)'),
  fadeOpacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum opacity at the top (0-1)'),
  blurMax: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Maximum blur at the top (pixels)'),
  riseDistance: z
    .number()
    .min(100)
    .max(1000)
    .default(300)
    .optional()
    .describe('Vertical distance lines travel (pixels)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    textLines = ['Thoughts drift like smoke', 'Rising from depths unknown', 'Ephemeral and flowing'],
    fontFamily = 'Merriweather',
    fontSize = 48,
    textColor = '#ffffff',
    riseDuration = 3,
    lineDelay = 0.8,
    waveAmplitude = 30,
    fadeOpacityMin = 0.3,
    blurMax = 2,
    riseDistance = 300,
  } = params;

  // Helper function: Create sine wave translateX effect based on progress
  const createWaveEffect = (
    targetId: string,
    effectStart: number,
    duration: number,
    amplitude: number,
  ): GenericEffectData => {
    // Create keyframes for smooth sine wave motion
    // Use 8 keyframes over the duration to create smooth oscillation
    const keyframeCount = 8;
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const progress = i / keyframeCount;
      // Sine wave: amplitude * sin(progress * 2π * cycles)
      // Using 2 full cycles over the duration for gentle meandering
      const cycles = 2;
      const translateXValue = amplitude * Math.sin(progress * Math.PI * 2 * cycles);

      ranges.push({
        key: 'translateX',
        val: translateXValue,
        prog: progress,
      });
    }

    return {
      type: 'linear',
      start: effectStart,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Create text line components
  const textComponents: RenderableComponentData[] = textLines.map((text, index) => {
    const lineId = `poetic-line-${index}`;
    const lineStart = index * lineDelay;
    const totalLineDuration = riseDuration + (lineDelay * 0.5); // Extend slightly beyond rise

    // Calculate opacity fade (1.0 to fadeOpacityMin)
    const opacityFadeStart = 1.0;
    const opacityFadeEnd = fadeOpacityMin;

    // Calculate blur increase (0 to blurMax)
    const blurStart = 0;
    const blurEnd = blurMax;

    // Create effects for this line
    const effects = [
      // 1. Vertical rise (translateY)
      {
        id: `rise-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: riseDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -riseDistance, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // 2. Horizontal wave oscillation (translateX)
      {
        id: `wave-${lineId}`,
        componentId: 'generic',
        data: createWaveEffect(lineId, 0, riseDuration, waveAmplitude),
      },
      // 3. Opacity fade
      {
        id: `fade-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalLineDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'opacity', val: opacityFadeStart, prog: 0 },
            { key: 'opacity', val: opacityFadeEnd, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // 4. Blur increase
      {
        id: `blur-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalLineDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'filter', val: `blur(${blurStart}px)`, prog: 0 },
            { key: 'filter', val: `blur(${blurEnd}px)`, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ];

    return {
      id: lineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'text-center',
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontStyle: 'italic',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: ['400', '400italic'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: lineStart,
          duration: totalLineDuration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Calculate total duration (last line start + its duration)
  const totalDuration = textLines.length > 0
    ? (textLines.length - 1) * lineDelay + riseDuration + (lineDelay * 0.5)
    : 10;

  // Create inner container that positions text at bottom center
  const innerContainer: RenderableComponentData = {
    id: 'poetic-inner-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col justify-end items-center',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textComponents,
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'poetic-float-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full overflow-hidden',
        style: {
          background: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [innerContainer],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'poetic-float-typokinetic',
  title: 'Poetic Float Typokinetic',
  description:
    'A dreamlike typokinetic preset where text lines float upward with organic wave motion, like thoughts rising from the subconscious. Lines animate with translateY combined with sine-wave translateX oscillation, creating weightless meandering motion. Opacity fades from 100% to 30% as lines stack higher, with subtle blur increasing from 0 to 2px, creating an ethereal fog effect at the top. Perfect for poetic, introspective, or philosophical content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'poetic',
    'float',
    'wave',
    'fade',
    'blur',
    'dreamlike',
    'organic',
    'motion',
    'introspective',
    'philosophical',
  ],
  dependencies: {},
  defaultInputParams: {
    textLines: [
      'Thoughts drift like smoke',
      'Rising from depths unknown',
      'Ephemeral and flowing',
      'Weightless in the void',
      'Fading into memory',
    ],
    fontFamily: 'Merriweather',
    fontSize: 48,
    textColor: '#ffffff',
    riseDuration: 3,
    lineDelay: 0.8,
    waveAmplitude: 30,
    fadeOpacityMin: 0.3,
    blurMax: 2,
    riseDistance: 300,
  },
};

// Export preset
export const poeticFloatTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
