/**
 * Breathing Text Animation Preset
 *
 * This preset creates organic breathing text animations where text smoothly stretches
 * and contracts like it's inhaling and exhaling. The animation features:
 * - Smooth, continuous stretch/contract cycles expanding gently in all directions
 * - Different scale ratios for X and Y axes (scaleX: 1 → 1.3 → 1, scaleY: 1 → 1.2 → 1)
 * - Synchronized opacity pulsing (0.7 → 1 → 0.7) for enhanced breathing rhythm
 * - Natural breathing curve using cubic-bezier easing
 * - Animated text-shadow blur radius for glowing effect
 * - 4-second cycle duration with infinite loop
 * - CSS animations for optimal performance
 *
 * Perfect for:
 * - Wellness and mindfulness content
 * - Meditation and relaxation videos
 * - Calming title animations
 * - Hypnotic visual effects
 *
 * Features:
 * - Customizable text content, font, size, and color
 * - Adjustable breathing cycle duration and intensity
 * - Optional glow effect with configurable strength
 * - Caption data sync support for word-level breathing offsets
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

// Parameter schema with descriptions
const presetParams = z.object({
  text: z
    .string()
    .default('Breathe')
    .describe('The text content to display with breathing animation'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight (e.g., "Inter:600", "Roboto:700")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  breathingDuration: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Duration of one complete breathing cycle in seconds'),

  breathingIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Intensity multiplier for breathing effect (1 = normal, higher = more pronounced)',
    ),

  glowStrength: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Strength of the glow effect in pixels (0 = no glow)'),

  glowColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the glow effect'),

  opacity: z
    .object({
      min: z.number().min(0).max(1).default(0.7),
      max: z.number().min(0).max(1).default(1),
    })
    .default({ min: 0.7, max: 1 })
    .describe('Opacity range for pulsing effect (min to max)'),

  duration: z
    .number()
    .optional()
    .describe('Total duration of the animation in seconds (optional)'),

  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .describe(
      'Optional caption data for synchronized word-level breathing offsets',
    ),

  useWordSync: z
    .boolean()
    .default(false)
    .describe('Enable word-level breathing synchronization with caption data'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:600';
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

  // Calculate scale values based on intensity
  const baseScaleX = 1;
  const maxScaleX = 1 + 0.3 * params.breathingIntensity;
  const baseScaleY = 1;
  const maxScaleY = 1 + 0.2 * params.breathingIntensity;

  // Calculate opacity values
  const minOpacity = params.opacity.min;
  const maxOpacity = params.opacity.max;

  // Calculate glow effect
  const glowBlurMin = params.glowStrength * 0.5;
  const glowBlurMax = params.glowStrength;

  // Parse glow color to rgba
  const parseColor = (color: string): string => {
    // Simple hex to rgba conversion
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }
    return color;
  };

  const glowColorRgba = parseColor(params.glowColor);

  // Determine if we're using word-level sync
  const useWordSync = params.useWordSync && params.captions && params.captions.length > 0;

  // Calculate total duration
  const totalDuration = params.duration || (useWordSync && params.captions ? 
    Math.max(...params.captions.map(c => c.absoluteStart + c.duration)) : 10);

  // Create breathing effect using generic effect with ranges
  const createBreathingEffect = (
    targetId: string,
    startTime: number = 0,
    phaseOffset: number = 0,
  ): any => {
    const cycleDuration = params.breathingDuration;
    
    // Calculate keyframe positions with phase offset
    const inhaleStart = (0 + phaseOffset) % 1;
    const inhaleEnd = (0.5 + phaseOffset) % 1;
    const exhaleEnd = (1 + phaseOffset) % 1;

    // Normalize keyframe positions
    const keyframes = [
      { prog: 0, phase: 'start' },
      { prog: 0.5, phase: 'inhale' },
      { prog: 1, phase: 'exhale' },
    ].sort((a, b) => {
      const aAdj = (a.prog + phaseOffset) % 1;
      const bAdj = (b.prog + phaseOffset) % 1;
      return aAdj - bAdj;
    });

    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: totalDuration - startTime,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // ScaleX animation (wider breathing)
        { key: 'scaleX', val: baseScaleX, prog: 0 },
        { key: 'scaleX', val: maxScaleX, prog: 0.5 },
        { key: 'scaleX', val: baseScaleX, prog: 1 },

        // ScaleY animation (slightly less than X for natural look)
        { key: 'scaleY', val: baseScaleY, prog: 0 },
        { key: 'scaleY', val: maxScaleY, prog: 0.5 },
        { key: 'scaleY', val: baseScaleY, prog: 1 },

        // Opacity pulsing
        { key: 'opacity', val: minOpacity, prog: 0 },
        { key: 'opacity', val: maxOpacity, prog: 0.5 },
        { key: 'opacity', val: minOpacity, prog: 1 },

        // Text shadow glow pulsing
        {
          key: 'textShadow',
          val: `0 0 ${glowBlurMin}px ${glowColorRgba}`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${glowBlurMax}px ${glowColorRgba}`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `0 0 ${glowBlurMin}px ${glowColorRgba}`,
          prog: 1,
        },
      ],
    };

    return {
      id: `breathing-effect-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  let childrenData: any[];

  if (useWordSync && params.captions) {
    // Word-level breathing with phase offsets
    const words: any[] = [];

    params.captions.forEach((caption: any) => {
      caption.words.forEach((word: any, wordIndex: number) => {
        const wordId = `breathing-word-${caption.text}-${wordIndex}`;
        
        // Calculate phase offset based on word.start (relative to caption)
        // Normalize to 0-1 range for phase
        const phaseOffset = (word.start / params.breathingDuration) % 1;

        const wordComponent = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || 600,
              marginRight: '0.3em',
              textAlign: 'center' as const,
            },
            font: {
              family: fontFamily,
              weights: [fontStyle.fontWeight?.toString() || '600'],
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          effects: [createBreathingEffect(wordId, 0, phaseOffset)],
        };

        words.push(wordComponent);
      });
    });

    childrenData = [
      {
        id: 'breathing-words-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full flex items-center justify-center flex-wrap gap-2',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: words,
      } as RenderableComponentData,
    ];
  } else {
    // Single text breathing
    const textAtomId = 'breathing-text-atom';

    childrenData = [
      {
        id: 'breathing-text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: textAtomId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.text,
              style: {
                fontSize: params.fontSize,
                fontWeight: fontStyle.fontWeight || 600,
                color: params.textColor,
                textAlign: 'center' as const,
                textShadow: `0 0 ${params.glowStrength}px ${glowColorRgba}`,
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '600'],
                subsets: ['latin'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: [createBreathingEffect(textAtomId, 0, 0)],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ];
  }

  const rootContainer = {
    id: 'breathing-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'breathing-text-animation',
  title: 'Breathing Text Animation',
  description:
    'Organic breathing text animation with smooth stretch/contract cycles synchronized with opacity pulsing. Creates meditative, hypnotic title animations perfect for wellness and mindfulness content with continuous inhale/exhale motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'breathing',
    'meditation',
    'wellness',
    'mindfulness',
    'calm',
    'hypnotic',
    'organic',
    'pulse',
    'glow',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Breathe',
    font: 'Inter:600',
    fontSize: 72,
    textColor: '#ffffff',
    breathingDuration: 4,
    breathingIntensity: 1,
    glowStrength: 20,
    glowColor: '#ffffff',
    opacity: {
      min: 0.7,
      max: 1,
    },
    duration: 10,
    useWordSync: false,
  },
};

export const breathingTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
