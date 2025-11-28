/**
 * Liquid Mercury Typography Preset
 *
 * A premium typography preset that simulates liquid mercury flowing through serif letterforms.
 * Features bottom-to-top liquid fill animation with metallic gradients, subtle ripple effects at the fill line,
 * chrome-like sheen with moving reflections, and staggered word timing for wave-like text reveals.
 *
 * Key Features:
 * - Bottom-to-top liquid fill animation with metallic gradients
 * - Chrome-like sheen with moving reflections
 * - Subtle ripple effects at the fill line
 * - Staggered word timing (0.3s delay between words) for wave-like progression
 * - Word-level timing from caption data support
 * - Optimized for GPU acceleration using transform and opacity
 *
 * Technical Implementation:
 * - BaseLayout with flex-wrap for word positioning
 * - Each word wrapped in overflow-hidden container for liquid effect
 * - Gradient-based liquid fill using translateY animation
 * - Shimmer overlay using translateX animation
 * - Metallic sheen using brightness/contrast filters
 * - Generic effects for all animations
 *
 * Use Cases:
 * - Premium title sequences
 * - Luxury brand content
 * - High-end product reveals
 * - Sophisticated caption displays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ===========================
// Parameter Schema
// ===========================

const presetParams = z.object({
  // Text content (either direct text or captions)
  text: z
    .string()
    .optional()
    .describe('Direct text to display (alternative to captions)'),
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
    .optional()
    .describe('Caption data with word-level timing'),

  // Typography
  font: z
    .string()
    .default('Playfair Display:700')
    .describe(
      'Font family with optional weight and style (e.g., "Playfair Display:700", "Cinzel:600")',
    ),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  letterSpacing: z
    .number()
    .default(2)
    .describe('Letter spacing in pixels for refined typography'),

  // Colors and gradients
  textGradient: z
    .string()
    .default('linear-gradient(180deg, #e2e8f0, #94a3b8, #64748b)')
    .describe('Base text gradient for metallic appearance'),
  liquidGradient: z
    .string()
    .default('linear-gradient(to top, #cbd5e1, #e4e4e7, #ffffff)')
    .describe('Liquid fill gradient (bottom to top)'),
  shimmerGradient: z
    .string()
    .default(
      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
    )
    .describe('Shimmer overlay gradient for chrome reflection'),

  // Timing
  staggerDelay: z
    .number()
    .default(0.3)
    .describe('Delay in seconds between each word filling'),
  fillDuration: z
    .number()
    .default(0.5)
    .describe('Duration in seconds for liquid fill animation'),
  shimmerDuration: z
    .number()
    .default(2)
    .describe('Duration in seconds for shimmer pass animation'),

  // Layout
  gap: z
    .number()
    .default(16)
    .describe('Gap in pixels between words (default: 16)'),
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),

  // Position
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning on canvas'),
  topOffset: z
    .number()
    .default(0)
    .describe('Additional top offset in pixels (positive = down)'),
});

// ===========================
// Preset Execution
// ===========================

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
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Determine text source (direct text or captions)
  const useDirectText = !!params.text && !params.captions;
  const useCaptions = !!params.captions && params.captions.length > 0;

  if (!useDirectText && !useCaptions) {
    throw new Error('Must provide either text or captions parameter');
  }

  // Helper: Create word component with liquid fill effect
  const createWordComponent = (
    wordText: string,
    wordIndex: number,
    wordStart: number,
    wordDuration: number,
    containerId: string,
  ): RenderableComponentData => {
    const wordId = `word-${containerId}-${wordIndex}`;
    const textId = `text-${wordId}`;
    const liquidId = `liquid-${wordId}`;
    const shimmerId = `shimmer-${wordId}`;

    // Calculate effect start time based on stagger
    const effectStartDelay = wordIndex * params.staggerDelay;

    // Create liquid fill effect (translateY from 100% to 0%)
    const liquidFillEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart + effectStartDelay,
      duration: params.fillDuration,
      mode: 'provider',
      targetIds: [liquidId],
      ranges: [
        { key: 'translateY', val: 100, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Create shimmer effect (translateX from -100% to 100%)
    const shimmerEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart + effectStartDelay + params.fillDuration,
      duration: params.shimmerDuration,
      mode: 'provider',
      targetIds: [shimmerId],
      ranges: [
        { key: 'translateX', val: -100, prog: 0 },
        { key: 'translateX', val: 100, prog: 1 },
      ],
    };

    // Create word opacity effect
    const wordOpacityEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart + effectStartDelay,
      duration: params.fillDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Create metallic sheen effect
    const metallicSheenEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart + effectStartDelay,
      duration: params.fillDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'brightness', val: 0.8, prog: 0 },
        { key: 'brightness', val: 1.2, prog: 0.5 },
        { key: 'brightness', val: 1, prog: 1 },
        { key: 'contrast', val: 1, prog: 0 },
        { key: 'contrast', val: 1.1, prog: 0.5 },
        { key: 'contrast', val: 1, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: wordDuration,
        },
      },
      effects: [
        {
          id: `word-opacity-${wordId}`,
          componentId: 'generic',
          data: wordOpacityEffect,
        },
        {
          id: `liquid-fill-${wordId}`,
          componentId: 'generic',
          data: liquidFillEffect,
        },
        {
          id: `shimmer-${wordId}`,
          componentId: 'generic',
          data: shimmerEffect,
        },
        {
          id: `metallic-sheen-${wordId}`,
          componentId: 'generic',
          data: metallicSheenEffect,
        },
      ],
      childrenData: [
        // Text atom
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: wordText,
            style: {
              fontSize: params.fontSize,
              letterSpacing: params.letterSpacing,
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              backgroundImage: params.textGradient,
              ...fontStyle,
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
              duration: wordDuration,
            },
          },
        },
        // Liquid fill layer
        {
          id: liquidId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backgroundImage: params.liquidGradient,
                mixBlendMode: 'multiply' as const,
                willChange: 'transform',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
          childrenData: [],
        },
        // Shimmer overlay
        {
          id: shimmerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backgroundImage: params.shimmerGradient,
                willChange: 'transform',
                pointerEvents: 'none' as const,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
          childrenData: [],
        },
      ],
    } as RenderableComponentData;
  };

  let childrenData: RenderableComponentData[] = [];

  // Build word components based on input type
  if (useDirectText) {
    // Direct text mode: split by spaces
    const words = params.text!.split(/\s+/).filter((w) => w.length > 0);
    const totalDuration = words.length * params.staggerDelay + params.fillDuration + params.shimmerDuration;
    const containerId = 'direct-text';

    childrenData = words.map((word, index) =>
      createWordComponent(word, index, 0, totalDuration, containerId),
    );
  } else if (useCaptions) {
    // Caption mode: use word-level timing
    params.captions!.forEach((caption) => {
      const captionWords = caption.words.map((word, wordIndex) =>
        createWordComponent(
          word.text,
          wordIndex,
          word.start, // Relative to caption start
          caption.duration, // Word lasts for full caption duration
          caption.id,
        ),
      );
      childrenData.push(...captionWords);
    });
  }

  // Determine alignment class
  const alignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };
  const alignmentClass = alignmentMap[params.alignment];

  // Determine vertical positioning
  const verticalPositionMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };
  const verticalClass = verticalPositionMap[params.verticalPosition];

  // Calculate duration
  let totalDuration = 10;
  if (useDirectText) {
    const wordCount = params.text!.split(/\s+/).filter((w) => w.length > 0).length;
    totalDuration = wordCount * params.staggerDelay + params.fillDuration + params.shimmerDuration;
  } else if (useCaptions) {
    const lastCaption = params.captions![params.captions!.length - 1];
    totalDuration = lastCaption.absoluteEnd;
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-mercury-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-wrap ${alignmentClass} ${verticalClass}`,
        style: {
          gap: `${params.gap}px`,
          paddingTop: params.topOffset,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData,
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

// ===========================
// Preset Metadata
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'liquid-mercury-typography',
  title: 'Liquid Mercury Typography',
  description:
    'A premium typography preset that simulates liquid mercury flowing through serif letterforms. Features bottom-to-top liquid fill animation with metallic gradients, subtle ripple effects at the fill line, chrome-like sheen with moving reflections, and staggered word timing for wave-like text reveals. Optimized for GPU acceleration using transform and opacity properties. Supports word-level timing from caption data for synchronized spoken text effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'liquid',
    'mercury',
    'metallic',
    'chrome',
    'premium',
    'luxury',
    'animated',
    'captions',
    'subtitles',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Liquid Mercury Typography',
    font: 'Playfair Display:700',
    fontSize: 72,
    letterSpacing: 2,
    textGradient: 'linear-gradient(180deg, #e2e8f0, #94a3b8, #64748b)',
    liquidGradient: 'linear-gradient(to top, #cbd5e1, #e4e4e7, #ffffff)',
    shimmerGradient:
      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
    staggerDelay: 0.3,
    fillDuration: 0.5,
    shimmerDuration: 2,
    gap: 16,
    alignment: 'center',
    verticalPosition: 'center',
    topOffset: 0,
  },
};

// ===========================
// Export
// ===========================

export const liquidMercuryTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
