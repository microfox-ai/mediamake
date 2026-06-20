/**
 * Elastic Typokinetic Subtitle Animation Preset
 *
 * Creates dynamic elastic typokinetic effects with squash-stretch animations and skew effects.
 * Words undergo multi-phase transformations mimicking elastic material behavior with complementary
 * skew motion for cartoon-like, energetic captions. Uses cubic-bezier elastic easing for natural
 * bounce and stretch characteristics.
 *
 * Features:
 * - **Multi-Phase Elastic Motion**: Three-phase animation (squash → stretch → settle)
 * - **Squash and Stretch**: Classic animation principle with scaleX/scaleY variations
 * - **Complementary Skew**: Forward lean during squash, back-lean during stretch, straighten on settle
 * - **Elastic Easing**: Custom cubic-bezier(0.68, -0.6, 0.32, 1.6) for bouncy elastic feel
 * - **Staggered Animation**: Words animate sequentially with index-based delays
 * - **Transform-Origin Control**: Bottom-center pivot for proper squash/stretch motion
 * - **Performance Optimized**: Combined transforms, will-change hints, backface-visibility
 *
 * Use cases:
 * - Creating playful, cartoon-like caption animations
 * - Adding dynamic energy to social media content
 * - Building engaging subtitle presentations with personality
 * - Creating energetic motion graphics for youth-oriented content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative to caption start'),
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
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with words'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .describe('Vertical position of captions'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .describe('Delay between word animations in seconds'),

  wordDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.7)
    .describe('Total duration of elastic animation per word in seconds'),

  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Global intensity multiplier for elastic effects'),

  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(12)
    .describe('Gap between words in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 48,
    textColor = '#FFFFFF',
    position = 'bottom',
    staggerDelay = 0.12,
    wordDuration = 0.7,
    impact = 1,
    wordSpacing = 12,
  } = params;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Position class mapping
  const positionClassMap = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  // Calculate phase durations
  const phase1Duration = wordDuration * 0.3; // 0-30% = squash
  const phase2Duration = wordDuration * 0.3; // 30-60% = stretch
  const phase3Duration = wordDuration * 0.4; // 60-100% = settle

  // Create effects for a word
  const createWordEffects = (
    wordId: string,
    wordIndex: number,
    captionImpact: number,
  ): any[] => {
    const effectImpact = impact * captionImpact;
    const wordStart = wordIndex * staggerDelay;

    // Phase 1: Squash (scaleX: 1.05, scaleY: 0.85, skewX: -2deg)
    const phase1Effect = {
      id: `elastic-phase1-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        start: wordStart,
        duration: phase1Duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scaleX', val: 1.05 * effectImpact, prog: 0 },
          { key: 'scaleX', val: 1.05 * effectImpact, prog: 1 },
          { key: 'scaleY', val: 0.85, prog: 0 },
          { key: 'scaleY', val: 0.85, prog: 1 },
          { key: 'skewX', val: -2 * effectImpact, prog: 0 },
          { key: 'skewX', val: -2 * effectImpact, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Phase 2: Stretch (scaleX: 0.95, scaleY: 1.05, skewX: 1deg)
    const phase2Effect = {
      id: `elastic-phase2-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        start: wordStart + phase1Duration,
        duration: phase2Duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scaleX', val: 1.05 * effectImpact, prog: 0 },
          { key: 'scaleX', val: 0.95, prog: 1 },
          { key: 'scaleY', val: 0.85, prog: 0 },
          { key: 'scaleY', val: 1.05 * effectImpact, prog: 1 },
          { key: 'skewX', val: -2 * effectImpact, prog: 0 },
          { key: 'skewX', val: 1 * effectImpact, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Phase 3: Settle (scale: 1.0, skewX: 0deg)
    const phase3Effect = {
      id: `elastic-phase3-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        start: wordStart + phase1Duration + phase2Duration,
        duration: phase3Duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scaleX', val: 0.95, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'scaleY', val: 1.05 * effectImpact, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'skewX', val: 1 * effectImpact, prog: 0 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    return [phase1Effect, phase2Effect, phase3Effect];
  };

  // Build caption components
  const captionComponents: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionImpact = caption.metadata?.impact ?? 1.0;

      // Build word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;
          const wordEffects = createWordEffects(
            wordId,
            wordIndex,
            captionImpact,
          );

          return {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
                transformOrigin: 'bottom center',
                backfaceVisibility: 'hidden',
                willChange: 'transform',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: wordEffects,
          } as RenderableComponentData;
        },
      );

      // Caption container
      return {
        id: `caption-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex ${positionClassMap[position]} justify-center`,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: `caption-words-${captionIndex}`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-wrap items-center',
                style: {
                  gap: `${wordSpacing}px`,
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
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-typokinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-typokinetic-preset',
  title: 'Elastic Typokinetic Subtitle Animation',
  description:
    'Dynamic elastic typokinetic preset featuring squash-stretch animations and skew effects. Words undergo multi-phase transformations mimicking elastic material behavior with complementary skew motion for cartoon-like, energetic captions. Uses cubic-bezier elastic easing for natural bounce and stretch characteristics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'captions',
    'elastic',
    'typokinetic',
    'squash-stretch',
    'skew',
    'animation',
    'bouncy',
    'cartoon',
    'playful',
    'energetic',
  ],
  dependencies: {},
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
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    position: 'bottom',
    staggerDelay: 0.12,
    wordDuration: 0.7,
    impact: 1,
    wordSpacing: 12,
  },
};

// Export preset
export const elasticTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
