/**
 * Pop-Up Book Transition Preset
 *
 * Creates an elaborate pop-up book page transition where scenes change like opening
 * a children's pop-up book. The current scene folds flat with multiple layers collapsing
 * in sequence from front to back, then the next scene emerges with elements popping up
 * at different depths and angles.
 *
 * Features:
 * - Multi-layered depth structure (background, 2 midground layers, foreground)
 * - Sequential collapse animation (back-to-front stagger)
 * - Sequential pop-up animation (front-to-back stagger)
 * - 3D perspective transformations with rotateX anchored at bottom center
 * - Spring physics for bounce settle effect
 * - Paper-craft shadows that scale with depth
 * - Subtle rotateY and rotateZ for organic positioning
 * - Smooth transform-style: preserve-3d throughout
 *
 * Technical:
 * - 1.5s total duration (0.75s collapse + 0.75s pop-up)
 * - 0.1s stagger delays between layers
 * - translateZ values: background 0px, midground 50-100px, foreground 175px
 * - Spring cubic-bezier(0.68, -0.55, 0.265, 1.55) for final positions
 * - perspective: 1500px on root container
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingBackground: z
    .string()
    .describe('Background layer image URL for outgoing scene'),
  outgoingMidground1: z
    .string()
    .describe('First midground layer image URL for outgoing scene'),
  outgoingMidground2: z
    .string()
    .describe('Second midground layer image URL for outgoing scene'),
  outgoingForeground: z
    .string()
    .describe('Foreground layer image URL for outgoing scene'),
  incomingBackground: z
    .string()
    .describe('Background layer image URL for incoming scene'),
  incomingMidground1: z
    .string()
    .describe('First midground layer image URL for incoming scene'),
  incomingMidground2: z
    .string()
    .describe('Second midground layer image URL for incoming scene'),
  incomingForeground: z
    .string()
    .describe('Foreground layer image URL for incoming scene'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total transition duration in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingBackground,
    outgoingMidground1,
    outgoingMidground2,
    outgoingForeground,
    incomingBackground,
    incomingMidground1,
    incomingMidground2,
    incomingForeground,
    transitionDuration,
  } = params;

  const collapseDuration = transitionDuration / 2; // 0.75s
  const popupDuration = transitionDuration / 2; // 0.75s
  const staggerDelay = 0.1; // 0.1s between layers

  // Spring bounce easing for final settle
  const springEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // Helper to create shadow that scales with depth
  const createDepthShadow = (translateZ: number): string => {
    const shadowStrength = Math.abs(translateZ) / 50; // Scale shadow with depth
    return `0px ${shadowStrength * 4}px ${shadowStrength * 8}px rgba(0, 0, 0, ${0.1 + shadowStrength * 0.05})`;
  };

  // Outgoing layer effects - collapse from front to back
  const outgoingLayerEffects = [
    {
      layerId: 'outgoing-layer-fg',
      translateZ: 175,
      collapseStart: 0, // Foreground collapses first
      rotateY: 3,
      rotateZ: 2,
    },
    {
      layerId: 'outgoing-layer-mid2',
      translateZ: 100,
      collapseStart: staggerDelay, // 0.1s delay
      rotateY: -2,
      rotateZ: -1,
    },
    {
      layerId: 'outgoing-layer-mid1',
      translateZ: 50,
      collapseStart: staggerDelay * 2, // 0.2s delay
      rotateY: 2,
      rotateZ: 1,
    },
    {
      layerId: 'outgoing-layer-bg',
      translateZ: 0,
      collapseStart: staggerDelay * 3, // 0.3s delay
      rotateY: 0,
      rotateZ: 0,
    },
  ];

  // Incoming layer effects - pop up from back to front
  const incomingLayerEffects = [
    {
      layerId: 'incoming-layer-bg',
      translateZ: 0,
      popupStart: collapseDuration, // Starts after collapse phase (0.75s)
      rotateY: 0,
      rotateZ: 0,
    },
    {
      layerId: 'incoming-layer-mid1',
      translateZ: 50,
      popupStart: collapseDuration + staggerDelay, // 0.85s
      rotateY: -3,
      rotateZ: -2,
    },
    {
      layerId: 'incoming-layer-mid2',
      translateZ: 100,
      popupStart: collapseDuration + staggerDelay * 2, // 0.95s
      rotateY: 2,
      rotateZ: 1,
    },
    {
      layerId: 'incoming-layer-fg',
      translateZ: 175,
      popupStart: collapseDuration + staggerDelay * 3, // 1.05s
      rotateY: -2,
      rotateZ: 3,
    },
  ];

  const childrenData: RenderableComponentData[] = [
    // Outgoing scene container
    {
      id: 'outgoing-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: collapseDuration + staggerDelay * 3, // Cover all collapse animations
        },
      },
      childrenData: [
        // Background layer
        {
          id: 'outgoing-layer-bg',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 1,
                transform: `translateZ(0px)`,
                boxShadow: createDepthShadow(0),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: collapseDuration + staggerDelay * 3,
            },
          },
          effects: [
            {
              id: 'outgoing-bg-collapse',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingLayerEffects[3].collapseStart,
                duration: collapseDuration - staggerDelay * 3,
                mode: 'provider',
                targetIds: ['outgoing-layer-bg'],
                ranges: [
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: 90, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'outgoing-bg-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: outgoingBackground,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: collapseDuration + staggerDelay * 3,
                },
              },
            },
          ],
        },
        // Midground layer 1
        {
          id: 'outgoing-layer-mid1',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 2,
                transform: `translateZ(50px) rotateY(${outgoingLayerEffects[2].rotateY}deg) rotateZ(${outgoingLayerEffects[2].rotateZ}deg)`,
                boxShadow: createDepthShadow(50),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: collapseDuration + staggerDelay * 2,
            },
          },
          effects: [
            {
              id: 'outgoing-mid1-collapse',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingLayerEffects[2].collapseStart,
                duration: collapseDuration - staggerDelay * 2,
                mode: 'provider',
                targetIds: ['outgoing-layer-mid1'],
                ranges: [
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: 90, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'outgoing-mid1-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: outgoingMidground1,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: collapseDuration + staggerDelay * 2,
                },
              },
            },
          ],
        },
        // Midground layer 2
        {
          id: 'outgoing-layer-mid2',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 3,
                transform: `translateZ(100px) rotateY(${outgoingLayerEffects[1].rotateY}deg) rotateZ(${outgoingLayerEffects[1].rotateZ}deg)`,
                boxShadow: createDepthShadow(100),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: collapseDuration + staggerDelay,
            },
          },
          effects: [
            {
              id: 'outgoing-mid2-collapse',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingLayerEffects[1].collapseStart,
                duration: collapseDuration - staggerDelay,
                mode: 'provider',
                targetIds: ['outgoing-layer-mid2'],
                ranges: [
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: 90, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'outgoing-mid2-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: outgoingMidground2,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: collapseDuration + staggerDelay,
                },
              },
            },
          ],
        },
        // Foreground layer
        {
          id: 'outgoing-layer-fg',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 4,
                transform: `translateZ(175px) rotateY(${outgoingLayerEffects[0].rotateY}deg) rotateZ(${outgoingLayerEffects[0].rotateZ}deg)`,
                boxShadow: createDepthShadow(175),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: collapseDuration,
            },
          },
          effects: [
            {
              id: 'outgoing-fg-collapse',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingLayerEffects[0].collapseStart,
                duration: collapseDuration,
                mode: 'provider',
                targetIds: ['outgoing-layer-fg'],
                ranges: [
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: 90, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'outgoing-fg-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: outgoingForeground,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: collapseDuration,
                },
              },
            },
          ],
        },
      ],
    },
    // Incoming scene container
    {
      id: 'incoming-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: collapseDuration,
          duration: popupDuration + staggerDelay * 3,
        },
      },
      childrenData: [
        // Background layer
        {
          id: 'incoming-layer-bg',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 5,
                transform: `translateZ(0px)`,
                boxShadow: createDepthShadow(0),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: popupDuration,
            },
          },
          effects: [
            {
              id: 'incoming-bg-popup',
              componentId: 'generic',
              data: {
                type: springEasing as any,
                start: 0,
                duration: popupDuration,
                mode: 'provider',
                targetIds: ['incoming-layer-bg'],
                ranges: [
                  { key: 'rotateX', val: -90, prog: 0 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0, prog: 0 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'incoming-bg-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: incomingBackground,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: popupDuration,
                },
              },
            },
          ],
        },
        // Midground layer 1
        {
          id: 'incoming-layer-mid1',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 6,
                transform: `translateZ(50px) rotateY(${incomingLayerEffects[1].rotateY}deg) rotateZ(${incomingLayerEffects[1].rotateZ}deg)`,
                boxShadow: createDepthShadow(50),
              },
            },
          },
          context: {
            timing: {
              start: staggerDelay,
              duration: popupDuration,
            },
          },
          effects: [
            {
              id: 'incoming-mid1-popup',
              componentId: 'generic',
              data: {
                type: springEasing as any,
                start: 0,
                duration: popupDuration,
                mode: 'provider',
                targetIds: ['incoming-layer-mid1'],
                ranges: [
                  { key: 'rotateX', val: -90, prog: 0 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0, prog: 0 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'incoming-mid1-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: incomingMidground1,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: popupDuration,
                },
              },
            },
          ],
        },
        // Midground layer 2
        {
          id: 'incoming-layer-mid2',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 7,
                transform: `translateZ(100px) rotateY(${incomingLayerEffects[2].rotateY}deg) rotateZ(${incomingLayerEffects[2].rotateZ}deg)`,
                boxShadow: createDepthShadow(100),
              },
            },
          },
          context: {
            timing: {
              start: staggerDelay * 2,
              duration: popupDuration,
            },
          },
          effects: [
            {
              id: 'incoming-mid2-popup',
              componentId: 'generic',
              data: {
                type: springEasing as any,
                start: 0,
                duration: popupDuration,
                mode: 'provider',
                targetIds: ['incoming-layer-mid2'],
                ranges: [
                  { key: 'rotateX', val: -90, prog: 0 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0, prog: 0 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'incoming-mid2-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: incomingMidground2,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: popupDuration,
                },
              },
            },
          ],
        },
        // Foreground layer
        {
          id: 'incoming-layer-fg',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'bottom center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                zIndex: 8,
                transform: `translateZ(175px) rotateY(${incomingLayerEffects[3].rotateY}deg) rotateZ(${incomingLayerEffects[3].rotateZ}deg)`,
                boxShadow: createDepthShadow(175),
              },
            },
          },
          context: {
            timing: {
              start: staggerDelay * 3,
              duration: popupDuration,
            },
          },
          effects: [
            {
              id: 'incoming-fg-popup',
              componentId: 'generic',
              data: {
                type: springEasing as any,
                start: 0,
                duration: popupDuration,
                mode: 'provider',
                targetIds: ['incoming-layer-fg'],
                ranges: [
                  { key: 'rotateX', val: -90, prog: 0 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0, prog: 0 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'incoming-fg-content',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: incomingForeground,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: popupDuration,
                },
              },
            },
          ],
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'popup-book-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1500px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration + staggerDelay * 3,
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
  id: 'popup-book-transition',
  title: 'Pop-Up Book Page Transition',
  description:
    'A whimsical transition effect that simulates elaborate pop-up book pages. The current scene folds flat with multiple layers collapsing in sequence from front to back, then the next scene emerges with elements popping up at different depths and angles. Features 4 depth layers (background, two midground layers, foreground) with staggered rotateX animations anchored at bottom center, spring physics for bounce settle, paper-craft shadows that scale with translateZ depth, and subtle rotateY/rotateZ variations for organic positioning. Creates a playful, dimensional effect reminiscent of opening a children\'s pop-up book.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'popup-book',
    '3d',
    'layers',
    'depth',
    'perspective',
    'spring',
    'playful',
  ],
  defaultInputParams: {
    outgoingBackground:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    outgoingMidground1:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    outgoingMidground2:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
    outgoingForeground:
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&h=1080&fit=crop',
    incomingBackground:
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&h=1080&fit=crop',
    incomingMidground1:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    incomingMidground2:
      'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&h=1080&fit=crop',
    incomingForeground:
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&h=1080&fit=crop',
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const popupBookTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
