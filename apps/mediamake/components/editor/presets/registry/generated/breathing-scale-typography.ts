/**
 * Breathing Scale Typography Preset
 *
 * This preset implements a gentle scaling animation for words, starting from 90% scale
 * and growing to 100% as they appear. Each word breathes into existence with a smooth
 * ease-out curve, creating a cascading reveal effect like ripples moving through the text.
 *
 * Features:
 * - Gentle scale animation from 0.9 to 1.0 per word
 * - Subtle opacity fade from 0.8 to 1.0 for enhanced breathing effect
 * - Staggered timing with cascading reveal (0.08s delay between words)
 * - GPU-accelerated transforms with will-change optimization
 * - Flex layout with word wrapping and centered alignment
 *
 * Use cases:
 * - Creating smooth title reveals similar to After Effects keyframe animations
 * - Building wave-like text progressions for video intros
 * - Adding breathing life to typography with minimal but elegant motion
 * - Creating center-scaled word animations for any text content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================
// PARAMETER SCHEMA
// ============================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with breathing scale animation'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for the text'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color in CSS format (hex, rgb, etc.)'),
  textShadow: z
    .string()
    .default('0 2px 8px rgba(0, 0, 0, 0.3)')
    .optional()
    .describe('CSS text shadow for depth and readability'),
  duration: z
    .number()
    .min(0.1)
    .default(5)
    .optional()
    .describe('Total duration for the text display in seconds'),
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .optional()
    .describe('Gap between words in pixels'),
  scaleDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .optional()
    .describe('Duration of scale animation per word in seconds'),
  scaleStart: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Starting scale value (0.9 = 90% size)'),
  scaleEnd: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Ending scale value (1.0 = 100% size)'),
  opacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Starting opacity value (0.8 = 80% opacity)'),
  opacityEnd: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Ending opacity value (1.0 = 100% opacity)'),
  wordDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.08)
    .optional()
    .describe('Delay between word animations in seconds (creates cascade effect)'),
  easing: z
    .enum(['ease-out', 'ease-in', 'ease-in-out', 'linear', 'spring'])
    .default('ease-out')
    .optional()
    .describe('Easing function for the animation'),
});

// ============================================================
// PRESET EXECUTION
// ============================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const fontSize = params.fontSize ?? 48;
  const fontWeight = params.fontWeight ?? '700';
  const fontFamily = params.fontFamily ?? 'Inter';
  const textColor = params.textColor ?? '#ffffff';
  const textShadow = params.textShadow ?? '0 2px 8px rgba(0, 0, 0, 0.3)';
  const duration = params.duration ?? 5;
  const wordGap = params.wordGap ?? 8;
  const scaleDuration = params.scaleDuration ?? 0.4;
  const scaleStart = params.scaleStart ?? 0.9;
  const scaleEnd = params.scaleEnd ?? 1;
  const opacityStart = params.opacityStart ?? 0.8;
  const opacityEnd = params.opacityEnd ?? 1;
  const wordDelay = params.wordDelay ?? 0.08;
  const easing = params.easing ?? 'ease-out';

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Create word components with staggered breathing animations
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `breathing-word-${index}`;
    const wordStartTime = index * wordDelay;

    // Create breathing scale effect for this word
    const breathingEffect: GenericEffectData = {
      type: easing,
      start: wordStartTime,
      duration: scaleDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale animation from 90% to 100%
        { key: 'scale', val: scaleStart, prog: 0 },
        { key: 'scale', val: scaleEnd, prog: 1 },
        // Opacity fade from 80% to 100%
        { key: 'opacity', val: opacityStart, prog: 0 },
        { key: 'opacity', val: opacityEnd, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textShadow: textShadow,
          willChange: 'transform, opacity', // GPU acceleration hint
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          display: 'swap',
          preload: true,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration, // All words use full duration
        },
      },
      effects: [
        {
          id: `breathing-effect-${index}`,
          componentId: 'generic',
          data: breathingEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Create root container with flex layout
  const rootContainer: RenderableComponentData = {
    id: 'breathing-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-center justify-center',
        style: {
          position: 'absolute',
          inset: '0',
          gap: `${wordGap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
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

// ============================================================
// PRESET METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'breathing-scale-typography',
  title: 'Breathing Scale Typography',
  description:
    'A typography preset that implements gentle scaling animation for words with a cascading reveal effect. Words breathe into existence from 90% to 100% scale with subtle opacity fade (0.8 to 1.0), creating a wave-like progression through text. Uses BaseLayout with flex layout and individual TextAtom components for each word with staggered timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'scale',
    'breathing',
    'cascade',
    'reveal',
    'kinetic',
    'motion',
    'smooth',
    'gentle',
    'wave',
    'ripple',
    'after-effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Breathe life into your words',
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    duration: 5,
    wordGap: 8,
    scaleDuration: 0.4,
    scaleStart: 0.9,
    scaleEnd: 1,
    opacityStart: 0.8,
    opacityEnd: 1,
    wordDelay: 0.08,
    easing: 'ease-out',
  },
};

// ============================================================
// PRESET EXPORT
// ============================================================

export const breathingScaleTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: presetParams,
};