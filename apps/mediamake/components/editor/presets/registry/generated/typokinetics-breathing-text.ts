/**
 * Typokinetics Breathing Text Preset
 *
 * This preset implements rhythmic scaling text animations synchronized to a slow tempo,
 * where each text element 'breathes' by scaling up and down in smooth, organic cycles.
 * Think of this like a video editor working with keyframes on a timeline - scale keyframes
 * are placed at regular intervals (every 2-3 seconds for slow tempo) with values oscillating
 * between 100% and 110-115% scale.
 *
 * The breathing should feel natural and meditative, like watching calm ocean waves.
 * Uses BaseLayout containers with flex positioning to center the text, and applies
 * the breathing effect to individual TextAtom components. The animation uses a sine wave
 * easing curve to create that organic breathing feel.
 *
 * Features:
 * - Multiple text layers breathing at slightly different phases to create depth
 * - For captions, each word has a subtle delay creating a ripple effect across the sentence
 * - Smooth sine wave easing for natural breathing motion
 * - GPU-accelerated transforms with will-change optimization
 * - Configurable breathing cycle duration (2-3 seconds default)
 * - Scale oscillation between 1.0 and 1.1-1.15
 *
 * Use cases:
 * - Meditative or calming video content
 * - Slow-tempo music visualizations
 * - Contemplative poetry or quote displays
 * - Ambient background text effects
 * - Relaxing social media content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters with descriptions
const presetParams = z.object({
  // Mode selection
  mode: z
    .enum(['simple', 'layers', 'captions'])
    .default('simple')
    .describe(
      'Display mode: simple (single text), layers (multiple depth layers), or captions (word-by-word ripple)',
    ),

  // Simple mode text
  text: z
    .string()
    .default('Breathe')
    .describe('Text to display in simple mode'),

  // Layers mode texts
  primaryText: z
    .string()
    .optional()
    .describe('Primary text for layers mode (front layer)'),
  secondaryText: z
    .string()
    .optional()
    .describe('Secondary text for layers mode (middle layer)'),
  tertiaryText: z
    .string()
    .optional()
    .describe('Tertiary text for layers mode (back layer)'),

  // Captions mode
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
        metadata: z.any().optional(),
      }),
    )
    .optional()
    .describe('Caption data for word-by-word ripple breathing effect'),

  // Typography
  font: z
    .string()
    .default('Inter:400')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  fontWeight: z
    .string()
    .default('400')
    .describe('Font weight (100, 200, 300, 400, 500, 600, 700, 800, 900)'),

  // Breathing animation parameters
  breathingCycleDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of one complete breathing cycle in seconds'),
  minScale: z
    .number()
    .min(0.8)
    .max(1.0)
    .default(1.0)
    .describe('Minimum scale value (breathing in)'),
  maxScale: z
    .number()
    .min(1.0)
    .max(1.3)
    .default(1.12)
    .describe('Maximum scale value (breathing out)'),

  // Layers mode - phase offsets
  secondaryPhaseOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.33)
    .describe('Phase offset for secondary layer (0-1, fraction of cycle)'),
  tertiaryPhaseOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.66)
    .describe('Phase offset for tertiary layer (0-1, fraction of cycle)'),

  // Layers mode - opacity
  secondaryOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity for secondary text layer'),
  tertiaryOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity for tertiary text layer'),

  // Captions mode - word ripple delay
  wordRippleDelay: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe('Delay in milliseconds between each word breathing animation'),

  // Duration
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
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

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Helper: Create breathing effect for a component
  const createBreathingEffect = (
    targetId: string,
    phaseOffset: number = 0,
    startTime: number = 0,
    duration: number = params.duration,
  ) => {
    const cycleDuration = params.breathingCycleDuration;
    const minScale = params.minScale;
    const maxScale = params.maxScale;

    // Calculate phase-shifted start time
    const phaseShiftSeconds = phaseOffset * cycleDuration;
    const effectStart = startTime + phaseShiftSeconds;

    // Create smooth breathing cycle using sine wave approximation with ease-in-out
    // We'll create multiple keyframes to simulate a breathing pattern
    return {
      id: `breathing-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: effectStart,
        duration: duration - phaseShiftSeconds,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Start at mid-scale (exhale beginning)
          { key: 'scale', val: minScale, prog: 0 },
          // Breathe out to max (first quarter)
          { key: 'scale', val: maxScale, prog: 0.25 },
          // Hold briefly at max (mid-point)
          { key: 'scale', val: maxScale, prog: 0.5 },
          // Breathe in to min (third quarter)
          { key: 'scale', val: minScale, prog: 0.75 },
          // Complete cycle back to start
          { key: 'scale', val: minScale, prog: 1 },
        ],
      },
    };
  };

  // Mode: Simple - single centered text
  if (params.mode === 'simple') {
    const textId = 'typokinetics-simple-text';

    const textAtom = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || params.fontWeight,
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
          textAlign: 'center',
        },
        font: {
          family: fontFamily,
          weights: [
            (fontStyle.fontWeight || params.fontWeight).toString(),
          ],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [createBreathingEffect(textId, 0, 0, params.duration)],
    };

    const container = {
      id: 'typokinetics-simple-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex items-center justify-center w-full h-full',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [textAtom] as RenderableComponentData[],
    };

    return {
      output: {
        childrenData: [container] as RenderableComponentData[],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Mode: Layers - multiple text layers with phase-shifted breathing
  if (params.mode === 'layers') {
    const primaryTextId = 'typokinetics-primary-text';
    const secondaryTextId = 'typokinetics-secondary-text';
    const tertiaryTextId = 'typokinetics-tertiary-text';

    const createLayerText = (
      id: string,
      text: string,
      opacity: number,
      phaseOffset: number,
      zIndex: number,
    ) => ({
      id: `${id}-layer`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            willChange: 'transform',
            opacity: opacity,
            zIndex: zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [
        {
          id: id,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || params.fontWeight,
              ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [
                (fontStyle.fontWeight || params.fontWeight).toString(),
              ],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [createBreathingEffect(id, phaseOffset, 0, params.duration)],
        },
      ] as RenderableComponentData[],
    });

    const layers: RenderableComponentData[] = [];

    // Add tertiary layer (back, lowest z-index)
    if (params.tertiaryText) {
      layers.push(
        createLayerText(
          tertiaryTextId,
          params.tertiaryText,
          params.tertiaryOpacity,
          params.tertiaryPhaseOffset,
          1,
        ) as RenderableComponentData,
      );
    }

    // Add secondary layer (middle)
    if (params.secondaryText) {
      layers.push(
        createLayerText(
          secondaryTextId,
          params.secondaryText,
          params.secondaryOpacity,
          params.secondaryPhaseOffset,
          2,
        ) as RenderableComponentData,
      );
    }

    // Add primary layer (front, highest z-index)
    if (params.primaryText) {
      layers.push(
        createLayerText(
          primaryTextId,
          params.primaryText,
          1,
          0,
          3,
        ) as RenderableComponentData,
      );
    }

    const container = {
      id: 'typokinetics-layers-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: layers,
    };

    return {
      output: {
        childrenData: [container] as RenderableComponentData[],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Mode: Captions - word-by-word ripple breathing
  if (params.mode === 'captions' && params.captions) {
    const captionContainers: RenderableComponentData[] = [];

    params.captions.forEach((caption, captionIndex) => {
      const captionId = `typokinetics-caption-${captionIndex}`;

      // Create word atoms with staggered breathing
      const wordAtoms: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;
          const rippleDelaySeconds = (wordIndex * params.wordRippleDelay) / 1000;

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: fontStyle.fontWeight || params.fontWeight,
                ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
                marginRight: '0.3em',
              },
              font: {
                family: fontFamily,
                weights: [
                  (fontStyle.fontWeight || params.fontWeight).toString(),
                ],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              createBreathingEffect(
                wordId,
                0,
                rippleDelaySeconds,
                caption.duration - rippleDelaySeconds,
              ),
            ],
          } as RenderableComponentData;
        },
      );

      // Caption container
      const captionContainer = {
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'flex flex-row flex-wrap items-center justify-center gap-2',
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordAtoms,
      };

      captionContainers.push(captionContainer as RenderableComponentData);
    });

    // Root container for all captions
    const rootContainer = {
      id: 'typokinetics-captions-root',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
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
  }

  // Fallback: return empty if no valid mode
  return {
    output: {
      childrenData: [],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'typokineticsBreathingText',
  title: 'Typokinetics Breathing Text',
  description:
    'Rhythmic scaling text animations synchronized to slow tempo where text elements "breathe" by scaling up and down in smooth organic cycles. Features multiple text layers breathing at different phases for depth, and caption words with ripple-delayed breathing effects. Uses sine wave easing for natural, meditative motion like calm ocean waves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'breathing',
    'scale',
    'animation',
    'meditative',
    'rhythmic',
    'organic',
    'captions',
    'layers',
    'ripple',
    'wave',
  ],
  dependencies: {},
  defaultInputParams: {
    mode: 'simple',
    text: 'Breathe',
    primaryText: 'Peace',
    secondaryText: 'Calm',
    tertiaryText: 'Serenity',
    font: 'Inter:400',
    fontSize: 72,
    textColor: '#FFFFFF',
    fontWeight: '400',
    breathingCycleDuration: 2.5,
    minScale: 1.0,
    maxScale: 1.12,
    secondaryPhaseOffset: 0.33,
    tertiaryPhaseOffset: 0.66,
    secondaryOpacity: 0.6,
    tertiaryOpacity: 0.3,
    wordRippleDelay: 100,
    duration: 10,
  },
};

export const typokineticsBreathingTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
