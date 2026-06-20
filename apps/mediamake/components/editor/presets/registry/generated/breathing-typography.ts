/**
 * Breathing Typography - Vocal Emphasis Animation
 *
 * This preset creates floating subtitles with breathing animations that simulate vocal emphasis.
 * Each word scales independently, creating an organic, living text effect that visualizes
 * vocal dynamics like a sound engineer would see peaks and valleys.
 *
 * Features:
 * - **Breathing Animation**: Words scale up (inhale) and down (exhale) with sine-wave easing
 * - **Dual Intensity Levels**: Keywords/high-impact words breathe stronger (1.0-1.3), regular words subtle (1.0-1.1)
 * - **Wave Effect**: Staggered animation timing creates left-to-right wave propagation
 * - **Independent Scaling**: Each word scales without affecting neighboring positions
 * - **Synchronized Glow**: High-impact words get pulsing glow effect in sync with breathing
 * - **GPU Optimized**: Uses transform-gpu and will-change for smooth performance
 *
 * Use cases:
 * - Creating vocal emphasis visualizations
 * - Building dynamic subtitle presentations for music/poetry
 * - Adding organic, living text effects to lyrical content
 * - Visualizing audio dynamics through text animation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
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
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight (e.g., "Inter:600", "Roboto:700")'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or CSS color)'),
  regularImpact: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Impact multiplier for regular words (affects scale amplitude)'),
  keywordImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.3)
    .describe('Impact multiplier for keywords/high-impact words (affects scale amplitude)'),
  breathingDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of one breathing cycle in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .describe('Delay between word animations in seconds (creates wave effect)'),
  glowEnabled: z
    .boolean()
    .default(true)
    .describe('Enable synchronized glow effect for high-impact words'),
  wordSpacing: z
    .number()
    .min(0)
    .max(40)
    .default(8)
    .describe('Gap between words in pixels'),
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .describe('Horizontal padding of the container in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    regularImpact,
    keywordImpact,
    breathingDuration,
    staggerDelay,
    glowEnabled,
    wordSpacing,
    containerPadding,
  } = params;

  // Parse font string (format: "FontName:weight")
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontWeight = font.includes(':') ? parseInt(font.split(':')[1], 10) : 600;

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `breathing-caption-${captionIndex}`;

    // Determine if caption is high-impact based on metadata
    const isHighImpact = caption.metadata?.impact
      ? caption.metadata.impact > 1.2
      : false;
    const keyword = caption.metadata?.keyword;

    // Build word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const isKeyword = keyword && word.text.toLowerCase().includes(keyword.toLowerCase());
      const impactLevel = isKeyword || isHighImpact ? keywordImpact : regularImpact;

      // Calculate scale range based on impact
      const minScale = 1.0;
      const maxScale = isKeyword || isHighImpact
        ? 1.0 + 0.3 * impactLevel
        : 1.0 + 0.1 * impactLevel;

      // Calculate staggered start time based on word index
      const staggeredStart = wordIndex * staggerDelay;

      // Create breathing scale effect
      const scaleEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: staggeredStart,
        duration: breathingDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: minScale, prog: 0 },
          { key: 'scale', val: maxScale, prog: 0.5 },
          { key: 'scale', val: minScale, prog: 1 },
        ],
      };

      // Create glow effect for high-impact words (synchronized with breathing)
      let glowEffect: GenericEffectData | null = null;
      if (glowEnabled && (isKeyword || isHighImpact)) {
        const baseBlur = 20;
        const maxBlur = 40;

        glowEffect = {
          type: 'ease-in-out',
          start: staggeredStart,
          duration: breathingDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'filter', val: `drop-shadow(0 0 ${baseBlur}px rgba(255,255,255,0.3))`, prog: 0 },
            { key: 'filter', val: `drop-shadow(0 0 ${maxBlur}px rgba(255,255,255,0.6))`, prog: 0.5 },
            { key: 'filter', val: `drop-shadow(0 0 ${baseBlur}px rgba(255,255,255,0.3))`, prog: 1 },
          ],
        };
      }

      // Build effects array
      const effects: any[] = [
        {
          id: `${wordId}-scale`,
          componentId: 'generic',
          data: scaleEffect,
        },
      ];

      if (glowEffect) {
        effects.push({
          id: `${wordId}-glow`,
          componentId: 'generic',
          data: glowEffect,
        });
      }

      // Word wrapper (enables independent scaling)
      return {
        id: wordId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block transform-gpu',
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
        childrenData: [
          {
            id: `${wordId}-text`,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
                display: 'swap',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    });

    // Caption container (horizontal flex layout for word flow)
    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-wrap items-center justify-center',
          style: {
            gap: `${wordSpacing}px`,
            paddingLeft: `${containerPadding}px`,
            paddingRight: `${containerPadding}px`,
          },
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
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'breathing-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'auto',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers,
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
  id: 'breathingTypography',
  title: 'Breathing Typography - Vocal Emphasis Animation',
  description:
    'Typography preset that simulates vocal emphasis through gentle breathing animations on individual words. Each word scales independently based on emphasis level - keywords/high-impact words breathe with stronger amplitude (1.0-1.3 scale), while regular words pulse subtly (1.0-1.1 scale). Uses sine-wave easing with staggered timing to create a natural wave effect across the text, visualizing vocal dynamics like a sound engineer would see peaks and valleys.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'subtitles',
    'breathing',
    'vocal-emphasis',
    'organic',
    'wave-effect',
    'scale-animation',
    'glow',
    'kinetic',
    'lyrical',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'This is a breathing text effect',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'This',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'is',
            start: 0.5,
            absoluteStart: 0.5,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.3,
          },
          {
            id: 'word-3',
            text: 'a',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.2,
          },
          {
            id: 'word-4',
            text: 'breathing',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.8,
          },
          {
            id: 'word-5',
            text: 'text',
            start: 1.8,
            absoluteStart: 1.8,
            end: 2.3,
            absoluteEnd: 2.3,
            duration: 0.5,
          },
          {
            id: 'word-6',
            text: 'effect',
            start: 2.3,
            absoluteStart: 2.3,
            end: 3,
            absoluteEnd: 3,
            duration: 0.7,
          },
        ],
        metadata: {
          keyword: 'breathing',
          impact: 1.5,
        },
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#ffffff',
    regularImpact: 1.0,
    keywordImpact: 1.3,
    breathingDuration: 2.5,
    staggerDelay: 0.15,
    glowEnabled: true,
    wordSpacing: 8,
    containerPadding: 32,
  },
};

// Export preset
export const breathingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
