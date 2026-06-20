/**
 * Venetian Blinds Gradient Transition Preset
 *
 * A premium, Apple-inspired transition featuring smooth gradient-masked vertical blinds.
 * Each blind is a soft-edged vertical strip that slides horizontally in alternating directions
 * (odd strips slide left, even strips slide right) with a subtle scale transformation that
 * creates a gentle zoom effect. The gradient masks create organic, flowing transitions
 * rather than hard-edged blinds, perfect for elegant presentations and motion design work.
 *
 * Features:
 * - 12 vertical gradient-masked blinds with soft edges
 * - Alternating slide directions (odd left, even right)
 * - Subtle scale effect (1.0 to 1.05) for zoom feel
 * - Cubic-bezier easing for iOS-style smoothness
 * - 100ms stagger delay between blinds for cascading reveal
 * - Multiply blend mode for smooth overlapping
 * - GPU-accelerated with backdrop blur
 * - 2-second total animation duration
 *
 * Use cases:
 * - Elegant scene transitions in presentations
 * - Premium product reveal animations
 * - Apple-style motion design workflows
 * - Sophisticated video intros/outros
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the transition in seconds'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each blind animation in seconds'),
  scaleAmount: z
    .number()
    .default(1.05)
    .describe('Maximum scale factor for zoom effect (1.0 = no zoom)'),
  numberOfBlinds: z
    .number()
    .default(12)
    .describe('Number of vertical blinds (strips)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, staggerDelay, scaleAmount, numberOfBlinds } = params;

  // Helper function to create a single blind strip
  const createBlind = (index: number): RenderableComponentData => {
    const isOdd = index % 2 === 0; // Even index = odd strip (0-indexed)
    const blindWidth = 100 / numberOfBlinds;
    const leftPosition = index * blindWidth;

    // Gradient direction alternates
    const gradientClass = isOdd
      ? 'bg-gradient-to-r from-black via-black/80 to-transparent'
      : 'bg-gradient-to-l from-black via-black/80 to-transparent';

    // Translate direction alternates (odd left, even right)
    const translateStart = isOdd ? '-100%' : '100%';
    const translateEnd = '0%';

    // Calculate staggered start time
    const effectStart = index * staggerDelay;

    return {
      id: `blind-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute h-full ${gradientClass} mix-blend-multiply transform-gpu backdrop-blur-sm`,
          style: {
            left: `${leftPosition}%`,
            width: `${blindWidth}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `blind-${index}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStart,
            duration: duration,
            mode: 'provider',
            targetIds: [`blind-${index}`],
            ranges: [
              // Horizontal slide
              { key: 'translateX', val: translateStart, prog: 0 },
              { key: 'translateX', val: translateEnd, prog: 0.5 },
              { key: 'translateX', val: translateEnd, prog: 1 },
              // Scale zoom
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: scaleAmount, prog: 0.5 },
              { key: 'scale', val: scaleAmount, prog: 0.8 },
              { key: 'scale', val: 1.0, prog: 1 },
              // Opacity fade in final 20%
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
  };

  // Generate all blinds
  const blinds: RenderableComponentData[] = Array.from(
    { length: numberOfBlinds },
    (_, index) => createBlind(index),
  );

  // Calculate total animation duration (last blind start + duration)
  const totalDuration = (numberOfBlinds - 1) * staggerDelay + duration;

  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: blinds,
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
  id: 'venetian-blinds-gradient-transition',
  title: 'Apple-Style Gradient Venetian Blinds Transition',
  description:
    'Premium gradient-masked vertical blinds transition with soft-edged strips, alternating horizontal slide directions, scale transformation (1.0 to 1.05), and cubic-bezier easing. Features 12 vertical strips with gradient backgrounds (odd: left-to-right gradient, even: right-to-left gradient), staggered timing (100ms per blind), and multiply blend mode for smooth overlapping. GPU-accelerated with backdrop-blur for an organic, Apple presentation-style feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'venetian-blinds',
    'gradient',
    'apple-style',
    'elegant',
    'smooth',
    'premium',
    'motion-design',
  ],
  defaultInputParams: {
    duration: 2,
    staggerDelay: 0.1,
    scaleAmount: 1.05,
    numberOfBlinds: 12,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindsGradientTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
