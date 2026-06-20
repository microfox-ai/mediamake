/**
 * Elastic Title Bounce - Apple Keynote Style
 *
 * This preset creates a sophisticated title animation that combines fast scale-up with
 * momentum-based overshoot and elastic settling, inspired by Apple's keynote animations.
 * The text emerges with acceleration, like a camera crash zoom in video editing, starting
 * invisible and tiny (scale: 0) and rapidly expanding past its final size before elastically
 * settling. Features layered opacity animation for fade-in effect, and subtle shadow growth
 * during scale-up for depth. Supports both full-text and word-by-word staggered animations
 * using caption data.
 *
 * Features:
 * - **Elastic Scale Animation**: Scale from 0 → 1.15 → 0.95 → 1.02 → 1.0 with custom cubic-bezier
 * - **Momentum-Based Overshoot**: Feels like a camera crash zoom with organic rubber ball physics
 * - **Layered Opacity**: Fade-in from 0 to 1 over first 30% of animation
 * - **Shadow Depth**: Drop shadow grows from transparent to visible during scale-up
 * - **Word-by-Word Stagger**: Each word animates 0.05s after the previous (if caption data provided)
 * - **Perfect Centering**: Uses BaseLayout with 'absolute inset-0 grid place-items-center'
 * - **GPU Accelerated**: Transform and opacity only for optimal performance
 *
 * Use cases:
 * - Creating dynamic title reveals for video intros
 * - Building engaging product announcement animations
 * - Adding professional bounce-in effects to presentations
 * - Creating Apple keynote-style text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  BaseEffect,
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Text input
  text: z
    .string()
    .optional()
    .describe('Text to display (use this OR captions, not both)'),

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
    .optional()
    .describe(
      'Caption data for word-by-word staggered animations (use this OR text, not both)',
    ),

  // Timing
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Duration of the animation in seconds (for text mode only)'),

  // Typography
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (hex, rgb, or rgba)'),

  // Animation control
  elasticIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Multiplier for elastic effect intensity (0.5 = subtle, 1 = normal, 2 = exaggerated)',
    ),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe(
      'Delay between each word animation in seconds (caption mode only)',
    ),

  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of the elastic animation per word/text in seconds'),

  // Layout
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),

  verticalAlignment: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical text alignment'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFont = (fontString: string) => {
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

  // Helper: Create elastic bounce effect
  const createElasticEffect = (
    targetId: string,
    effectStart: number,
    effectDuration: number,
    intensity: number,
  ): BaseEffect => {
    // Calculate scale values with intensity multiplier
    const overshoot = 1 + 0.15 * intensity;
    const undershoot = 1 - 0.05 * intensity;
    const secondaryOvershoot = 1 + 0.02 * intensity;

    const effectData: GenericEffectData = {
      type: 'cubic-bezier',
      easing: [0.68, -0.55, 0.265, 1.55], // Elastic cubic-bezier
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scale', val: 0, prog: 0 }, // Start tiny
        { key: 'scale', val: overshoot, prog: 0.4 }, // Overshoot
        { key: 'scale', val: undershoot, prog: 0.65 }, // Undershoot
        { key: 'scale', val: secondaryOvershoot, prog: 0.85 }, // Secondary overshoot
        { key: 'scale', val: 1, prog: 1 }, // Settle
      ],
    };

    return {
      id: `elastic-scale-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create opacity fade effect
  const createOpacityEffect = (
    targetId: string,
    effectStart: number,
    effectDuration: number,
  ): BaseEffect => {
    const fadeInDuration = effectDuration * 0.3; // 30% of animation

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: fadeInDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `opacity-fade-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create shadow growth effect
  const createShadowEffect = (
    targetId: string,
    effectStart: number,
    effectDuration: number,
  ): BaseEffect => {
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'drop-shadow(0 0 0 transparent)', prog: 0 },
        {
          key: 'filter',
          val: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
          prog: 1,
        },
      ],
    };

    return {
      id: `shadow-growth-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  const { fontFamily, fontStyle } = parseFont(params.font);

  // Alignment classes
  const horizontalAlign =
    params.alignment === 'left'
      ? 'justify-start'
      : params.alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  const verticalAlign =
    params.verticalAlignment === 'top'
      ? 'items-start'
      : params.verticalAlignment === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Caption mode: word-by-word staggered animations
  if (params.captions && params.captions.length > 0) {
    const captionComponents: RenderableComponentData[] = [];

    params.captions.forEach((caption, captionIndex) => {
      const captionId = `elastic-caption-${captionIndex}`;
      const wordComponents: RenderableComponentData[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `elastic-word-${captionIndex}-${wordIndex}`;
        const staggerDelay = wordIndex * params.staggerDelay;

        // Create effects
        const elasticEffect = createElasticEffect(
          wordId,
          staggerDelay,
          params.animationDuration,
          params.elasticIntensity,
        );
        const opacityEffect = createOpacityEffect(
          wordId,
          staggerDelay,
          params.animationDuration,
        );
        const shadowEffect = createShadowEffect(
          wordId,
          staggerDelay,
          params.animationDuration,
        );

        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              fontWeight: fontStyle.fontWeight || 700,
              color: params.textColor,
              textAlign: 'center',
              marginRight: '0.2em',
              ...(fontStyle.fontStyle && {
                fontStyle: fontStyle.fontStyle,
              }),
            },
            font: {
              family: fontFamily,
              weights: [String(fontStyle.fontWeight || 700)],
              subsets: ['latin'],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [elasticEffect, opacityEffect, shadowEffect],
        };

        wordComponents.push(wordComponent);
      });

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: captionId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 grid place-items-center`,
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
            id: `${captionId}-words-wrapper`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: `flex flex-row flex-wrap ${horizontalAlign} ${verticalAlign} gap-1`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: wordComponents,
          },
        ],
      };

      captionComponents.push(captionContainer);
    });

    return {
      output: {
        childrenData: captionComponents as RenderableComponentData[],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Text mode: single text animation
  if (params.text) {
    const textId = 'elastic-text-main';

    const elasticEffect = createElasticEffect(
      textId,
      0,
      params.animationDuration,
      params.elasticIntensity,
    );
    const opacityEffect = createOpacityEffect(
      textId,
      0,
      params.animationDuration,
    );
    const shadowEffect = createShadowEffect(
      textId,
      0,
      params.animationDuration,
    );

    const textComponent: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.textColor,
          textAlign: 'center',
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          weights: [String(fontStyle.fontWeight || 700)],
          subsets: ['latin'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [elasticEffect, opacityEffect, shadowEffect],
    };

    const rootContainer: RenderableComponentData = {
      id: 'elastic-title-root',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 grid place-items-center`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [textComponent],
    };

    return {
      output: {
        childrenData: [rootContainer] as RenderableComponentData[],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  throw new Error('Either text or captions must be provided');
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'elasticTitleBounce',
  title: 'Elastic Title Bounce - Apple Keynote Style',
  description:
    'Sophisticated title preset combining fast scale-up with momentum-based overshoot and elastic settling, inspired by Apple keynote animations. Text emerges with acceleration like a camera crash zoom, starting invisible and tiny (scale: 0) and rapidly expanding past final size before elastically settling. Features layered opacity animation for fade-in effect, and subtle shadow growth during scale-up for depth. Supports both full-text and word-by-word staggered animations using caption data. Uses BaseLayout with perfect centering. Elastic bounce feels organic like a rubber ball compressing and expanding. GPU-accelerated using transform and opacity only.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'elastic',
    'bounce',
    'keynote',
    'apple',
    'crash-zoom',
    'overshoot',
    'momentum',
    'scale',
    'animated',
    'smooth',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Amazing Title',
    duration: 3,
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#000000',
    elasticIntensity: 1,
    staggerDelay: 0.05,
    animationDuration: 0.6,
    alignment: 'center',
    verticalAlignment: 'center',
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const elasticTitleBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
