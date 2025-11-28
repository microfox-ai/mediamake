/**
 * Fluid Liquid Motion Subtitles Preset
 *
 * This preset creates advanced liquid-motion subtitle effects where words behave like mercury droplets
 * responding to vocal emphasis. Features elastic spring physics with overshoot, subtle skew deformations
 * simulating liquid distortion, ripple propagation effects to neighboring words, and shimmer effects for
 * an organic, fluid typography experience.
 *
 * Features:
 * - **Elastic Spring Physics**: Words scale with overshoot and oscillation using custom bezier curves
 * - **Liquid Distortion**: Subtle skew animations during scaling to simulate surface tension
 * - **Ripple Propagation**: Emphasis on one word influences neighboring words with diminishing amplitude
 * - **Shimmer Effects**: Subtle brightness and blur variations for liquid-like shimmer
 * - **GPU-Accelerated**: All animations use transform-gpu and will-change for optimal performance
 * - **Flexible Positioning**: Multiple position options (center, top, bottom, custom)
 * - **Font Customization**: Support for custom fonts with weight and style
 * - **Overflow Visible**: Container allows effects to extend beyond boundaries
 *
 * Use cases:
 * - Creating organic, fluid subtitle animations
 * - Building mercury-like responsive text effects
 * - Adding water/liquid-themed typography
 * - Creating physics-based text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

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
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
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
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),

  position: z
    .enum(['center', 'top', 'bottom', 'top-left', 'top-right', 'custom'])
    .default('bottom')
    .describe('Positioning of subtitle container'),

  customPosition: z
    .object({
      top: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional()
    .describe('Custom positioning values when position is "custom"'),

  emphasisIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe(
      'Global multiplier for emphasis effects (higher = stronger liquid motion)',
    ),

  rippleDecayFactor: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe(
      'How much ripple amplitude decreases per word distance (0.5 = 50% reduction)',
    ),

  rippleDelayMs: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Delay between ripple propagation to adjacent words in milliseconds'),

  enableShimmer: z
    .boolean()
    .default(true)
    .describe('Enable subtle brightness and blur shimmer effects'),

  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
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
    position,
    customPosition,
    emphasisIntensity,
    rippleDecayFactor,
    rippleDelayMs,
    enableShimmer,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate position styles
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute' as const,
    };

    if (position === 'custom' && customPosition) {
      return {
        ...baseStyles,
        top: customPosition.top,
        bottom: customPosition.bottom,
        left: customPosition.left,
        right: customPosition.right,
      };
    }

    switch (position) {
      case 'center':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'top':
        return {
          ...baseStyles,
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyles,
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'top-left':
        return {
          ...baseStyles,
          top: '10%',
          left: '10%',
        };
      case 'top-right':
        return {
          ...baseStyles,
          top: '10%',
          right: '10%',
        };
      default:
        return {
          ...baseStyles,
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
    }
  };

  // Helper: Detect emphasized words (keywords or high impact)
  const getEmphasizedWordIndices = (
    caption: TranscriptionSentence,
  ): Set<number> => {
    const emphasized = new Set<number>();
    const keyword = caption.metadata?.keyword?.toLowerCase();

    caption.words.forEach((word, index) => {
      if (keyword && word.text.toLowerCase().includes(keyword)) {
        emphasized.add(index);
      }
    });

    return emphasized;
  };

  // Helper: Create liquid scale effect with overshoot
  const createLiquidScaleEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    scaleAmount: number,
    effectId: string,
  ): any => {
    // Elastic scaling with overshoot and oscillation
    const effectData: GenericEffectData = {
      type: 'cubic-bezier',
      bezier: [0.175, 0.885, 0.32, 1.275], // Elastic overshoot curve
      start: wordStart,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleAmount, prog: 0.3 },
        { key: 'scale', val: scaleAmount * 0.94, prog: 0.5 }, // Undershoot
        { key: 'scale', val: scaleAmount * 1.02, prog: 0.7 }, // Oscillate
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create skew distortion effect
  const createSkewEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    effectId: string,
  ): any => {
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: 3, prog: 0.25 },
        { key: 'skewX', val: -2, prog: 0.5 },
        { key: 'skewX', val: 1, prog: 0.75 },
        { key: 'skewX', val: 0, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create shimmer effect
  const createShimmerEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    effectId: string,
  ): any => {
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: 1.15, prog: 0.5 },
        { key: 'brightness', val: 1, prog: 1 },
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: 0.5, prog: 0.5 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create ripple effect for adjacent words
  const createRippleEffect = (
    wordId: string,
    wordStart: number,
    distance: number,
    baseScale: number,
    effectId: string,
  ): any => {
    const rippleDelay = (distance * rippleDelayMs) / 1000;
    const amplitudeReduction = Math.pow(rippleDecayFactor, distance);
    const rippleScale = 1 + (baseScale - 1) * amplitudeReduction;
    const rippleDuration = 0.4;

    const effectData: GenericEffectData = {
      type: 'cubic-bezier',
      bezier: [0.175, 0.885, 0.32, 1.275],
      start: wordStart + rippleDelay,
      duration: rippleDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: rippleScale, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      const emphasizedIndices = getEmphasizedWordIndices(caption);
      const captionImpact = caption.metadata?.impact ?? emphasisIntensity;

      // Build word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${caption.id}-${wordIndex}`;
          const isEmphasized = emphasizedIndices.has(wordIndex);

          // Calculate scale amount for emphasized words
          const baseScaleAmount = 1.25;
          const scaleAmount = isEmphasized
            ? 1 + (baseScaleAmount - 1) * captionImpact
            : 1;

          // Create effects
          const effects: any[] = [];

          // Main liquid scale effect for emphasized words
          if (isEmphasized) {
            effects.push(
              createLiquidScaleEffect(
                wordId,
                word.start,
                word.duration,
                scaleAmount,
                `liquid-scale-${wordId}`,
              ),
            );

            // Skew distortion effect
            effects.push(
              createSkewEffect(
                wordId,
                word.start,
                word.duration,
                `skew-${wordId}`,
              ),
            );

            // Shimmer effect
            if (enableShimmer) {
              effects.push(
                createShimmerEffect(
                  wordId,
                  word.start,
                  word.duration,
                  `shimmer-${wordId}`,
                ),
              );
            }

            // Ripple effects on adjacent words
            caption.words.forEach((adjacentWord, adjacentIndex) => {
              if (adjacentIndex !== wordIndex) {
                const distance = Math.abs(adjacentIndex - wordIndex);
                if (distance <= 3) {
                  // Limit ripple to 3 words away
                  effects.push(
                    createRippleEffect(
                      `word-${caption.id}-${adjacentIndex}`,
                      word.start,
                      distance,
                      scaleAmount,
                      `ripple-${wordId}-to-${adjacentIndex}`,
                    ),
                  );
                }
              }
            });
          }

          // Word text atom
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                WebkitFontSmoothing: 'antialiased',
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects,
          };

          return wordComponent;
        },
      );

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center',
            style: {
              gap: `${wordSpacing}px`,
              overflow: 'visible',
              maxWidth: '90%',
              padding: '20px',
              ...getPositionStyles(),
            },
          },
          repeatChildrenProps: {
            className: 'inline-block transform-gpu origin-center',
            style: {
              willChange: 'transform, filter',
              perspective: '1000px',
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
      };

      return captionContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-liquid-motion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex flex-wrap items-center justify-center pointer-events-none',
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
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
  id: 'fluidLiquidMotionSubtitles',
  title: 'Fluid Liquid Motion Subtitles',
  description:
    'Advanced liquid-motion subtitle preset where words behave like mercury droplets responding to vocal emphasis. Features elastic spring physics with overshoot, subtle skew deformations simulating liquid distortion, ripple propagation effects to neighboring words, and shimmer effects for an organic, fluid typography experience.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'captions',
    'fluid',
    'liquid',
    'mercury',
    'elastic',
    'spring-physics',
    'ripple',
    'distortion',
    'shimmer',
    'organic',
    'kinetic',
    'gpu-accelerated',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Dynamic liquid typography',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1-1',
            text: 'Dynamic',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-1-2',
            text: 'liquid',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.7,
          },
          {
            id: 'word-1-3',
            text: 'typography',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.0,
          },
        ],
        metadata: {
          keyword: 'liquid',
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    position: 'bottom',
    emphasisIntensity: 1.0,
    rippleDecayFactor: 0.5,
    rippleDelayMs: 50,
    enableShimmer: true,
    wordSpacing: 8,
  },
};

// Export preset
export const fluidLiquidMotionSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
