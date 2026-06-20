
/**
 * Shimmer Wave Typography Preset
 *
 * This preset creates a kinetic typography effect where each word appears with a shimmer
 * effect that ripples through individual characters. Each letter catches light sequentially,
 * creating a wave of illumination passing through the text. The effect emphasizes important
 * words with stronger shimmer intensity.
 *
 * Features:
 * - Word-level timing based on caption data (words array)
 * - Character-by-character shimmer cascade with staggered delays
 * - Organic fluid shimmer effect (opacity + brightness animation)
 * - Enhanced shimmer for important words (detected via metadata or keyword matching)
 * - Configurable shimmer duration, intensity, and character delay
 * - Font customization with weight and style support
 * - Flexible layout with adjustable word spacing
 *
 * Use cases:
 * - Title sequences with dramatic reveals
 * - Emphasis on key phrases in video content
 * - Elegant text animations for presentations
 * - Social media content with eye-catching typography
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

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
        metadata: z
          .object({
            keyword: z.string().optional(),
            isImportant: z.boolean().optional(),
            isKeyword: z.boolean().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Roboto:700:italic")',
    ),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color in hex or rgba format'),

  wordSpacing: z
    .number()
    .optional()
    .default(0.5)
    .describe('Gap between words in em units'),

  characterDelay: z
    .number()
    .optional()
    .default(0.05)
    .describe('Delay between character animations in seconds'),

  shimmerDuration: z
    .number()
    .optional()
    .default(0.3)
    .describe('Duration of shimmer effect per character in seconds'),

  normalBrightness: z
    .number()
    .optional()
    .default(1.5)
    .describe('Peak brightness for normal words (1.0 = 100%)'),

  importantBrightness: z
    .number()
    .optional()
    .default(2.0)
    .describe('Peak brightness for important words (1.0 = 100%)'),

  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical position of text container'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:500';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 500; // Default medium weight
  }

  // Helper: Check if word is important
  const isImportantWord = (
    word: string,
    caption: TranscriptionSentence,
  ): boolean => {
    if (!caption.metadata) return false;

    // Check metadata flags
    if (caption.metadata.isImportant || caption.metadata.isKeyword) {
      return true;
    }

    // Check if word matches keyword
    if (caption.metadata.keyword) {
      const keyword = caption.metadata.keyword.toLowerCase();
      const wordLower = word.toLowerCase();
      return wordLower === keyword || wordLower.includes(keyword);
    }

    return false;
  };

  // Build caption structure
  const captionsData: RenderableComponentData[] = [];

  params.captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;

    // Build word containers
    const wordContainers: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const isImportant = isImportantWord(word.text, caption);
      const peakBrightness = isImportant
        ? params.importantBrightness
        : params.normalBrightness;

      // Split word into characters
      const characters = word.text.split('');
      const characterComponents: RenderableComponentData[] = [];

      characters.forEach((char, charIndex) => {
        const charId = `${wordId}-char-${charIndex}`;
        const effectStart = charIndex * params.characterDelay;

        // Create shimmer effect for character
        const shimmerEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: effectStart,
          duration: params.shimmerDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            // Opacity animation (0 → 1 → 1)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
            // Brightness animation (100% → peak → 100%)
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: peakBrightness, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        };

        characterComponents.push({
          id: charId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: `${params.fontSize}px`,
              color: params.textColor,
              opacity: 0,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['500'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `shimmer-${charId}`,
              componentId: 'generic',
              data: shimmerEffect,
            },
          ],
        } as RenderableComponentData);
      });

      // Create word container with inline-flex layout
      wordContainers.push({
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex',
            style: {
              marginRight: `${params.wordSpacing}em`,
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData);
    });

    // Create caption container
    captionsData.push({
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap gap-2 font-medium tracking-wide',
          style: {
            justifyContent: 'center',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordContainers,
    } as RenderableComponentData);
  });

  // Determine container alignment class
  const alignmentClass =
    params.containerPosition === 'top'
      ? 'items-start'
      : params.containerPosition === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'shimmer-wave-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex justify-center ${alignmentClass}`,
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionsData,
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
  id: 'shimmer-wave-typography',
  title: 'Shimmer Wave Typography',
  description:
    'Kinetic typography preset where each word appears with a shimmer effect that ripples through individual characters. Characters emerge from darkness into light with a luminous wave effect. Important words receive enhanced brightness peaks for emphasis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'shimmer',
    'wave',
    'captions',
    'text',
    'animation',
    'luminous',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'World',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 0.98,
          },
        ],
        metadata: {
          keyword: 'Hello',
          isImportant: true,
        },
      },
    ],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#ffffff',
    wordSpacing: 0.5,
    characterDelay: 0.05,
    shimmerDuration: 0.3,
    normalBrightness: 1.5,
    importantBrightness: 2.0,
    containerPosition: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const shimmerWaveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
