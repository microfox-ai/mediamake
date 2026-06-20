/**
 * Typokinetics Aurora Borealis Preset
 *
 * A kinetic typography preset inspired by the aurora borealis (northern lights).
 * Text shimmers with flowing, curtain-like movements and color-shifts through
 * ethereal hues (cyan, magenta, green), recreating the visual layering and glow
 * effects used in post-production to enhance aurora footage.
 *
 * Features:
 * - Gentle vertical wave motion (translateY sine wave)
 * - Gradient color shifting with hue rotation and saturation animation
 * - Pulsing glow effect (textShadow with opacity)
 * - Word-level processing with wave propagation timing offset
 * - 6-8 second loop cycles with ease-in-out smoothing
 * - Ethereal color palette: cyan, magenta, green
 *
 * Use cases:
 * - Creating aurora-inspired kinetic text overlays
 * - Adding ethereal motion to typography
 * - Building animated subtitles with flowing movements
 * - Creating dreamy, atmospheric text effects
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
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption data with word-level timing'),
  font: z
    .string()
    .optional()
    .default('Inter:100')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:100", "Roboto:300")',
    ),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .optional()
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Base text color (used for glow effect)'),
  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .optional()
    .describe('Spacing between words in pixels'),
  waveAmplitude: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe('Amplitude of vertical wave motion in pixels'),
  waveDuration: z
    .number()
    .min(3)
    .max(15)
    .default(6)
    .optional()
    .describe('Duration of wave cycle in seconds'),
  pulseDuration: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .optional()
    .describe('Duration of opacity pulse cycle in seconds'),
  gradientDuration: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .optional()
    .describe('Duration of gradient color shift cycle in seconds'),
  wordOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Time offset between words for wave propagation in seconds'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Intensity of glow effect (0 = no glow, 1 = full glow)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:100',
    fontSize = 64,
    textColor = '#ffffff',
    wordSpacing = 12,
    waveAmplitude = 5,
    waveDuration = 6,
    pulseDuration = 8,
    gradientDuration = 8,
    wordOffset = 0.15,
    glowIntensity = 1,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:100';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionId = `aurora-caption-${captionIndex}`;
      const captionContainerId = `${captionId}-container`;

      // Build word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;
          const wordContainerId = `${wordId}-container`;

          // Calculate staggered timing offset for wave propagation
          const staggerOffset = wordIndex * wordOffset;

          // Build effects for word container (wave motion + opacity pulse)
          const wordContainerEffects = [
            // Vertical wave motion (translateY sine wave)
            {
              id: `${wordId}-wave-motion`,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [wordContainerId],
                type: 'ease-in-out',
                start: staggerOffset, // Stagger start based on word index
                duration: waveDuration,
                loop: true,
                ranges: [
                  { key: 'translateY', val: -waveAmplitude, prog: 0 },
                  { key: 'translateY', val: waveAmplitude, prog: 0.5 },
                  { key: 'translateY', val: -waveAmplitude, prog: 1 },
                ],
              },
            },
            // Opacity pulse
            {
              id: `${wordId}-opacity-pulse`,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [wordContainerId],
                type: 'ease-in-out',
                start: staggerOffset, // Stagger start based on word index
                duration: pulseDuration,
                loop: true,
                ranges: [
                  { key: 'opacity', val: 0.7, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0.7, prog: 1 },
                ],
              },
            },
          ];

          // Build effects for text atom (gradient color shift)
          const textAtomEffects = [
            // Gradient color shift via hue-rotate and saturate
            {
              id: `${wordId}-gradient-shift`,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [wordId],
                type: 'ease-in-out',
                start: staggerOffset, // Stagger start based on word index
                duration: gradientDuration,
                loop: true,
                ranges: [
                  {
                    key: 'filter',
                    val: 'hue-rotate(0deg) saturate(1)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'hue-rotate(180deg) saturate(1.5)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'hue-rotate(360deg) saturate(1)',
                    prog: 1,
                  },
                ],
              },
            },
          ];

          // Word container (for wave motion and opacity pulse)
          const wordContainer: RenderableComponentData = {
            id: wordContainerId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-block',
                style: {
                  marginLeft: wordIndex > 0 ? `${wordSpacing}px` : '0px',
                },
              },
            },
            context: {
              timing: {
                start: 0, // All words start together (sentence-level timing)
                duration: caption.duration, // All words last for full sentence
              },
            },
            effects: wordContainerEffects,
            childrenData: [
              // Text atom
              {
                id: wordId,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: word.text,
                  className: 'font-thin tracking-widest text-transparent bg-clip-text',
                  style: {
                    fontSize: `${fontSize}px`,
                    backgroundImage:
                      'linear-gradient(45deg, #00ffff, #ff00ff, #00ff00)',
                    textShadow:
                      glowIntensity > 0
                        ? `0 0 ${20 * glowIntensity}px currentColor, 0 0 ${40 * glowIntensity}px currentColor`
                        : 'none',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: textColor, // Fallback color
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight
                      ? [fontStyle.fontWeight.toString()]
                      : ['100'],
                    display: 'swap',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: caption.duration,
                  },
                },
                effects: textAtomEffects,
              } as RenderableComponentData,
            ],
          } as RenderableComponentData;

          return wordContainer;
        },
      );

      // Caption container layout
      const captionContainer: RenderableComponentData = {
        id: captionContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-wrap items-center justify-center px-8',
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData;

      return captionContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'aurora-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: captionContainers.length > 0 ? captionContainers[0].id : undefined,
      },
    },
    childrenData: captionContainers,
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
  id: 'typokinetics-aurora-borealis',
  title: 'Typokinetics Aurora Borealis',
  description:
    'Typography preset inspired by aurora borealis with flowing curtain-like movements, ethereal gradient color shifts (cyan, magenta, green), gentle vertical wave motion, and pulsing glow effects. Recreates the visual layering of color-graded aurora footage applied to kinetic text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'aurora',
    'borealis',
    'gradient',
    'wave',
    'glow',
    'curtain',
    'ethereal',
    'color-shift',
    'animated',
    'subtitles',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:100',
    fontSize: 64,
    textColor: '#ffffff',
    wordSpacing: 12,
    waveAmplitude: 5,
    waveDuration: 6,
    pulseDuration: 8,
    gradientDuration: 8,
    wordOffset: 0.15,
    glowIntensity: 1,
  },
};

// Export preset
export const typokineticsAuroraBorealisPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
