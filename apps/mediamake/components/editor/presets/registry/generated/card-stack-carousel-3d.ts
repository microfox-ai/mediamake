/**
 * 3D Card Stack Carousel Preset
 *
 * This preset creates a sleek horizontal card stack carousel with realistic 3D flip transitions,
 * mimicking a deck of cards being dealt. Each image starts as a card in a stacked deck, then
 * flips out with realistic physics to reveal the next.
 *
 * Features:
 * - **Two-Phase Animation**: Cards lift up slightly, then rotate with acceleration
 * - **Depth Layering**: Cards behind are slightly smaller and offset in 3D space
 * - **Paper Texture Overlay**: Subtle texture for tactile feel
 * - **Drop Shadows**: Dynamic shadows based on card position in stack
 * - **Navigation Dots**: Pulsing indicators showing active card
 * - **Spring Physics**: Natural motion with acceleration curves
 *
 * Use cases:
 * - Creating engaging image carousels with 3D effects
 * - Building product showcases with card-flip animations
 * - Adding dynamic gallery presentations
 * - Creating interactive card-based interfaces
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL or local path'),
      }),
    )
    .min(1)
    .describe('Array of images to display in the card stack'),
  duration: z
    .number()
    .default(20)
    .describe('Total duration of the carousel in seconds'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe(
      'Duration of each card transition (lift + flip phases) in seconds',
    ),
  holdDuration: z
    .number()
    .default(2)
    .describe('Duration to hold each card before transitioning in seconds'),
  textureOverlay: z
    .boolean()
    .default(true)
    .describe('Whether to show paper texture overlay'),
  showNavigationDots: z
    .boolean()
    .default(true)
    .describe('Whether to show navigation dots'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    transitionDuration,
    holdDuration,
    textureOverlay,
    showNavigationDots,
  } = params;

  // Calculate cycle duration: transition + hold
  const cycleDuration = transitionDuration + holdDuration;

  // Helper function to create card children
  const createCardChildren = (
    cardId: string,
    imageSrc: string,
    zIndex: number,
    depth: number,
    scale: number,
  ): RenderableComponentData[] => {
    const children: RenderableComponentData[] = [];

    // Image
    children.push({
      id: `${cardId}-image`,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'rounded-lg overflow-hidden w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: cycleDuration,
        },
      },
    } as RenderableComponentData);

    // Texture overlay
    if (textureOverlay) {
      children.push({
        id: `${cardId}-texture`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAC5JREFUeNpiZGBg4GegAsBlIA5gYKAeYBw1dBQMJSBhYGBYCOINUDQKhhoAEGAAMzADAoQ3wP4AAAAASUVORK5CYII=); mix-blend-mode: multiply;"></div>',
          className: 'absolute inset-0 rounded-lg pointer-events-none',
          style: {
            opacity: 0.1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: cycleDuration,
          },
        },
      } as RenderableComponentData);
    }

    return children;
  };

  // Helper function to create card flip effects
  const createCardFlipEffects = (
    cardId: string,
    startTime: number,
  ): any[] => {
    const liftDuration = 0.3;
    const flipDuration = 0.5;

    return [
      // Phase 1: Lift up
      {
        id: `${cardId}-lift`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: startTime,
          duration: liftDuration,
          mode: 'provider',
          targetIds: [cardId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -20, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 1 },
          ],
        },
      },
      // Phase 2: Flip and fade out
      {
        id: `${cardId}-flip`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: startTime + liftDuration,
          duration: flipDuration,
          mode: 'provider',
          targetIds: [cardId],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 90, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Helper function to create card advance effects (move cards forward in stack)
  const createCardAdvanceEffects = (
    cardId: string,
    startTime: number,
    fromDepth: number,
    toDepth: number,
    fromScale: number,
    toScale: number,
  ): any[] => {
    return [
      {
        id: `${cardId}-advance`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: startTime,
          duration: 0.5,
          mode: 'provider',
          targetIds: [cardId],
          ranges: [
            { key: 'translateZ', val: `${fromDepth}px`, prog: 0 },
            { key: 'translateZ', val: `${toDepth}px`, prog: 1 },
            { key: 'scale', val: fromScale, prog: 0 },
            { key: 'scale', val: toScale, prog: 1 },
          ],
        },
      },
    ];
  };

  // Create cards
  const cardComponents: RenderableComponentData[] = [];
  const imageCount = images.length;

  for (let i = 0; i < imageCount; i++) {
    const cardId = `card-${i}`;
    const image = images[i];

    // Calculate initial depth and scale (5 levels max)
    const stackPosition = Math.min(i, 4);
    const initialDepth = -30 * stackPosition;
    const initialScale = 1 - 0.05 * stackPosition;
    const zIndex = 5 - stackPosition;

    // Calculate when this card appears at front and flips
    const cardStartTime = i * cycleDuration;
    const cardFlipTime = cardStartTime + holdDuration;

    // Base card effects
    const effects: any[] = [];

    // Add flip effects for this card
    if (i < imageCount - 1) {
      effects.push(...createCardFlipEffects(cardId, cardFlipTime));
    }

    // Add advance effects for cards behind this one
    if (i > 0) {
      // This card advances when previous card flips
      const advanceTime = (i - 1) * cycleDuration + holdDuration;
      const fromPosition = Math.min(i, 4);
      const toPosition = Math.min(i - 1, 4);
      const fromDepth = -30 * fromPosition;
      const toDepth = -30 * toPosition;
      const fromScale = 1 - 0.05 * fromPosition;
      const toScale = 1 - 0.05 * toPosition;

      effects.push(
        ...createCardAdvanceEffects(
          cardId,
          advanceTime,
          fromDepth,
          toDepth,
          fromScale,
          toScale,
        ),
      );
    }

    // Shadow effect based on position
    const shadowIntensity = 0.5 - stackPosition * 0.1;
    const shadowBlur = 50 - stackPosition * 10;
    const shadowSpread = -12 + stackPosition * 2;

    cardComponents.push({
      id: cardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-3/4 h-3/4',
          style: {
            transformOrigin: 'center bottom',
            transformStyle: 'preserve-3d',
            zIndex,
            transform: `translateZ(${initialDepth}px) scale(${initialScale})`,
            boxShadow: `0 25px ${shadowBlur}px ${shadowSpread}px rgba(0, 0, 0, ${shadowIntensity}), 0 10px 20px rgba(0, 0, 0, ${shadowIntensity * 0.6})`,
            borderRadius: '8px',
          },
        },
      },
      context: {
        timing: {
          start: cardStartTime,
          duration: Math.min(duration - cardStartTime, cycleDuration),
        },
      },
      childrenData: createCardChildren(
        cardId,
        image.src,
        zIndex,
        initialDepth,
        initialScale,
      ),
      effects,
    } as RenderableComponentData);
  }

  // Create navigation dots
  const navigationDots: RenderableComponentData[] = [];
  if (showNavigationDots) {
    for (let i = 0; i < imageCount; i++) {
      const dotId = `nav-dot-${i}`;
      const isActive = i === 0;
      const activeTime = i * cycleDuration;

      const dotEffects: any[] = [];

      // Pulse effect when active
      if (i < imageCount - 1) {
        dotEffects.push({
          id: `${dotId}-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: activeTime,
            duration: holdDuration,
            mode: 'provider',
            targetIds: [dotId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.4, prog: 1 },
            ],
          },
        });
      }

      navigationDots.push({
        id: dotId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; border-radius: 50%;"></div>',
          className: 'rounded-full',
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: isActive
              ? 'rgba(255, 255, 255, 0.9)'
              : 'rgba(255, 255, 255, 0.4)',
            boxShadow: isActive
              ? '0 2px 4px rgba(0, 0, 0, 0.3)'
              : '0 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: dotEffects,
      } as RenderableComponentData);
    }
  }

  // Navigation dots container
  const navigationDotsContainer: RenderableComponentData | null =
    showNavigationDots
      ? ({
          id: 'navigation-dots-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute bottom-8 flex gap-2',
              style: {
                left: '50%',
                transform: 'translateX(-50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          childrenData: navigationDots,
        } as RenderableComponentData)
      : null;

  // Card stack container
  const cardStackContainer: RenderableComponentData = {
    id: 'card-stack-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: cardComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'card-stack-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      cardStackContainer,
      ...(navigationDotsContainer ? [navigationDotsContainer] : []),
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'card-stack-carousel-3d',
  title: '3D Card Stack Carousel',
  description:
    'A sleek horizontal card stack carousel with realistic 3D flip transitions mimicking a deck of cards being dealt. Features two-phase animation (lift then flip), depth layering with perspective scaling, paper texture overlay for tactile feel, drop shadows, and pulsing navigation dots. Cards flip with spring physics and acceleration curves for natural motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'carousel',
    '3d',
    'card-stack',
    'flip',
    'transition',
    'animation',
    'images',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e' },
    ],
    duration: 20,
    transitionDuration: 0.8,
    holdDuration: 2,
    textureOverlay: true,
    showNavigationDots: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cardStackCarousel3dPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
