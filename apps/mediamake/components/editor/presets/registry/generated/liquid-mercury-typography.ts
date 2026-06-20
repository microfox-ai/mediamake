/**
 * Liquid Mercury Typography Preset
 *
 * A typography preset that creates a liquid mercury filling effect through serif letterforms.
 * Each word appears to be filled with metallic liquid from bottom to top, featuring:
 * - Chrome-like sheen with moving reflections
 * - Subtle ripple effects at the fill line
 * - Staggered timing where each word fills 0.3s after the previous one
 * - Support for both staggered timing (titles) and caption-based word timing (captions)
 *
 * Technical Details:
 * - Uses BaseLayout with flex-wrap for word positioning
 * - Each word wrapped in relative overflow-hidden container
 * - Liquid fill effect using gradient and translateY animation
 * - Shimmer overlay for metallic reflection simulation
 * - GPU-accelerated transforms with will-change optimization
 *
 * Use Cases:
 * - Elegant title sequences with serif typography
 * - Caption animations with liquid-fill reveals
 * - Luxury brand presentations
 * - High-end product showcases
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
  // Text input (for simple text mode)
  text: z
    .string()
    .optional()
    .describe('Simple text to display (alternative to captions)'),

  // Caption input (for caption mode with word timing)
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
    .optional()
    .describe('Caption data with word-level timing for synchronized animations'),

  // Typography settings
  font: z
    .string()
    .default('Playfair Display:700')
    .describe(
      'Font family with optional weight (e.g., "Playfair Display:700", "Cormorant:600")',
    ),

  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for the text'),

  // Timing settings
  staggerDelay: z
    .number()
    .default(0.3)
    .describe('Delay in seconds between each word fill animation (for text mode)'),

  fillDuration: z
    .number()
    .default(0.5)
    .describe('Duration in seconds for the liquid fill effect per word'),

  shimmerDuration: z
    .number()
    .default(2)
    .describe('Duration in seconds for the shimmer pass across text'),

  // Visual settings
  metalColor: z
    .enum(['silver', 'gold', 'chrome', 'platinum'])
    .default('silver')
    .describe('Metallic color scheme for the liquid effect'),

  rippleIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of ripple effect at fill line (0-1)'),

  // Layout settings
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text'),

  wordSpacing: z
    .number()
    .default(16)
    .describe('Gap in pixels between words'),

  // Duration (for text mode only)
  duration: z
    .number()
    .optional()
    .describe(
      'Total duration in seconds (only used in text mode, captions use their own timing)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Get metallic gradient colors
  const getMetallicGradient = (colorScheme: string): string => {
    const gradients: Record<string, string> = {
      silver:
        'linear-gradient(to top, #cbd5e1, #e4e4e7, #ffffff, #f1f5f9, #e2e8f0)',
      gold: 'linear-gradient(to top, #b8860b, #daa520, #ffd700, #ffed4e, #fff5cc)',
      chrome:
        'linear-gradient(to top, #a8a9ad, #c0c3c8, #e8e9ed, #ffffff, #f5f5f5)',
      platinum:
        'linear-gradient(to top, #bfc1c7, #d5d7dd, #e8eaef, #ffffff, #f8f9fa)',
    };
    return gradients[colorScheme] || gradients.silver;
  };

  // Helper: Parse font string
  const parseFontString = (
    fontString: string,
  ): { family: string; weight?: number; style?: string } => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : undefined;
    const style = parts.length > 2 ? parts[2] : 'normal';
    return { family, weight, style };
  };

  // Helper: Get alignment class
  const getAlignmentClass = (alignment: string): string => {
    const alignmentMap: Record<string, string> = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };
    return alignmentMap[alignment] || 'justify-center';
  };

  const font = parseFontString(params.font);
  const metalGradient = getMetallicGradient(params.metalColor);
  const alignmentClass = getAlignmentClass(params.alignment);

  // Determine mode: caption or text
  const isCaptionMode = params.captions && params.captions.length > 0;

  let childrenData: RenderableComponentData[] = [];
  let totalDuration = params.duration || 10;

  if (isCaptionMode) {
    // Caption mode: Use word-level timing from caption data
    const captions = params.captions!;

    captions.forEach((caption, captionIndex) => {
      const captionWords = caption.words || [];

      // Create container for this caption
      const wordComponents: RenderableComponentData[] = captionWords.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;
          const liquidFillId = `liquid-fill-${captionIndex}-${wordIndex}`;
          const shimmerOverlayId = `shimmer-overlay-${captionIndex}-${wordIndex}`;
          const textId = `text-${captionIndex}-${wordIndex}`;

          // Word wrapper with relative positioning
          const wordWrapper: RenderableComponentData = {
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
                start: word.start, // Relative to caption
                duration: word.duration,
              },
            },
            childrenData: [
              // Text atom with transparent color (to be filled by gradient)
              {
                id: textId,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: word.text,
                  font: {
                    family: font.family,
                    weights: font.weight ? [font.weight.toString()] : ['700'],
                    subsets: ['latin'],
                  },
                  style: {
                    fontSize: `${params.fontSize}px`,
                    fontWeight: font.weight || 700,
                    fontStyle: font.style || 'normal',
                    color: 'transparent',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    backgroundImage: metalGradient,
                    position: 'relative',
                    zIndex: 2,
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: word.duration,
                  },
                },
              } as RenderableComponentData,

              // Liquid fill layer (gradient that rises from bottom)
              {
                id: liquidFillId,
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      background: metalGradient,
                      zIndex: 1,
                      willChange: 'transform',
                      mixBlendMode: 'multiply',
                    },
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
                    id: `liquid-fill-effect-${captionIndex}-${wordIndex}`,
                    componentId: 'generic',
                    data: {
                      type: 'ease-out',
                      start: 0,
                      duration: params.fillDuration,
                      mode: 'provider',
                      targetIds: [liquidFillId],
                      ranges: [
                        { key: 'translateY', val: 100, prog: 0 },
                        { key: 'translateY', val: 0, prog: 1 },
                      ],
                    },
                  },
                ],
              } as RenderableComponentData,

              // Shimmer overlay (moves horizontally for metallic shine)
              {
                id: shimmerOverlayId,
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                      zIndex: 3,
                      willChange: 'transform',
                      mixBlendMode: 'overlay',
                      pointerEvents: 'none',
                    },
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
                    id: `shimmer-effect-${captionIndex}-${wordIndex}`,
                    componentId: 'generic',
                    data: {
                      type: 'linear',
                      start: params.fillDuration,
                      duration: params.shimmerDuration,
                      mode: 'provider',
                      targetIds: [shimmerOverlayId],
                      ranges: [
                        { key: 'translateX', val: -100, prog: 0 },
                        { key: 'translateX', val: 100, prog: 1 },
                      ],
                    },
                  },
                ],
              } as RenderableComponentData,
            ],
            effects: [
              // Fade in the entire word wrapper
              {
                id: `word-fade-${captionIndex}-${wordIndex}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: 0.3,
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

          return wordWrapper;
        },
      );

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex flex-wrap items-center ${alignmentClass}`,
            style: {
              gap: `${params.wordSpacing}px`,
              width: '100%',
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

      childrenData.push(captionContainer);
    });

    // Calculate total duration from captions
    if (captions.length > 0) {
      const lastCaption = captions[captions.length - 1];
      totalDuration = lastCaption.absoluteEnd;
    }
  } else {
    // Text mode: Use staggered timing
    const text = params.text || 'Liquid Mercury';
    const words = text.split(/\s+/);

    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `word-${wordIndex}`;
        const liquidFillId = `liquid-fill-${wordIndex}`;
        const shimmerOverlayId = `shimmer-overlay-${wordIndex}`;
        const textId = `text-${wordIndex}`;

        const wordStartTime = wordIndex * params.staggerDelay;

        // Word wrapper with relative positioning
        const wordWrapper: RenderableComponentData = {
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
              start: wordStartTime,
              duration: totalDuration - wordStartTime,
            },
          },
          childrenData: [
            // Text atom with transparent color (to be filled by gradient)
            {
              id: textId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: word,
                font: {
                  family: font.family,
                  weights: font.weight ? [font.weight.toString()] : ['700'],
                  subsets: ['latin'],
                },
                style: {
                  fontSize: `${params.fontSize}px`,
                  fontWeight: font.weight || 700,
                  fontStyle: font.style || 'normal',
                  color: 'transparent',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  backgroundImage: metalGradient,
                  position: 'relative',
                  zIndex: 2,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration - wordStartTime,
                },
              },
            } as RenderableComponentData,

            // Liquid fill layer (gradient that rises from bottom)
            {
              id: liquidFillId,
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: metalGradient,
                    zIndex: 1,
                    willChange: 'transform',
                    mixBlendMode: 'multiply',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration - wordStartTime,
                },
              },
              effects: [
                {
                  id: `liquid-fill-effect-${wordIndex}`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0,
                    duration: params.fillDuration,
                    mode: 'provider',
                    targetIds: [liquidFillId],
                    ranges: [
                      { key: 'translateY', val: 100, prog: 0 },
                      { key: 'translateY', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,

            // Shimmer overlay (moves horizontally for metallic shine)
            {
              id: shimmerOverlayId,
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                    zIndex: 3,
                    willChange: 'transform',
                    mixBlendMode: 'overlay',
                    pointerEvents: 'none',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration - wordStartTime,
                },
              },
              effects: [
                {
                  id: `shimmer-effect-${wordIndex}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: params.fillDuration,
                    duration: params.shimmerDuration,
                    mode: 'provider',
                    targetIds: [shimmerOverlayId],
                    ranges: [
                      { key: 'translateX', val: -100, prog: 0 },
                      { key: 'translateX', val: 100, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
          effects: [
            // Fade in the entire word wrapper
            {
              id: `word-fade-${wordIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.3,
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

        return wordWrapper;
      },
    );

    // Main container for text mode
    const mainContainer: RenderableComponentData = {
      id: 'liquid-mercury-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-wrap items-center ${alignmentClass}`,
          style: {
            gap: `${params.wordSpacing}px`,
            width: '100%',
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;

    childrenData = [mainContainer];
  }

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-mercury-typography',
  title: 'Liquid Mercury Typography',
  description:
    'A typography preset that creates a liquid mercury filling effect through serif letterforms. Each word appears to be filled with metallic liquid from bottom to top, featuring chrome-like sheen, ripple effects at the fill line, and moving reflections. Supports both staggered timing for titles and word-level timing from caption data for synchronized captions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'mercury',
    'metallic',
    'chrome',
    'elegant',
    'serif',
    'captions',
    'titles',
    'animated',
    'fill',
    'shimmer',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Liquid Mercury',
    font: 'Playfair Display:700',
    fontSize: 64,
    staggerDelay: 0.3,
    fillDuration: 0.5,
    shimmerDuration: 2,
    metalColor: 'silver',
    rippleIntensity: 0.5,
    alignment: 'center',
    wordSpacing: 16,
    duration: 10,
  },
};

// Export preset
export const liquidMercuryTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
