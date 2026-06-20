/**
 * Typewriter Stamp Text Reveal Preset
 *
 * This preset creates a typewriter-inspired stop motion text reveal where each letter 'stamps'
 * into place with mechanical precision. Features include:
 * - Instant letter appearance (no fade) with translateY bounce-back motion
 * - Subtle rotation wobble to simulate mechanical imperfection
 * - Baseline shift to mimic vintage paper feed inconsistencies
 * - Mechanical rhythm with precise 50ms letter delays
 *
 * Use cases:
 * - Vintage typography effects
 * - Retro typewriter animations
 * - Mechanical text reveals
 * - Stop motion style text effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to reveal with typewriter effect'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "CourierPrime")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  letterDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each letter stamp in seconds (mechanical rhythm)'),
  bounceHeight: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Height of the bounce-back motion in pixels'),
  bounceDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Duration of the bounce settle animation in seconds'),
  wobbleIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Intensity of the rotation wobble (0-3 degrees)'),
  baselineShift: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum vertical baseline shift in pixels (±)'),
  containerPosition: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Position of the text container on screen'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'CourierPrime';
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

  // Split text into individual letters
  const letters = params.text.split('');

  // Helper function to generate random baseline shift
  const getRandomBaselineShift = (): number => {
    return (Math.random() - 0.5) * 2 * params.baselineShift;
  };

  // Helper function to get alternating wobble direction
  const getWobbleRotation = (index: number): number => {
    const direction = index % 2 === 0 ? 1 : -1;
    return direction * params.wobbleIntensity;
  };

  // Calculate total duration
  const lastLetterStart = (letters.length - 1) * params.letterDelay;
  const totalDuration = lastLetterStart + params.bounceDuration + 0.5; // Add 0.5s buffer

  // Create letter components with effects
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * params.letterDelay;
      const baselineShift = getRandomBaselineShift();
      const wobbleRotation = getWobbleRotation(index);

      // Create the typewriter stamp effect
      const stampEffect: GenericEffectData = {
        type: 'spring',
        start: letterStart,
        duration: params.bounceDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Instant opacity appear (0 to 1 in first frame)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.01 },
          // Bounce-back motion
          { key: 'translateY', val: -params.bounceHeight, prog: 0 },
          { key: 'translateY', val: baselineShift, prog: 1 },
          // Mechanical wobble
          { key: 'rotateZ', val: wobbleRotation * 2, prog: 0 },
          { key: 'rotateZ', val: wobbleRotation * 0.3, prog: 0.5 },
          { key: 'rotateZ', val: 0, prog: 1 },
        ],
      };

      const letterComponent: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Use non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            display: 'inline-block',
            whiteSpace: 'pre',
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
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `stamp-effect-${index}`,
            componentId: 'generic',
            data: stampEffect,
          },
        ],
      };

      return letterComponent;
    },
  );

  // Determine container positioning classes
  let positionClasses = 'absolute inset-0 flex items-center justify-center';
  switch (params.containerPosition) {
    case 'top':
      positionClasses = 'absolute inset-0 flex items-start justify-center pt-20';
      break;
    case 'bottom':
      positionClasses = 'absolute inset-0 flex items-end justify-center pb-20';
      break;
    case 'left':
      positionClasses = 'absolute inset-0 flex items-center justify-start pl-20';
      break;
    case 'right':
      positionClasses = 'absolute inset-0 flex items-center justify-end pr-20';
      break;
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-stamp-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: positionClasses,
        style: {
          display: 'inline-block',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
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
  id: 'typewriter-stamp-reveal',
  title: 'Typewriter Stamp Text Reveal',
  description:
    'A typewriter-inspired stop motion text reveal where each letter "stamps" into place with mechanical precision. Features instant appearance (no fade), bounce-back motion mimicking typewriter hammer strikes, subtle rotation wobble for mechanical imperfection, and baseline shift to simulate vintage paper feed inconsistencies. Each letter appears at precisely timed intervals (50ms) for that mechanical rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'stamp',
    'reveal',
    'mechanical',
    'vintage',
    'retro',
    'animation',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'TYPEWRITER EFFECT',
    font: 'CourierPrime:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    letterDelay: 0.05,
    bounceHeight: 5,
    bounceDuration: 0.15,
    wobbleIntensity: 1,
    baselineShift: 2,
    containerPosition: 'center',
  },
};

// Export preset
export const typewriterStampRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
