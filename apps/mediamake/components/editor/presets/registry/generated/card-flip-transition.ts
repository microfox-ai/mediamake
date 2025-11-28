/**
 * Card Flip Transition Preset
 *
 * A minimalist card-flip transition preset that creates clean, geometric Y-axis flip animations
 * between scenes. Features staggered timing with outgoing content flipping out (0-0.4s) while
 * incoming content flips in (0.35s-0.75s) for dramatic overlap. Includes subtle scale effect
 * (shrinking to 0.95 at midpoint), 3D perspective (800px), spring easing with bounce for snappy
 * modern feel, and intensifying box-shadow during flip.
 *
 * Features:
 * - **Card-flip Animation**: Clean geometric Y-axis rotation with 3D perspective
 * - **Staggered Timing**: Outgoing flips 0-0.4s, incoming starts at 0.35s for dramatic overlap
 * - **Depth Effect**: Subtle scale to 0.95 at midpoint creates depth perception
 * - **Edge-on Moment**: Both cards at 90 degrees creating dramatic reveal
 * - **Spring Easing**: Snappy animation with slight bounce at end
 * - **Shadow Effects**: Box-shadow intensifies during flip for enhanced depth
 * - **Modern Design**: Perfect for social media stories, product galleries, flashcards
 *
 * Use cases:
 * - Rapid content browsing (social media stories)
 * - Product gallery transitions
 * - Flashcard-style presentations
 * - Modern UI transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.75)
    .describe('Total duration of the card flip transition in seconds'),
  outgoingFlipDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Duration of outgoing card flip animation in seconds'),
  incomingStartOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.35)
    .describe('When incoming card starts flipping (seconds from start)'),
  perspective: z
    .number()
    .min(200)
    .max(2000)
    .default(800)
    .describe('3D perspective depth in pixels'),
  scaleMidpoint: z
    .number()
    .min(0.8)
    .max(1)
    .default(0.95)
    .describe('Scale factor at flip midpoint (0-1)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(40)
    .default(20)
    .describe('Maximum shadow blur at flip midpoint in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    outgoingFlipDuration,
    incomingStartOffset,
    perspective,
    scaleMidpoint,
    shadowIntensity,
  } = params;

  // Calculate incoming flip duration to complete by transitionDuration
  const incomingFlipDuration = transitionDuration - incomingStartOffset;

  const childrenData: RenderableComponentData[] = [
    // Outgoing card (current content)
    {
      id: 'card-flip-outgoing',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backfaceVisibility: 'hidden' as const,
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: outgoingFlipDuration,
            mode: 'provider',
            targetIds: ['card-flip-outgoing'],
            ranges: [
              // Rotate from 0 to 90 degrees
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 90, prog: 1 },
              // Scale down to midpoint
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleMidpoint, prog: 1 },
              // Opacity fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-shadow-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: outgoingFlipDuration,
            mode: 'provider',
            targetIds: ['card-flip-outgoing'],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(0px 0px ${shadowIntensity}px rgba(0,0,0,0.5))`,
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'outgoing-content-slot',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'w-full h-full flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: [],
        },
      ],
    } as RenderableComponentData,

    // Incoming card (next content)
    {
      id: 'card-flip-incoming',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backfaceVisibility: 'hidden' as const,
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-flip-effect',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: incomingStartOffset,
            duration: incomingFlipDuration,
            mode: 'provider',
            targetIds: ['card-flip-incoming'],
            ranges: [
              // Rotate from -90 to 0 degrees (opposite direction)
              { key: 'rotateY', val: -90, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              // Scale from midpoint to normal
              { key: 'scale', val: scaleMidpoint, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-shadow-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingStartOffset,
            duration: incomingFlipDuration,
            mode: 'provider',
            targetIds: ['card-flip-incoming'],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0px 0px ${shadowIntensity}px rgba(0,0,0,0.5))`,
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-content-slot',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'w-full h-full flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: [],
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'card-flip-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'card-flip-transition',
  title: 'Card Flip Transition',
  description:
    'A minimalist card-flip transition preset that creates clean, geometric Y-axis flip animations between scenes. Features staggered timing with outgoing content flipping out (0-0.4s) while incoming content flips in (0.35s-0.75s) for dramatic overlap. Includes subtle scale effect (shrinking to 0.95 at midpoint), 3D perspective (800px), spring easing with bounce for snappy modern feel, and intensifying box-shadow during flip. Perfect for rapid content browsing like social media stories, product galleries, or flashcard-style presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'card-flip', 'animation', 'modern', '3d', 'geometric'],
  defaultInputParams: {
    transitionDuration: 0.75,
    outgoingFlipDuration: 0.4,
    incomingStartOffset: 0.35,
    perspective: 800,
    scaleMidpoint: 0.95,
    shadowIntensity: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cardFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
