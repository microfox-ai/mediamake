/**
 * Morning Mist Typokinetics Preset
 *
 * This preset creates a minimalist typokinetic animation where words materialize
 * like morning mist clearing. Each word starts completely transparent and slightly
 * displaced upward, then settles into position while gaining opacity.
 *
 * Features:
 * - **Subtle Fade-In**: Words transition from opacity 0 to 1 with luxurious easing
 * - **Upward Displacement**: Words start at translateY: -10px and settle to 0
 * - **Letter-Spacing Condensation**: Letter spacing expands from 0.05em to 0.02em
 * - **Sequential Timing**: Words appear one at a time with no overlap
 * - **Generous Padding**: 64px padding creates breathing room and negative space
 * - **GPU Optimization**: Uses will-change for transform and opacity
 * - **Lightweight Typography**: Inter:300 for elegant, minimal aesthetic
 *
 * Use cases:
 * - Poetic or contemplative content requiring slow, deliberate pacing
 * - Luxury brand videos with minimalist aesthetics
 * - Meditation or wellness content with calm, centered typography
 * - High-end product reveals with sophisticated motion design
 * - Art gallery or museum content with refined presentation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

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
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family to use (format: "FontName:weight:style" or "FontName:weight" or "FontName")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (CSS color format)'),

  animationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of each word fade-in animation in seconds'),

  verticalDisplacement: z
    .number()
    .min(-50)
    .max(50)
    .default(-10)
    .describe('Initial vertical displacement in pixels (negative = upward)'),

  initialLetterSpacing: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Initial letter spacing in em units'),

  finalLetterSpacing: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.02)
    .describe('Final letter spacing in em units'),

  containerPadding: z
    .number()
    .min(0)
    .max(200)
    .default(64)
    .describe('Container padding in pixels for generous negative space'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
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

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Build caption containers
  const captionContainers: RenderableComponentData[] = params.captions.map(
    (caption: TranscriptionSentence) => {
      // Create word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `mist-word-${caption.id}-${wordIndex}`;

          // Create mist fade effect for this word
          const mistEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: word.start, // Relative to caption start
            duration: params.animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Opacity: 0 -> 1
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // TranslateY: displacement -> 0
              { key: 'translateY', val: params.verticalDisplacement, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              // Letter spacing: initial -> final (condensing effect)
              {
                key: 'letterSpacing',
                val: `${params.initialLetterSpacing}em`,
                prog: 0,
              },
              {
                key: 'letterSpacing',
                val: `${params.finalLetterSpacing}em`,
                prog: 1,
              },
            ],
          };

          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: fontStyle.fontWeight || 300,
                fontStyle: fontStyle.fontStyle || 'normal',
                marginRight: '0.3em',
                willChange: 'transform, opacity',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['300'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration, // All words use sentence duration
              },
            },
            effects: [
              {
                id: `mist-effect-${wordId}`,
                componentId: 'generic',
                data: mistEffect,
              },
            ],
          };

          return wordComponent;
        },
      );

      // Create caption container
      const captionContainer: RenderableComponentData = {
        id: `mist-caption-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `relative w-full h-full p-${params.containerPadding} flex flex-row flex-wrap items-center justify-center`,
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'mist-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
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

const presetMetadata: PresetMetadata = {
  id: 'mist-typokinetics',
  title: 'Morning Mist Typokinetics',
  description:
    'Minimalist typokinetic preset where words materialize like morning mist clearing. Each word fades in with subtle upward displacement and letter-spacing condensation, creating deliberate pacing with luxurious easing and generous negative space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typography',
    'typokinetics',
    'minimalist',
    'mist',
    'fade',
    'luxury',
    'elegant',
    'slow',
    'deliberate',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Words emerge like mist',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Words',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-2',
            text: 'emerge',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 1.0,
          },
          {
            id: 'word-3',
            text: 'like',
            start: 1.8,
            absoluteStart: 1.8,
            end: 2.2,
            absoluteEnd: 2.2,
            duration: 0.4,
          },
          {
            id: 'word-4',
            text: 'mist',
            start: 2.2,
            absoluteStart: 2.2,
            end: 3,
            absoluteEnd: 3,
            duration: 0.8,
          },
        ],
      },
    ],
    fontFamily: 'Inter:300',
    fontSize: 48,
    textColor: '#1a1a1a',
    animationDuration: 1.2,
    verticalDisplacement: -10,
    initialLetterSpacing: 0.05,
    finalLetterSpacing: 0.02,
    containerPadding: 64,
  },
};

export const mistTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: JSON.parse(JSON.stringify(z.toJSONSchema(presetParams))),
};
