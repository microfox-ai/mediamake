/**
 * Venetian Blinds Typography Transition Preset
 *
 * A typography-driven Venetian blinds transition where each blind contains animated text/words from captions.
 * Words slide and rotate from stacked vertical positions (closed blinds) into reading position (open blinds)
 * with font-weight animations synchronized to word importance/impact scores and letter-spacing animations
 * that expand as words settle into place.
 *
 * Features:
 * - **Caption Word Mapping**: Maps caption words to individual blinds (max 15 blinds)
 * - **Stacked Vertical Animation**: Words start stacked vertically (like closed blinds) then slide into reading position
 * - **Rotation Effect**: RotateX from 90deg to 0deg creates flip/reveal effect
 * - **Font Weight Animation**: Weight animates from 100 to 900 based on word.metadata.impact or default impact
 * - **Letter Spacing Animation**: Expands from -0.05em to 0.02em as words settle
 * - **Precise Timing**: Word-level timing with 50ms cascade for visual flow
 * - **Flexible Font Configuration**: Uses "FontFamily:weight:style" string format for font selection
 *
 * Use cases:
 * - Creating dynamic kinetic typography videos
 * - Building impactful word-by-word reveals
 * - Creating dramatic caption presentations
 * - Adding emphasis to important words in captions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Unique caption identifier'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Caption start time (relative to caption timeline)'),
        end: z.number().describe('Caption end time (relative)'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z.number().describe('Word start time (relative to caption)'),
              end: z.number().describe('Word end time (relative)'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z.number().describe('Absolute start in caption timeline'),
              absoluteEnd: z.number().describe('Absolute end in caption timeline'),
            }),
          )
          .describe('Array of word objects'),
        metadata: z
          .object({
            impact: z
              .number()
              .optional()
              .describe('Word importance/impact score (0.1 - 3.0)'),
          })
          .optional()
          .describe('Caption metadata for typography customization'),
      }),
    )
    .describe('Array of caption objects with word-level timing'),
  font: z
    .string()
    .default('Inter:400')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z.number().default(48).describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  maxBlinds: z
    .number()
    .default(15)
    .describe('Maximum number of blinds/words to display'),
  cascadeDelay: z
    .number()
    .default(0.05)
    .describe('Delay between each blind animation in seconds'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of blind transition animation'),
  defaultImpact: z
    .number()
    .default(1.0)
    .describe('Default impact multiplier for font weight animation (0.1 - 3.0)'),
  lineHeight: z
    .number()
    .default(1.5)
    .describe('Line height multiplier for stacked positioning'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    maxBlinds,
    cascadeDelay,
    transitionDuration,
    defaultImpact,
    lineHeight,
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
        fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Extract all words from captions
  const allWords: Array<{
    text: string;
    captionId: string;
    wordIndex: number;
    timing: {
      start: number;
      duration: number;
      absoluteStart: number;
    };
    impact: number;
  }> = [];

  captions.forEach(caption => {
    const captionImpact = caption.metadata?.impact ?? defaultImpact;
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        text: word.text,
        captionId: caption.id,
        wordIndex,
        timing: {
          start: word.start,
          duration: word.duration,
          absoluteStart: word.absoluteStart,
        },
        impact: captionImpact,
      });
    });
  });

  // Limit to maxBlinds
  const selectedWords = allWords.slice(0, maxBlinds);

  if (selectedWords.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Calculate container duration (latest word end time)
  const containerDuration = Math.max(
    ...selectedWords.map(w => w.timing.absoluteStart + w.timing.duration),
  );

  // Calculate line height in pixels
  const lineHeightPx = fontSize * lineHeight;

  // Create blind components (one per word)
  const blindComponents: RenderableComponentData[] = selectedWords.map(
    (wordData, index) => {
      const wordId = `blind-word-${wordData.captionId}-${wordData.wordIndex}`;
      const startTime = wordData.timing.absoluteStart + index * cascadeDelay;

      // Calculate initial stacked position (negative translateY)
      const stackedPosition = -lineHeightPx * (selectedWords.length - index);

      // Calculate font weight based on impact (100 to 900)
      const minWeight = 100;
      const maxWeight = 900;
      const fontWeight = Math.min(
        maxWeight,
        Math.max(minWeight, minWeight + wordData.impact * (maxWeight - minWeight)),
      );

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: wordData.text,
          className: 'absolute w-full flex items-center justify-center text-center',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['400'],
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: containerDuration - startTime,
          },
        },
        effects: [
          // TranslateY: from stacked position to 0
          {
            id: `translateY-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateY', val: stackedPosition, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
          // RotateX: flip effect (90deg to 0deg)
          {
            id: `rotateX-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'rotateX', val: 90, prog: 0 },
                { key: 'rotateX', val: 0, prog: 1 },
              ],
            },
          },
          // Font weight animation (starts slightly after movement)
          {
            id: `fontWeight-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionDuration * 0.3,
              duration: transitionDuration * 0.7,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                {
                  key: 'fontVariationSettings',
                  val: `'wght' ${minWeight}`,
                  prog: 0,
                },
                {
                  key: 'fontVariationSettings',
                  val: `'wght' ${fontWeight}`,
                  prog: 1,
                },
              ],
            },
          },
          // Letter spacing animation (expands as word settles)
          {
            id: `letterSpacing-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: transitionDuration * 0.5,
              duration: transitionDuration * 0.5,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'letterSpacing', val: '-0.05em', prog: 0 },
                { key: 'letterSpacing', val: '0.02em', prog: 1 },
              ],
            },
          },
          // Opacity fade-in
          {
            id: `opacity-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: 0.2,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: blindComponents,
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
  id: 'venetian-blinds-typography',
  title: 'Venetian Blinds Typography Transition',
  description:
    'Typography-driven Venetian blinds transition where each blind contains animated text/words from captions. Words slide and rotate from stacked vertical positions into reading position with font-weight and letter-spacing animations synchronized to audio timing and word impact scores.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'kinetic',
    'blinds',
    'transition',
    'animated-text',
    'word-reveal',
    'font-weight',
    'letter-spacing',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world example',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            text: 'Hello',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            text: 'world',
            start: 0.8,
            end: 1.6,
            duration: 0.8,
            absoluteStart: 0.8,
            absoluteEnd: 1.6,
          },
          {
            text: 'example',
            start: 1.6,
            end: 2.5,
            duration: 0.9,
            absoluteStart: 1.6,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:400',
    fontSize: 48,
    textColor: '#ffffff',
    maxBlinds: 15,
    cascadeDelay: 0.05,
    transitionDuration: 0.6,
    defaultImpact: 1.0,
    lineHeight: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindsTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
