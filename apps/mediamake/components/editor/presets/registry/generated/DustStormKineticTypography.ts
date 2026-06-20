/**
 * Dust Storm Kinetic Typography Preset
 *
 * This preset creates ultra-thin kinetic typography where text dissolves and reforms
 * like particles in a dust storm. Text breaks apart into individual pixels/dots that
 * drift downward while maintaining loose cohesion.
 *
 * Features:
 * - Ultra-thin typography (Inter:100) with ephemeral appearance
 * - Opacity pulsing between 20-60% for barely-there readability
 * - Letter-spacing animations (0 to 0.3em) simulating dispersion
 * - Vertical drift (translateY 0 to 100vh) for downward particle movement
 * - Turbulence effect using composite sine waves for horizontal movement
 * - Mix-blend-mode: screen for ethereal quality
 * - CSS filters (contrast/brightness) for dusty appearance
 * - Word-level timing with natural staggered animations
 *
 * Use cases:
 * - Creating ephemeral, atmospheric text effects
 * - Building dust storm or particle-based typography
 * - Adding chaotic but controlled text animations
 * - Creating video effects with text as particles
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption data with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:100:normal')
    .describe(
      'Font family with weight and style (e.g., "Inter:100:normal" for ultra-thin)',
    ),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Base text color (applied with low opacity via text-white/20)'),

  opacityMin: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.2)
    .describe('Minimum opacity in pulse cycle (0-1)'),

  opacityMax: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.6)
    .describe('Maximum opacity in pulse cycle (0-1)'),

  letterSpacingMax: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Maximum letter spacing in em units (0-1)'),

  turbulenceIntensity: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .default(10)
    .describe('Intensity of horizontal turbulence effect (pixels)'),

  verticalDriftSpeed: z
    .number()
    .min(0)
    .max(200)
    .optional()
    .default(100)
    .describe('Vertical drift speed as percentage of viewport height'),

  contrast: z
    .number()
    .min(0.5)
    .max(2)
    .optional()
    .default(1.2)
    .describe('CSS filter contrast value (0.5-2)'),

  brightness: z
    .number()
    .min(0.5)
    .max(2)
    .optional()
    .default(0.8)
    .describe('CSS filter brightness value (0.5-2)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    textColor,
    opacityMin,
    opacityMax,
    letterSpacingMax,
    turbulenceIntensity,
    verticalDriftSpeed,
    contrast,
    brightness,
  } = params;

  // Parse font string (format: "FontName:weight:style")
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] || '100';
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(font || 'Inter:100:normal');

  // Build caption containers with word-level components
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `dust-storm-caption-${captionIndex}`;

    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;

      // Create word text atom
      const wordAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontWeight: fontConfig.weight,
            fontStyle: fontConfig.style,
            mixBlendMode: 'screen',
            filter: `contrast(${contrast}) brightness(${brightness})`,
          },
          className: 'text-white/20',
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          // Opacity pulse effect (oscillating 0.2 to 0.6)
          {
            id: `${wordId}-opacity-pulse`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: opacityMin, prog: 0 },
                { key: 'opacity', val: opacityMax, prog: 0.25 },
                { key: 'opacity', val: opacityMin + (opacityMax - opacityMin) * 0.5, prog: 0.5 },
                { key: 'opacity', val: opacityMax * 0.8, prog: 0.75 },
                { key: 'opacity', val: opacityMin, prog: 1 },
              ],
            },
          },
          // Letter spacing dispersion effect (0 to 0.3em)
          {
            id: `${wordId}-letter-spacing`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'letterSpacing', val: '0em', prog: 0 },
                { key: 'letterSpacing', val: `${letterSpacingMax}em`, prog: 1 },
              ],
            },
          },
          // Vertical drift effect (0 to 100vh)
          {
            id: `${wordId}-vertical-drift`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: `${verticalDriftSpeed}vh`, prog: 1 },
              ],
            },
          },
          // Turbulence effect using composite sine waves
          {
            id: `${wordId}-turbulence`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Using formula: Math.sin(time*2) * 10 + Math.sin(time*3) * 5
                // We approximate this with keyframes at different progress points
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: turbulenceIntensity * 0.8, prog: 0.125 },
                { key: 'translateX', val: turbulenceIntensity * 0.4, prog: 0.25 },
                { key: 'translateX', val: -turbulenceIntensity * 0.3, prog: 0.375 },
                { key: 'translateX', val: -turbulenceIntensity * 0.9, prog: 0.5 },
                { key: 'translateX', val: -turbulenceIntensity * 0.5, prog: 0.625 },
                { key: 'translateX', val: turbulenceIntensity * 0.2, prog: 0.75 },
                { key: 'translateX', val: turbulenceIntensity * 0.7, prog: 0.875 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      wordComponents.push(wordAtom);
    });

    // Create word wrapper container with flex layout
    const wordWrapperContainer: RenderableComponentData = {
      id: `${captionId}-word-wrapper`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center relative',
          style: {
            gap: '0.5em',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-center w-full h-full absolute inset-0',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [wordWrapperContainer],
    };

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dust-storm-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center w-full h-full absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: captionContainers,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'DustStormKineticTypography',
  title: 'Dust Storm Kinetic Typography',
  description:
    'Ultra-thin kinetic typography preset where text dissolves and reforms like particles in a dust storm. Features ephemeral text with opacity pulsing (20-60%), chaotic but controlled movement with turbulence effects using composite sine waves, letter-spacing animations simulating dispersion, and vertical drift creating the illusion of text carried by invisible air currents. Uses caption word-level timing for precise synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'dust-storm',
    'particles',
    'ephemeral',
    'captions',
    'turbulence',
    'dispersion',
    'drift',
    'atmospheric',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Dust storm effect',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Dust',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'storm',
            start: 1,
            end: 2,
            duration: 1,
            absoluteStart: 1,
            absoluteEnd: 2,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'effect',
            start: 2,
            end: 3,
            duration: 1,
            absoluteStart: 2,
            absoluteEnd: 3,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Inter:100:normal',
    textColor: '#FFFFFF',
    opacityMin: 0.2,
    opacityMax: 0.6,
    letterSpacingMax: 0.3,
    turbulenceIntensity: 10,
    verticalDriftSpeed: 100,
    contrast: 1.2,
    brightness: 0.8,
  },
};

// Export preset
export const DustStormKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
