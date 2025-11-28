/**
 * Liquid Drip Typography Preset
 *
 * A physics-inspired typography preset where letters drip down like honey or syrup.
 * Letters start stretched vertically (scaleY: 2.5, scaleX: 0.7), contract as they fall,
 * overshoot their target position, bounce back, then settle into place.
 *
 * Features:
 * - Multi-stage animation with anticipation and follow-through
 * - Color desaturation during motion (emphasizes motion blur effect)
 * - Staggered letter animations
 * - Post-animation ripple wave effect across all letters
 * - GPU-optimized using only transform and filter properties
 *
 * Animation Stages:
 * 1. Drip Fall (0-0.4s): Letters fall from above, stretched vertically, contracting
 * 2. Bounce Overshoot (0.4-0.6s): Letters overshoot target, compress horizontally
 * 3. Settle (0.6-0.8s): Letters return to normal proportions
 * 4. Ripple Effect (triggers 0.3s after last letter completes): Sine wave across text
 *
 * Use Cases:
 * - Dynamic title sequences
 * - Motion graphics text reveals
 * - Kinetic typography for videos
 * - Creative text animations with physics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to animate with liquid drip effect'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(80)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (hex or rgba)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.06)
    .optional()
    .describe('Delay between letter animations in seconds'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(0.8)
    .optional()
    .describe('Duration of main drip animation per letter in seconds'),
  rippleDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Delay after last letter completes before ripple starts'),
  rippleDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .optional()
    .describe('Duration of the ripple wave effect'),
  rippleAmplitude: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .optional()
    .describe('Amplitude of ripple wave in pixels'),
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text on screen'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = 80,
    fontFamily = 'Inter:700',
    textColor = '#FFFFFF',
    staggerDelay = 0.06,
    animationDuration = 0.8,
    rippleDelay = 0.3,
    rippleDuration = 0.6,
    rippleAmplitude = 8,
    position = 'center',
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontStr: string) => {
    const parts = fontStr.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : 700;
    const style = parts.length > 2 ? parts[2] : 'normal';
    return { family, weight, style };
  };

  const { family: fontFamilyName, weight: fontWeight, style: fontStyle } = parseFontString(fontFamily);

  // Helper: Create letter component with drip animation
  const createLetterComponent = (
    letter: string,
    index: number,
    totalLetters: number,
  ): RenderableComponentData => {
    const letterId = `liquid-letter-${index}`;
    const containerStartTime = index * staggerDelay;

    // Calculate timing for ripple effect
    const lastLetterCompletes = (totalLetters - 1) * staggerDelay + animationDuration;
    const rippleStartTime = lastLetterCompletes + rippleDelay;
    const letterRippleDelay = index * 0.05; // Stagger ripple across letters

    // Stage 1: Drip fall (0-0.4s relative)
    const stage1Duration = animationDuration * 0.5;
    // Stage 2: Bounce overshoot (0.4-0.6s relative)
    const stage2Start = stage1Duration;
    const stage2Duration = animationDuration * 0.25;
    // Stage 3: Settle (0.6-0.8s relative)
    const stage3Start = stage1Duration + stage2Duration;
    const stage3Duration = animationDuration * 0.25;

    // Create multi-stage drip animation
    const dripEffect = {
      id: `drip-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: animationDuration,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // Stage 1: Drip fall
          // ScaleY: 2.5 → 0.9
          { key: 'scaleY', val: 2.5, prog: 0 },
          { key: 'scaleY', val: 0.9, prog: 0.5 },
          // ScaleX: 0.7 → 1.1
          { key: 'scaleX', val: 0.7, prog: 0 },
          { key: 'scaleX', val: 1.1, prog: 0.5 },
          // TranslateY: -100px → 10px
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: 10, prog: 0.5 },
          // Opacity: 0.6 → 1
          { key: 'opacity', val: 0.6, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          // Brightness: 0.8 → 1
          { key: 'brightness', val: 0.8, prog: 0 },
          { key: 'brightness', val: 1, prog: 0.5 },

          // Stage 2: Bounce overshoot (ease-in-out)
          // ScaleY: 0.9 → 1.05
          { key: 'scaleY', val: 1.05, prog: 0.75 },
          // ScaleX: 1.1 → 0.95
          { key: 'scaleX', val: 0.95, prog: 0.75 },
          // TranslateY: 10px → -5px
          { key: 'translateY', val: -5, prog: 0.75 },

          // Stage 3: Settle to final state
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'brightness', val: 1, prog: 1 },
        ],
      },
    };

    // Ripple effect (sine wave translateY)
    const rippleEffect = {
      id: `ripple-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: rippleStartTime + letterRippleDelay,
        duration: rippleDuration,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -rippleAmplitude, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: rippleAmplitude * 0.5, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    // Letter container with transform-origin: bottom center
    const letterContainer: RenderableComponentData = {
      id: `container-${letterId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            transformOrigin: 'bottom center',
            display: 'inline-block',
          },
        },
      },
      context: {
        timing: {
          start: containerStartTime,
          duration: rippleStartTime + letterRippleDelay + rippleDuration,
        },
      },
      effects: [dripEffect, rippleEffect],
      childrenData: [
        {
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
            style: {
              fontSize: fontSize,
              fontWeight: fontWeight,
              fontStyle: fontStyle as any,
              color: textColor,
              display: 'inline-block',
            },
            font: {
              family: fontFamilyName,
              weights: [fontWeight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: rippleStartTime + letterRippleDelay + rippleDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    };

    return letterContainer;
  };

  // Split text into letters
  const letters = text.split('');

  // Create letter components
  const letterComponents = letters.map((letter, index) =>
    createLetterComponent(letter, index, letters.length),
  ) as RenderableComponentData[];

  // Calculate total duration
  const lastLetterStart = (letters.length - 1) * staggerDelay;
  const lastLetterCompletes = lastLetterStart + animationDuration;
  const rippleStartTime = lastLetterCompletes + rippleDelay;
  const lastLetterRippleDelay = (letters.length - 1) * 0.05;
  const totalDuration = rippleStartTime + lastLetterRippleDelay + rippleDuration;

  // Position styles
  const getPositionClass = () => {
    switch (position) {
      case 'top':
        return 'items-start justify-center';
      case 'bottom':
        return 'items-end justify-center';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-drip-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-wrap ${getPositionClass()} overflow-visible`,
        style: {
          width: '100%',
          height: '100%',
          position: 'relative' as const,
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'liquid-drip-typography',
  title: 'Liquid Drip Typography',
  description:
    'A physics-inspired typography preset where letters drip down like honey or syrup, stretching vertically before snapping into place with satisfying bounce. Features multi-stage animation with anticipation and follow-through principles: letters start stretched (scaleY: 2.5, scaleX: 0.7), contract and overshoot, then settle. Includes color desaturation during motion and a post-animation ripple wave effect across all letters. GPU-optimized using only transform and filter properties.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'liquid',
    'drip',
    'physics',
    'animation',
    'motion-graphics',
    'text',
    'bounce',
    'ripple',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID TEXT',
    fontSize: 80,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    staggerDelay: 0.06,
    animationDuration: 0.8,
    rippleDelay: 0.3,
    rippleDuration: 0.6,
    rippleAmplitude: 8,
    position: 'center',
  },
};

// --- Export ---

export const liquidDripTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
