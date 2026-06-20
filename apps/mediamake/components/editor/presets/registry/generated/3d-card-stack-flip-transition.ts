/**
 * 3D Card Stack Flip Transition Preset
 *
 * Creates a stunning 3D card stack transition where videos split into 5 layered cards
 * that flip away with different axes (horizontal, vertical, diagonal) revealing the
 * incoming video cards underneath.
 *
 * Features:
 * - **Multi-Layer Card System**: Splits each video into 5 stacked cards
 * - **Varied Flip Axes**: Cards flip horizontally (rotateY), vertically (rotateX), and diagonally (rotate3d)
 * - **Staggered Timing**: 150ms delays between card animations for cascading effect
 * - **Depth Animations**: translateZ movements create depth during flips
 * - **Dynamic Shadows**: Box-shadow effects that change based on rotation angle
 * - **Spread Effect**: Cards move outward from center before flipping
 * - **Spring Physics**: Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for realistic motion
 * - **Clean Backface Handling**: backface-visibility: hidden for smooth flips
 *
 * Use cases:
 * - Creating dramatic video transitions with 3D effects
 * - Building cinematic card-based reveal sequences
 * - Adding dynamic perspective animations to video content
 * - Creating multi-layered 3D transition effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  perspective: z
    .number()
    .default(1000)
    .describe('Perspective distance in pixels for 3D effect'),
  cardCount: z
    .number()
    .default(5)
    .describe('Number of card layers per video'),
  staggerDelay: z
    .number()
    .default(0.15)
    .describe('Delay between card animations in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    perspective,
    cardCount,
    staggerDelay,
  } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper: Calculate card inset values for spread effect
  const calculateCardInset = (index: number, total: number): string => {
    const spreadFactor = 2; // pixels to spread per card
    const offset = (index - Math.floor(total / 2)) * spreadFactor;
    return `${offset}px`;
  };

  // Helper: Create flip effect for video1 cards (outgoing)
  const createOutgoingCardEffect = (
    cardId: string,
    index: number,
    flipType: 'rotateY' | 'rotateX' | 'rotate3d',
    direction: { x: number; y: number },
  ) => {
    const effectStart = video1.duration - transitionDuration + index * staggerDelay;
    
    const baseRanges = [
      // Spread from center
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: direction.x * 80, prog: 0.3 },
      { key: 'translateX', val: direction.x * 200, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: direction.y * 60, prog: 0.3 },
      { key: 'translateY', val: direction.y * 150, prog: 1 },
      // Depth animation
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: 50, prog: 0.5 },
      { key: 'translateZ', val: -50, prog: 1 },
      // Fade out
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.9 },
    ];

    // Add rotation based on flip type
    if (flipType === 'rotateY') {
      baseRanges.push(
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: direction.x > 0 ? 180 : -180, prog: 1 },
      );
    } else if (flipType === 'rotateX') {
      baseRanges.push(
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: direction.y > 0 ? 180 : -180, prog: 1 },
      );
    } else {
      // rotate3d - diagonal flip
      baseRanges.push(
        { key: 'rotate3dX', val: 1, prog: 0 },
        { key: 'rotate3dY', val: 1, prog: 0 },
        { key: 'rotate3dZ', val: 0, prog: 0 },
        { key: 'rotate3dAngle', val: 0, prog: 0 },
        { key: 'rotate3dAngle', val: 180, prog: 1 },
      );
    }

    return {
      id: `${cardId}-flip-effect`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: effectStart,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [cardId],
        ranges: baseRanges,
      },
    };
  };

  // Helper: Create shadow effect
  const createShadowEffect = (cardId: string, index: number) => {
    const effectStart = video1.duration - transitionDuration + index * staggerDelay;
    
    return {
      id: `${cardId}-shadow-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: effectStart,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [cardId],
        ranges: [
          { key: 'boxShadow', val: '0 4px 20px rgba(0,0,0,0.3)', prog: 0 },
          { key: 'boxShadow', val: '0 20px 60px rgba(0,0,0,0.6)', prog: 0.5 },
          { key: 'boxShadow', val: '0 0px 0px rgba(0,0,0,0)', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create incoming card effect for video2
  const createIncomingCardEffect = (cardId: string, index: number) => {
    const effectStart = index * staggerDelay;
    
    return {
      id: `${cardId}-entry-effect`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: effectStart,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [cardId],
        ranges: [
          // Start from behind
          { key: 'translateZ', val: -100, prog: 0 },
          { key: 'translateZ', val: 0, prog: 1 },
          // Fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          // Scale up
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Define flip types and directions for each card
  const cardConfigs = [
    { flipType: 'rotateY' as const, direction: { x: -1, y: -1 } }, // Top-left, horizontal
    { flipType: 'rotateX' as const, direction: { x: 1, y: -1 } },  // Top-right, vertical
    { flipType: 'rotate3d' as const, direction: { x: 0, y: -1 } }, // Top-center, diagonal
    { flipType: 'rotateY' as const, direction: { x: -1, y: 1 } },  // Bottom-left, horizontal
    { flipType: 'rotateX' as const, direction: { x: 1, y: 1 } },   // Bottom-right, vertical
  ];

  // Create video1 cards (outgoing)
  const video1Cards: RenderableComponentData[] = [];
  for (let i = 0; i < cardCount; i++) {
    const cardId = `video1-card-${i}`;
    const config = cardConfigs[i % cardConfigs.length];
    const insetValue = calculateCardInset(i, cardCount);

    video1Cards.push({
      id: cardId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute',
        style: {
          inset: insetValue,
          objectFit: 'cover',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        createOutgoingCardEffect(cardId, i, config.flipType, config.direction),
        createShadowEffect(cardId, i),
      ],
    } as RenderableComponentData);
  }

  // Create video2 cards (incoming)
  const video2Cards: RenderableComponentData[] = [];
  for (let i = 0; i < cardCount; i++) {
    const cardId = `video2-card-${i}`;
    const insetValue = calculateCardInset(i, cardCount);

    video2Cards.push({
      id: cardId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute',
        style: {
          inset: insetValue,
          objectFit: 'cover',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [createIncomingCardEffect(cardId, i)],
    } as RenderableComponentData);
  }

  // Video1 container
  const video1Container: RenderableComponentData = {
    id: 'video1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: video1Cards,
  };

  // Video2 container
  const video2Container: RenderableComponentData = {
    id: 'video2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: video2Cards,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'card-stack-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [video1Container, video2Container],
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
  id: '3d-card-stack-flip-transition',
  title: '3D Card Stack Flip Transition',
  description:
    'A sophisticated 3D card stack transition where videos split into 5 layered cards that flip away with different axes (horizontal, vertical, diagonal) revealing the incoming video underneath. Features realistic physics with spring easing, depth animations, dynamic shadows, and a spread effect from center.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cards', 'flip', 'stack', 'video', 'perspective'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
    perspective: 1000,
    cardCount: 5,
    staggerDelay: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cardStackFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
