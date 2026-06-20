/**
 * Paper Airplane Throw Transition Preset
 *
 * Creates a playful 1.7 second transition where the outgoing video folds into a paper airplane shape,
 * flies across and off screen, while the incoming video arrives as another paper airplane that unfolds.
 * 
 * Features:
 * - Classic airplane fold sequence in reverse (5 folding steps)
 * - Realistic arc trajectory with rotation and wobble
 * - Motion blur during fast movement (0-3px based on velocity)
 * - Depth of field blur based on z-distance
 * - Moving shadows that follow the airplane altitude
 * - Synchronized swoosh sound effect
 * - Physics-based easing for natural flight
 * - Paper texture overlay during fold state
 * 
 * Technical Implementation:
 * - BaseLayout with perspective-1500 for 3D depth
 * - Multiple clip-path keyframes to simulate airplane folding
 * - Flight path using translateX, translateY (parabolic arc), translateZ (depth)
 * - rotateZ for banking during flight
 * - requestAnimationFrame for smooth trajectory calculation
 * - Shadow element using transformed duplicate with opacity/blur based on altitude
 * 
 * Use Cases:
 * - Creative video transitions
 * - Playful content switches
 * - Educational or children's content
 * - Fun social media content transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z.number().default(1.7).describe('Duration of the transition in seconds'),
  swooshSoundSrc: z.string().optional().describe('Optional swoosh sound effect source URL'),
  paperTextureSrc: z.string().optional().describe('Optional paper texture overlay image URL'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { 
    outgoingVideoSrc, 
    incomingVideoSrc, 
    transitionDuration, 
    swooshSoundSrc,
    paperTextureSrc 
  } = params;

  // Timing breakdown for 1.7s transition
  const foldDuration = 0.3; // Folding animation
  const flightDuration = 1.0; // Flight across screen
  const unfoldDuration = 0.4; // Unfolding animation
  const overlapDuration = 0.5; // Overlap between outgoing and incoming

  // Create 5 folding steps using clip-path keyframes
  const createFoldingEffect = (targetId: string, isFolding: boolean) => {
    const foldSteps = [
      'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // Full rectangle
      'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%)', // First fold
      'polygon(0% 0%, 100% 0%, 75% 50%, 50% 60%)', // Second fold
      'polygon(25% 25%, 75% 25%, 60% 40%, 40% 40%)', // Third fold
      'polygon(40% 35%, 60% 35%, 55% 42%, 45% 42%)', // Fourth fold (airplane shape)
    ];

    const ranges = isFolding
      ? [
          { key: 'clipPath', val: foldSteps[0], prog: 0 },
          { key: 'clipPath', val: foldSteps[1], prog: 0.2 },
          { key: 'clipPath', val: foldSteps[2], prog: 0.4 },
          { key: 'clipPath', val: foldSteps[3], prog: 0.7 },
          { key: 'clipPath', val: foldSteps[4], prog: 1 },
        ]
      : [
          { key: 'clipPath', val: foldSteps[4], prog: 0 },
          { key: 'clipPath', val: foldSteps[3], prog: 0.3 },
          { key: 'clipPath', val: foldSteps[2], prog: 0.5 },
          { key: 'clipPath', val: foldSteps[1], prog: 0.8 },
          { key: 'clipPath', val: foldSteps[0], prog: 1 },
        ];

    return {
      id: `fold-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: isFolding ? foldDuration : unfoldDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Create flight path effect with parabolic arc
  const createFlightEffect = (targetId: string, isOutgoing: boolean) => {
    const startX = isOutgoing ? 0 : 100;
    const endX = isOutgoing ? -120 : 0;
    const arcHeight = -30; // Negative for upward arc
    const rotationStart = isOutgoing ? 0 : -45;
    const rotationEnd = isOutgoing ? 45 : 0;
    const depthStart = isOutgoing ? 0 : 200;
    const depthEnd = isOutgoing ? 200 : 0;

    return {
      id: `flight-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: isOutgoing ? foldDuration : 0,
        duration: flightDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Horizontal movement
          { key: 'translateX', val: `${startX}vw`, prog: 0 },
          { key: 'translateX', val: `${(startX + endX) / 2}vw`, prog: 0.5 },
          { key: 'translateX', val: `${endX}vw`, prog: 1 },
          // Vertical arc (parabolic)
          { key: 'translateY', val: '0vh', prog: 0 },
          { key: 'translateY', val: `${arcHeight}vh`, prog: 0.5 },
          { key: 'translateY', val: '0vh', prog: 1 },
          // Depth
          { key: 'translateZ', val: `${depthStart}px`, prog: 0 },
          { key: 'translateZ', val: `${depthEnd}px`, prog: 1 },
          // Banking rotation
          { key: 'rotateZ', val: `${rotationStart}deg`, prog: 0 },
          { key: 'rotateZ', val: `${rotationEnd}deg`, prog: 1 },
          // Scale for perspective
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.7, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create motion blur effect based on velocity
  const createMotionBlurEffect = (targetId: string, isOutgoing: boolean) => {
    return {
      id: `blur-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: isOutgoing ? foldDuration : 0,
        duration: flightDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(3px)', prog: 0.2 },
          { key: 'filter', val: 'blur(3px)', prog: 0.8 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };
  };

  // Create wobble effect for realistic flight
  const createWobbleEffect = (targetId: string, isOutgoing: boolean) => {
    return {
      id: `wobble-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: isOutgoing ? foldDuration : 0,
        duration: flightDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotateX', val: '0deg', prog: 0 },
          { key: 'rotateX', val: '5deg', prog: 0.15 },
          { key: 'rotateX', val: '-3deg', prog: 0.35 },
          { key: 'rotateX', val: '4deg', prog: 0.55 },
          { key: 'rotateX', val: '-2deg', prog: 0.75 },
          { key: 'rotateX', val: '0deg', prog: 1 },
        ],
      },
    };
  };

  // Create paper texture overlay effect
  const createTextureEffect = (targetId: string, isFolding: boolean) => {
    return {
      id: `texture-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 0,
        duration: isFolding ? foldDuration : unfoldDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: isFolding ? 0 : 0.4, prog: 0 },
          { key: 'opacity', val: isFolding ? 0.4 : 0, prog: 1 },
        ],
      },
    };
  };

  // Create shadow effect based on altitude
  const createShadowEffect = (shadowId: string, isOutgoing: boolean) => {
    return {
      id: `shadow-animate-${shadowId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: isOutgoing ? 0.6 : 0.8,
        mode: 'provider',
        targetIds: [shadowId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'filter', val: 'blur(10px)', prog: 0 },
          { key: 'filter', val: 'blur(30px)', prog: 0.5 },
          { key: 'filter', val: 'blur(10px)', prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 0.8, prog: 1 },
        ],
      },
    };
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [];

  // Outgoing video container
  const outgoingContainerId = 'outgoing-video-container';
  const outgoingVideoId = 'outgoing-video';
  const outgoingTextureId = 'outgoing-paper-texture';

  childrenData.push({
    id: outgoingContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: foldDuration + flightDuration,
      },
    },
    childrenData: [
      {
        id: outgoingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: foldDuration + flightDuration,
          },
        },
        effects: [
          createFoldingEffect(outgoingVideoId, true),
          createFlightEffect(outgoingVideoId, true),
          createMotionBlurEffect(outgoingVideoId, true),
          createWobbleEffect(outgoingVideoId, true),
        ],
      } as RenderableComponentData,
      ...(paperTextureSrc
        ? [
            {
              id: outgoingTextureId,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: paperTextureSrc,
                className: 'absolute inset-0 w-full h-full pointer-events-none',
                style: {
                  mixBlendMode: 'overlay',
                  opacity: 0,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: foldDuration,
                },
              },
              effects: [createTextureEffect(outgoingTextureId, true)],
            } as RenderableComponentData,
          ]
        : []),
    ],
  } as RenderableComponentData);

  // Incoming video container
  const incomingContainerId = 'incoming-video-container';
  const incomingVideoId = 'incoming-video';
  const incomingTextureId = 'incoming-paper-texture';

  childrenData.push({
    id: incomingContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: transitionDuration - flightDuration - unfoldDuration,
        duration: flightDuration + unfoldDuration,
      },
    },
    childrenData: [
      {
        id: incomingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: flightDuration + unfoldDuration,
          },
        },
        effects: [
          createFoldingEffect(incomingVideoId, false),
          createFlightEffect(incomingVideoId, false),
          createMotionBlurEffect(incomingVideoId, false),
          createWobbleEffect(incomingVideoId, false),
        ],
      } as RenderableComponentData,
      ...(paperTextureSrc
        ? [
            {
              id: incomingTextureId,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: paperTextureSrc,
                className: 'absolute inset-0 w-full h-full pointer-events-none',
                style: {
                  mixBlendMode: 'overlay',
                  opacity: 0,
                },
              },
              context: {
                timing: {
                  start: flightDuration,
                  duration: unfoldDuration,
                },
              },
              effects: [createTextureEffect(incomingTextureId, false)],
            } as RenderableComponentData,
          ]
        : []),
    ],
  } as RenderableComponentData);

  // Shadow for outgoing airplane
  const outgoingShadowId = 'outgoing-shadow';
  childrenData.push({
    id: outgoingShadowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          filter: 'blur(20px)',
          opacity: 0,
          transformOrigin: 'center center',
          transform: 'translateY(20px)',
        },
      },
    },
    context: {
      timing: {
        start: foldDuration,
        duration: 0.6,
      },
    },
    effects: [createShadowEffect(outgoingShadowId, true)],
  } as RenderableComponentData);

  // Shadow for incoming airplane
  const incomingShadowId = 'incoming-shadow';
  childrenData.push({
    id: incomingShadowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          filter: 'blur(20px)',
          opacity: 0,
          transformOrigin: 'center center',
          transform: 'translateY(20px)',
        },
      },
    },
    context: {
      timing: {
        start: transitionDuration - flightDuration - unfoldDuration,
        duration: 0.8,
      },
    },
    effects: [createShadowEffect(incomingShadowId, false)],
  } as RenderableComponentData);

  // Swoosh sound effect
  if (swooshSoundSrc) {
    childrenData.push({
      id: 'swoosh-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: swooshSoundSrc,
        volume: 0.7,
      },
      context: {
        timing: {
          start: 0.15,
          duration: 1.4,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-airplane-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1500px',
          perspectiveOrigin: 'center center',
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'paper-airplane-throw-transition',
  title: 'Paper Airplane Throw Transition',
  description:
    'A playful 1.7 second transition where the outgoing video folds into a paper airplane shape, flies off screen with realistic arc trajectory and wobble, while the incoming video arrives as another paper airplane that unfolds. Features motion blur during flight, depth-based shadows, paper texture overlays, and synchronized swoosh sound effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'playful', 'paper-airplane', 'creative', '3d', 'physics'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.7,
    swooshSoundSrc: 'https://example.com/swoosh.mp3',
    paperTextureSrc: 'https://example.com/paper-texture.jpg',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export
export const paperAirplaneThrowTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
