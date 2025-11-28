/**
 * Precision Kinetic Typography Preset
 *
 * Apple keynote-inspired kinetic typography with precision micro-animations.
 * Text materializes through a combination of opacity and scale (95% → 100%),
 * creating a subtle 'focusing' effect. Keywords scale slightly larger with spring
 * easing, while regular words use ease-out. Letter-spacing animates from 0.08em → 0.01em,
 * mimicking mechanical component tightening. Keywords receive subtle brightness pulses
 * (1 → 1.05 → 1) for emphasis.
 *
 * Features:
 * - **Semantic Weight Detection**: Uses metadata.keyword property to identify keywords
 * - **Differentiated Scale Effects**: Keywords (0.95→1.02→1, spring), regular words (0.95→1, ease-out)
 * - **Precision Opacity Transitions**: 0→1 over 300ms for smooth materialization
 * - **Tracking Contraction Animation**: Letter-spacing 0.08em→0.01em over 500ms
 * - **Keyword Brightness Pulse**: Subtle 1→1.05→1 filter for emphasis
 * - **Responsive Typography**: text-4xl md:text-5xl lg:text-6xl sizing
 * - **Reusable Internal Effect**: 'precision-reveal' effect preset for consistency
 *
 * Use cases:
 * - Technical product videos and software demos
 * - Apple keynote-style presentations
 * - High-end corporate content with engineered motion feel
 * - Professional video content requiring precision typography
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---

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
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing and metadata'),

  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Roboto:600:italic")',
    ),

  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color for all words (hex or rgba)'),

  keywordColor: z
    .string()
    .optional()
    .describe('Optional text color override for keywords (hex or rgba)'),

  effectImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .optional()
    .default(1.0)
    .describe(
      'Global effect intensity multiplier (0.1-3.0). Per-caption metadata.impact overrides this.',
    ),

  position: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical position of captions on screen'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, font, textColor, keywordColor, effectImpact, position } =
    params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:500';
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

  // Position class mapping
  const positionClassMap = {
    top: 'justify-start pt-20',
    center: 'justify-center',
    bottom: 'justify-end pb-20',
  };

  const positionClass = positionClassMap[position];

  // Helper: Create precision reveal effect
  const createPrecisionRevealEffect = (
    word: any,
    wordId: string,
    caption: any,
  ) => {
    const isKeyword =
      caption.metadata?.keyword &&
      word.text.toLowerCase().includes(caption.metadata.keyword.toLowerCase());

    const impact = caption.metadata?.impact ?? effectImpact;

    // Base durations
    const opacityDuration = 0.3 * impact; // 300ms base
    const scaleDuration = isKeyword ? 0.5 * impact : 0.3 * impact;

    const effect = {
      id: `precision-reveal-${wordId}`,
      componentId: 'generic' as const,
      data: {
        type: isKeyword ? ('spring' as const) : ('ease-out' as const),
        start: word.start, // Relative to caption
        duration: scaleDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          // Opacity: 0 → 1
          { key: 'opacity', val: 0, prog: 0 },
          {
            key: 'opacity',
            val: 1,
            prog: isKeyword ? 0.6 : 1,
          },
          // Scale: keyword (0.95 → 1.02 → 1), regular (0.95 → 1)
          { key: 'scale', val: 0.95, prog: 0 },
          {
            key: 'scale',
            val: isKeyword ? 1.02 : 1,
            prog: isKeyword ? 0.5 : 1,
          },
          ...(isKeyword ? [{ key: 'scale', val: 1, prog: 1 }] : []),
        ],
      },
    };

    return effect;
  };

  // Helper: Create tracking contraction effect
  const createTrackingContractionEffect = (word: any, wordId: string) => {
    const effect = {
      id: `tracking-contraction-${wordId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: word.start, // Relative to caption
        duration: 0.5,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'letterSpacing', val: '0.08em', prog: 0 },
          { key: 'letterSpacing', val: '0.01em', prog: 1 },
        ],
      },
    };

    return effect;
  };

  // Helper: Create keyword brightness pulse effect
  const createKeywordBrightnessEffect = (
    word: any,
    wordId: string,
    caption: any,
  ) => {
    const isKeyword =
      caption.metadata?.keyword &&
      word.text.toLowerCase().includes(caption.metadata.keyword.toLowerCase());

    if (!isKeyword) return null;

    const effect = {
      id: `brightness-pulse-${wordId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: word.start, // Relative to caption
        duration: 0.6,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'brightness', val: 1, prog: 0 },
          { key: 'brightness', val: 1.05, prog: 0.5 },
          { key: 'brightness', val: 1, prog: 1 },
        ],
      },
    };

    return effect;
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Build word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;

          const isKeyword =
            caption.metadata?.keyword &&
            word.text
              .toLowerCase()
              .includes(caption.metadata.keyword.toLowerCase());

          const wordColor = isKeyword && keywordColor ? keywordColor : textColor;

          // Create effects
          const precisionRevealEffect = createPrecisionRevealEffect(
            word,
            wordId,
            caption,
          );
          const trackingContractionEffect = createTrackingContractionEffect(
            word,
            wordId,
          );
          const brightnessEffect = createKeywordBrightnessEffect(
            word,
            wordId,
            caption,
          );

          const effects = [
            precisionRevealEffect,
            trackingContractionEffect,
            brightnessEffect,
          ].filter(Boolean);

          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'inline-block',
              style: {
                color: wordColor,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['500'],
                subsets: ['latin'],
              },
            },
            context: {
              timing: {
                start: 0, // All words start together (sentence-level timing)
                duration: caption.duration,
              },
            },
            effects: effects as any[],
          };

          return wordComponent;
        },
      );

      // Words container with flex layout
      const wordsContainer: RenderableComponentData = {
        id: `words-container-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center gap-2',
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

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex items-center justify-center text-4xl md:text-5xl lg:text-6xl font-sans font-medium tracking-wide`,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [wordsContainer],
      };

      return captionContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'precision-kinetic-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex items-center ${positionClass}`,
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'PrecisionKineticTypography',
  title: 'Precision Kinetic Typography',
  description:
    'Apple keynote-inspired kinetic typography with precision micro-animations. Features semantic weight-based scaling (keywords emphasize more), subtle "focusing" effect from 95% to 100% scale, and mechanical letter-spacing contraction. Text materializes with controlled opacity and scale transitions, brightness micro-pulses on keywords, and tracking animations that mimic tightening mechanical components. Designed for high-end technical product videos and software demos with smooth, engineered motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'precision',
    'apple',
    'keynote',
    'technical',
    'product',
    'demo',
    'captions',
    'subtitles',
    'keywords',
    'semantic',
    'micro-animations',
    'tracking',
    'letter-spacing',
    'brightness',
    'scale',
    'spring',
    'engineered',
    'motion-design',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Introducing Precision Typography',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1-0',
            text: 'Introducing',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 0.99,
          },
          {
            id: 'word-1-1',
            text: 'Precision',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.0,
            absoluteEnd: 2.0,
            duration: 1.0,
            confidence: 0.99,
          },
          {
            id: 'word-1-2',
            text: 'Typography',
            start: 2.0,
            absoluteStart: 2.0,
            end: 3.0,
            absoluteEnd: 3.0,
            duration: 1.0,
            confidence: 0.99,
          },
        ],
        metadata: {
          keyword: 'Precision',
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:500',
    textColor: '#ffffff',
    effectImpact: 1.0,
    position: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const PrecisionKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
