/**
 * Elastic Spring Typography Preset
 *
 * This preset creates smooth elastic typography where text behaves like it's attached to soft springs.
 * Each word drops from above with gravity acceleration, overshoots its target position, bounces back up,
 * and settles with micro-bounces. Features subtle horizontal sway and rotation that corresponds to vertical
 * movement, creating a playful hanging-string effect perfect for brand videos.
 *
 * Features:
 * - **Spring Physics**: Realistic gravity-based drop with momentum
 * - **Multi-Stage Bounce**: 10-15% overshoot, 5% bounce back, 1-2% micro-bounce
 * - **Horizontal Sway**: Subtle side-to-side movement as if hanging from strings
 * - **Correlated Rotation**: Tilts forward on drop, backward on bounce
 * - **Staggered Animation**: Words cascade with 150ms delay
 * - **Physics-Based Timing**: 500ms drop, 200ms first bounce, 150ms second, 100ms settle
 *
 * Use cases:
 * - Creating playful brand video intros
 * - Adding personality to title sequences
 * - Building energetic text reveals
 * - Creating dynamic animated typography effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- Parameters Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('Elastic Typography')
    .describe('Text content to display with elastic spring effect'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(300)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  letterSpacing: z
    .number()
    .min(-10)
    .max(50)
    .default(2)
    .describe('Letter spacing in pixels for better readability'),
  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between words in pixels'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the preset relative to parent (seconds)'),
  
  // Physics parameters
  dropHeight: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Initial drop height as percentage (200 = 200% above target)'),
  overshootAmount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('First overshoot amount as percentage (15 = 15% below target)'),
  firstBounceAmount: z
    .number()
    .min(2)
    .max(15)
    .default(5)
    .describe('First bounce height as percentage (5 = 5% above target)'),
  microBounceAmount: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Final micro-bounce height as percentage (2 = 2% below target)'),
  
  // Timing parameters (in milliseconds)
  dropDuration: z
    .number()
    .min(100)
    .max(2000)
    .default(500)
    .describe('Initial drop duration in milliseconds'),
  firstBounceDuration: z
    .number()
    .min(50)
    .max(1000)
    .default(200)
    .describe('First bounce duration in milliseconds'),
  secondBounceDuration: z
    .number()
    .min(50)
    .max(1000)
    .default(150)
    .describe('Second bounce duration in milliseconds'),
  settleDuration: z
    .number()
    .min(50)
    .max(500)
    .default(100)
    .describe('Final settle duration in milliseconds'),
  
  // Rotation parameters
  initialRotation: z
    .number()
    .min(-45)
    .max(0)
    .default(-5)
    .describe('Initial rotation angle in degrees (negative = tilt forward)'),
  overshootRotation: z
    .number()
    .min(0)
    .max(45)
    .default(3)
    .describe('Rotation at overshoot point in degrees (positive = tilt backward)'),
  bounceRotation: z
    .number()
    .min(-10)
    .max(0)
    .default(-1)
    .describe('Rotation at bounce point in degrees (negative = slight forward tilt)'),
  
  // Horizontal sway parameters
  maxSwayDistance: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum horizontal sway distance as percentage'),
  swayReturnDistance: z
    .number()
    .min(-5)
    .max(0)
    .default(-1)
    .describe('Horizontal sway return distance as percentage (negative = opposite direction)'),
  
  // Stagger parameters
  wordStaggerDelay: z
    .number()
    .min(0)
    .max(1000)
    .default(150)
    .describe('Delay between each word animation start in milliseconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Calculate timing progress points based on durations
  const totalAnimDuration =
    params.dropDuration +
    params.firstBounceDuration +
    params.secondBounceDuration +
    params.settleDuration;
  const totalAnimDurationSec = totalAnimDuration / 1000;

  const prog1 = params.dropDuration / totalAnimDuration; // End of drop (overshoot)
  const prog2 =
    (params.dropDuration + params.firstBounceDuration) / totalAnimDuration; // End of first bounce
  const prog3 =
    (params.dropDuration +
      params.firstBounceDuration +
      params.secondBounceDuration) /
    totalAnimDuration; // End of second bounce
  const prog4 = 1.0; // Final settle

  // Create word components with staggered elastic animations
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `elastic-word-${index}`;
    const wordStartDelay = (index * params.wordStaggerDelay) / 1000; // Convert to seconds

    // Create elastic bounce effect
    const elasticEffect: GenericEffectData = {
      type: 'linear', // Use linear for precise control over keyframes
      start: wordStartDelay,
      duration: totalAnimDurationSec,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Vertical translation (translateY)
        { key: 'translateY', val: -params.dropHeight, prog: 0 }, // Start high above
        { key: 'translateY', val: params.overshootAmount, prog: prog1 }, // Overshoot down
        { key: 'translateY', val: -params.firstBounceAmount, prog: prog2 }, // Bounce back up
        { key: 'translateY', val: params.microBounceAmount, prog: prog3 }, // Micro-bounce down
        { key: 'translateY', val: 0, prog: prog4 }, // Settle at rest

        // Horizontal sway (translateX)
        { key: 'translateX', val: 0, prog: 0 }, // Start centered
        { key: 'translateX', val: params.maxSwayDistance, prog: prog1 }, // Sway right on overshoot
        { key: 'translateX', val: params.swayReturnDistance, prog: prog2 }, // Sway left on bounce
        { key: 'translateX', val: 0, prog: prog4 }, // Return to center

        // Rotation (rotateZ)
        { key: 'rotateZ', val: params.initialRotation, prog: 0 }, // Tilt forward initially
        { key: 'rotateZ', val: params.overshootRotation, prog: prog1 }, // Tilt backward on overshoot
        { key: 'rotateZ', val: params.bounceRotation, prog: prog2 }, // Slight forward tilt on bounce
        { key: 'rotateZ', val: 0, prog: prog4 }, // Settle upright
      ],
    };

    const effect = {
      id: `elastic-bounce-${wordId}`,
      componentId: 'generic',
      data: elasticEffect,
    };

    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          letterSpacing: `${params.letterSpacing}px`,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
    };

    return wordComponent;
  });

  // Root container for words layout
  const rootContainer: RenderableComponentData = {
    id: 'elastic-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          gap: `${params.wordSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: wordComponents,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'elasticSpringTypography',
  title: 'Elastic Spring Typography',
  description:
    'Smooth elastic typography preset where text behaves like it\'s attached to soft springs, gently bouncing into place with momentum-based physics. Each word drops from above with gravity acceleration, overshoots its target position by 10-15%, bounces back up slightly (5%), then settles with a final micro-bounce (1-2%). Features subtle horizontal sway and rotation that corresponds to vertical movement, creating a playful hanging-string effect perfect for brand videos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'elastic',
    'spring',
    'bounce',
    'physics',
    'kinetic',
    'playful',
    'brand',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Elastic Typography',
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    letterSpacing: 2,
    wordSpacing: 16,
    duration: 10,
    startTime: 0,
    dropHeight: 200,
    overshootAmount: 15,
    firstBounceAmount: 5,
    microBounceAmount: 2,
    dropDuration: 500,
    firstBounceDuration: 200,
    secondBounceDuration: 150,
    settleDuration: 100,
    initialRotation: -5,
    overshootRotation: 3,
    bounceRotation: -1,
    maxSwayDistance: 2,
    swayReturnDistance: -1,
    wordStaggerDelay: 150,
  },
};

// --- Export ---
export const elasticSpringTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
