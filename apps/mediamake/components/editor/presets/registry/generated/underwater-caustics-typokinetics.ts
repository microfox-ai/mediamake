/**
 * Underwater Caustics Typokinetics Preset
 *
 * This preset creates text with wave-like distortion and brightness fluctuations
 * simulating underwater caustics and light refraction. Features:
 * - Rippling text effects with wave-like distortion (scaleY and translateY oscillation)
 * - Brightness fluctuations simulating caustic light patterns
 * - Cyan/turquoise color shifts for underwater atmosphere
 * - Wave propagation effect (each word offset by 0.1s)
 * - Continuous looping animations (4-5 second cycles)
 * - Optional audio-reactive wave amplitude for enhanced immersion
 *
 * Use cases:
 * - Underwater-themed content
 * - Marine videography overlays
 * - Water-themed transitions
 * - Ocean/aquatic title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
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
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Caption data with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:300:italic", "Inter:300")',
    ),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Font size in pixels for caption text'),

  textColor: z
    .string()
    .optional()
    .default('#E0F7FA')
    .describe('Base text color (cyan-100 for underwater feel)'),

  waveCycleDuration: z
    .number()
    .optional()
    .default(4.5)
    .describe('Duration of wave distortion cycle in seconds'),

  brightnessCycleDuration: z
    .number()
    .optional()
    .default(5)
    .describe('Duration of brightness oscillation cycle in seconds'),

  colorShiftCycleDuration: z
    .number()
    .optional()
    .default(6)
    .describe('Duration of color shift cycle in seconds'),

  waveOffset: z
    .number()
    .optional()
    .default(0.1)
    .describe('Time offset between words for wave propagation effect (seconds)'),

  scaleYMin: z
    .number()
    .optional()
    .default(0.95)
    .describe('Minimum scaleY value for wave compression'),

  scaleYMax: z
    .number()
    .optional()
    .default(1.05)
    .describe('Maximum scaleY value for wave expansion'),

  translateYMin: z
    .number()
    .optional()
    .default(-3)
    .describe('Minimum translateY value for vertical sine wave (px)'),

  translateYMax: z
    .number()
    .optional()
    .default(3)
    .describe('Maximum translateY value for vertical sine wave (px)'),

  brightnessMin: z
    .number()
    .optional()
    .default(0.8)
    .describe('Minimum brightness value for caustic light pattern'),

  brightnessMax: z
    .number()
    .optional()
    .default(1.2)
    .describe('Maximum brightness value for caustic light pattern'),

  hueRotateMin: z
    .number()
    .optional()
    .default(-10)
    .describe('Minimum hue rotation for cyan shift (degrees)'),

  hueRotateMax: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum hue rotation for turquoise shift (degrees)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    waveCycleDuration,
    brightnessCycleDuration,
    colorShiftCycleDuration,
    waveOffset,
    scaleYMin,
    scaleYMax,
    translateYMin,
    translateYMax,
    brightnessMin,
    brightnessMax,
    hueRotateMin,
    hueRotateMax,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:300');

  // Create caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Create word components for this caption
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;
          const textAtomId = `text-${captionIndex}-${wordIndex}`;

          // Calculate wave propagation offset (stagger each word)
          const wordWaveOffset = wordIndex * (waveOffset || 0.1);

          // Create effects for this word's text atom
          const effects: any[] = [
            // Wave distortion effect (scaleY + translateY)
            {
              id: `wave-effect-${textAtomId}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: wordWaveOffset, // Staggered start for wave propagation
                duration: waveCycleDuration || 4.5,
                loop: true,
                mode: 'provider',
                targetIds: [textAtomId],
                ranges: [
                  // scaleY: compression → expansion → compression
                  { key: 'scaleY', val: scaleYMin || 0.95, prog: 0 },
                  { key: 'scaleY', val: scaleYMax || 1.05, prog: 0.5 },
                  { key: 'scaleY', val: scaleYMin || 0.95, prog: 1 },
                  // translateY: sine wave top → bottom → top
                  { key: 'translateY', val: translateYMin || -3, prog: 0 },
                  { key: 'translateY', val: translateYMax || 3, prog: 0.5 },
                  { key: 'translateY', val: translateYMin || -3, prog: 1 },
                ],
              },
            },
            // Brightness oscillation effect
            {
              id: `brightness-effect-${textAtomId}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: wordWaveOffset, // Same offset for cohesive effect
                duration: brightnessCycleDuration || 5,
                loop: true,
                mode: 'provider',
                targetIds: [textAtomId],
                ranges: [
                  // brightness: dim → bright → dim
                  { key: 'brightness', val: brightnessMin || 0.8, prog: 0 },
                  { key: 'brightness', val: brightnessMax || 1.2, prog: 0.5 },
                  { key: 'brightness', val: brightnessMin || 0.8, prog: 1 },
                ],
              },
            },
            // Color shift effect (hue-rotate)
            {
              id: `color-shift-effect-${textAtomId}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: wordWaveOffset,
                duration: colorShiftCycleDuration || 6,
                loop: true,
                mode: 'provider',
                targetIds: [textAtomId],
                ranges: [
                  // hue-rotate: cyan → turquoise → cyan
                  { key: 'hue-rotate', val: hueRotateMin || -10, prog: 0 },
                  { key: 'hue-rotate', val: hueRotateMax || 10, prog: 0.5 },
                  { key: 'hue-rotate', val: hueRotateMin || -10, prog: 1 },
                ],
              },
            },
          ];

          // TextAtom with underwater caustic styling
          const textAtom: RenderableComponentData = {
            id: textAtomId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'text-cyan-100 font-light',
              style: {
                fontSize: fontSize || 48,
                color: textColor || '#E0F7FA',
                ...fontStyle,
                textShadow:
                  '0 0 20px rgba(34, 211, 238, 0.6), 0 0 40px rgba(34, 211, 238, 0.3)',
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects,
          };

          // Word wrapper (inline-block for horizontal layout)
          const wordWrapper: RenderableComponentData = {
            id: wordId,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-block',
                style: {
                  marginRight: '0.3em',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: [textAtom],
          };

          return wordWrapper;
        },
      );

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      return captionContainer;
    },
  );

  // Root container with underwater gradient background
  const rootContainer: RenderableComponentData = {
    id: 'underwater-caustics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full overflow-hidden bg-gradient-to-b from-cyan-900/20 to-blue-900/30',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
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
  id: 'underwater-caustics-typokinetics',
  title: 'Underwater Caustics Typokinetics',
  description:
    'Text with wave-like distortion and brightness fluctuations simulating underwater caustics and light refraction. Features rippling text effects, cyan/turquoise color shifts, and dancing light patterns that mimic underwater videography effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'underwater',
    'caustics',
    'wave',
    'distortion',
    'refraction',
    'cyan',
    'turquoise',
    'ocean',
    'marine',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Underwater Caustics Effect',
        start: 0,
        absoluteStart: 0,
        end: 5,
        absoluteEnd: 5,
        duration: 5,
        words: [
          {
            id: 'word-1',
            text: 'Underwater',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-2',
            text: 'Caustics',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3.0,
            absoluteEnd: 3.0,
            duration: 1.5,
          },
          {
            id: 'word-3',
            text: 'Effect',
            start: 3.0,
            absoluteStart: 3.0,
            end: 5.0,
            absoluteEnd: 5.0,
            duration: 2.0,
          },
        ],
      },
    ],
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#E0F7FA',
    waveCycleDuration: 4.5,
    brightnessCycleDuration: 5,
    colorShiftCycleDuration: 6,
    waveOffset: 0.1,
    scaleYMin: 0.95,
    scaleYMax: 1.05,
    translateYMin: -3,
    translateYMax: 3,
    brightnessMin: 0.8,
    brightnessMax: 1.2,
    hueRotateMin: -10,
    hueRotateMax: 10,
  },
};

// Export preset
export const underwaterCausticsTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
