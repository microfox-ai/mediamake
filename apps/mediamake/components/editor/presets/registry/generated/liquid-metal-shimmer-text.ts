/**
 * Liquid Metal Shimmer Text Preset
 *
 * Creates T-1000 style liquid chrome/mercury text effect with flowing highlights
 * that move organically across the surface. Multiple gradient layers simulate
 * environment reflections while scale breathing creates surface tension. The
 * movement feels weighted and viscous using smooth easing, perfect for sci-fi
 * or technology themes.
 *
 * Features:
 * - Liquid metal text with gradient base (gray-to-white)
 * - Multiple flowing highlight layers with different angles
 * - Surface tension effect with subtle scale breathing (0.98-1.02)
 * - Viscous movement using ease-in-out timing
 * - Environment mapping simulation using blend modes
 * - Optional caption-responsive viscosity (slower flows for important words)
 *
 * Use cases:
 * - Sci-fi title cards
 * - Technology product reveals
 * - Futuristic branding
 * - T-1000 style liquid metal effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z
    .string()
    .optional()
    .describe(
      'Text to display with liquid metal effect (if not using captions)',
    ),
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
            impact: z
              .number()
              .optional()
              .describe('Effect intensity multiplier for this caption'),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .describe('Caption data for responsive viscosity effects'),
  duration: z
    .number()
    .default(10)
    .describe('Duration in seconds (used if no captions provided)'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size for the liquid metal text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (900 = black, 700 = bold, etc.)'),
  textColor: z
    .string()
    .default('#d1d5db')
    .describe('Base text color (gray-300 default)'),
  highlightColor: z
    .string()
    .default('#ffffff')
    .describe('Highlight color for liquid shimmer'),
  flowSpeed: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Speed multiplier for highlight flow (1 = normal, 0.5 = slow)'),
  surfaceTensionIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Intensity of surface tension breathing (0 = none, 1 = maximum)',
    ),
  viscosityMultiplier: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Global viscosity multiplier for all movements'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color for the scene'),
  useWordViscosity: z
    .boolean()
    .default(false)
    .describe(
      'Use caption word importance to control viscosity (slower for important words)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    captions,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    highlightColor,
    flowSpeed,
    surfaceTensionIntensity,
    viscosityMultiplier,
    backgroundColor,
    useWordViscosity,
  } = params;

  // Helper function to calculate effect duration based on viscosity
  const calculateEffectDuration = (
    baseDuration: number,
    wordImportance?: number,
  ): number => {
    const baseSpeed = baseDuration / flowSpeed / viscosityMultiplier;
    if (useWordViscosity && wordImportance) {
      // Important words (confidence > 0.8) get slower, more dramatic flows
      const viscosityFactor = wordImportance > 0.8 ? 1.5 : 1;
      return baseSpeed * viscosityFactor;
    }
    return baseSpeed;
  };

  // Helper function to parse hex color to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 255, 255, ${alpha})`;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  };

  const childrenData: RenderableComponentData[] = [];

  // If captions provided, create word-by-word liquid metal text
  if (captions && captions.length > 0) {
    captions.forEach((caption, captionIndex) => {
      const captionImpact = caption.metadata?.impact ?? 1;
      const captionId = `liquid-metal-caption-${captionIndex}`;

      // Create container for caption
      const captionContainer: RenderableComponentData = {
        id: captionId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              backgroundColor: 'transparent',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [],
      };

      // Create word components with liquid metal effect
      const wordComponents: RenderableComponentData[] = [];
      const wordEffects: any[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `liquid-metal-word-${captionIndex}-${wordIndex}`;
        const wordImportance = word.confidence ?? 0.5;

        // Base text layer
        const baseTextId = `${wordId}-base`;
        wordComponents.push({
          id: baseTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: 'transparent',
              backgroundImage: `linear-gradient(to bottom, ${textColor}, ${highlightColor}, ${textColor})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              marginRight: '0.2em',
              position: 'relative',
              zIndex: 1,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
        });

        // Highlight layer 1 - flowing gradient
        const highlight1Duration = calculateEffectDuration(6, wordImportance);
        wordEffects.push({
          id: `${wordId}-highlight1-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: highlight1Duration,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateX', val: -50, prog: 0 },
              { key: 'translateX', val: 50, prog: 0.5 },
              { key: 'translateX', val: -50, prog: 1 },
            ],
          } as GenericEffectData,
        });

        // Highlight layer 2 - vertical flow
        const highlight2Duration = calculateEffectDuration(7, wordImportance);
        wordEffects.push({
          id: `${wordId}-highlight2-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: highlight2Duration,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateY', val: -30, prog: 0 },
              { key: 'translateY', val: 30, prog: 0.5 },
              { key: 'translateY', val: -30, prog: 1 },
            ],
          } as GenericEffectData,
        });

        // Surface tension effect - breathing scale
        if (surfaceTensionIntensity > 0) {
          const tensionDuration = calculateEffectDuration(
            5,
            wordImportance,
          );
          const scaleMin = 1 - surfaceTensionIntensity * 0.02;
          const scaleMax = 1 + surfaceTensionIntensity * 0.02;

          wordEffects.push({
            id: `${wordId}-surface-tension`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: tensionDuration,
              mode: 'provider',
              targetIds: [baseTextId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: scaleMax, prog: 0.25 },
                { key: 'scale', val: scaleMin, prog: 0.5 },
                { key: 'scale', val: scaleMax, prog: 0.75 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          });
        }

        // Opacity pulse for liquid shimmer
        const opacityDuration = calculateEffectDuration(4, wordImportance);
        wordEffects.push({
          id: `${wordId}-opacity-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: opacityDuration,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          } as GenericEffectData,
        });
      });

      // Create word container with effects
      const wordContainerId = `${captionId}-word-container`;
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center',
            style: {
              gap: '0.2em',
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
        effects: wordEffects,
      };

      captionContainer.childrenData!.push(wordContainer);
      childrenData.push(captionContainer);
    });
  } else if (text) {
    // Simple text mode (no captions)
    const textId = 'liquid-metal-text';
    const baseTextId = `${textId}-base`;

    const textContainer: RenderableComponentData = {
      id: textId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            backgroundColor: 'transparent',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: baseTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: 'transparent',
              backgroundImage: `linear-gradient(to bottom, ${textColor}, ${highlightColor}, ${textColor})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
      effects: [
        // Horizontal flow
        {
          id: `${textId}-highlight1`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 6 / flowSpeed / viscosityMultiplier,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateX', val: -50, prog: 0 },
              { key: 'translateX', val: 50, prog: 0.5 },
              { key: 'translateX', val: -50, prog: 1 },
            ],
          } as GenericEffectData,
        },
        // Vertical flow
        {
          id: `${textId}-highlight2`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 7 / flowSpeed / viscosityMultiplier,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateY', val: -30, prog: 0 },
              { key: 'translateY', val: 30, prog: 0.5 },
              { key: 'translateY', val: -30, prog: 1 },
            ],
          } as GenericEffectData,
        },
        // Surface tension
        {
          id: `${textId}-surface-tension`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 5 / flowSpeed / viscosityMultiplier,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              {
                key: 'scale',
                val: 1 + surfaceTensionIntensity * 0.02,
                prog: 0.25,
              },
              {
                key: 'scale',
                val: 1 - surfaceTensionIntensity * 0.02,
                prog: 0.5,
              },
              {
                key: 'scale',
                val: 1 + surfaceTensionIntensity * 0.02,
                prog: 0.75,
              },
              { key: 'scale', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
        // Opacity pulse
        {
          id: `${textId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 4 / flowSpeed / viscosityMultiplier,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    childrenData.push(textContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions && captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : duration,
      },
    },
    childrenData: childrenData,
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
  id: 'liquid-metal-shimmer-text',
  title: 'Liquid Metal Shimmer Text',
  description:
    'Creates T-1000 style liquid chrome/mercury text effect with flowing highlights that move organically across the surface. Multiple gradient layers simulate environment reflections while scale breathing creates surface tension. The movement feels weighted and viscous using smooth easing, perfect for sci-fi or technology themes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'metal',
    'chrome',
    'mercury',
    'shimmer',
    'flow',
    'sci-fi',
    'futuristic',
    'technology',
    'T-1000',
    'viscous',
    'gradient',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID METAL',
    duration: 10,
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#d1d5db',
    highlightColor: '#ffffff',
    flowSpeed: 1,
    surfaceTensionIntensity: 0.5,
    viscosityMultiplier: 1,
    backgroundColor: '#0a0a0a',
    useWordViscosity: false,
  },
};

export const liquidMetalShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
