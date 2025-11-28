/**
 * Spiral Paper Curl Transition Preset
 *
 * This preset creates a dramatic transition where the outgoing video curls up like a rolled piece
 * of paper from the bottom-right corner, spiraling inward while revealing the incoming video beneath.
 * The curl features realistic 3D perspective with the curled portion showing the 'back' of the paper
 * with a slightly different tint. The spiral motion accelerates as it progresses, with the curl
 * getting tighter. Dynamic drop shadows follow the curl edge for depth. The incoming video has a
 * subtle unfurl animation from the opposite corner.
 *
 * Features:
 * - **Realistic 3D Curl**: Uses rotateY (0deg -> 720deg) combined with scale and translateZ
 * - **Accelerating Spiral**: Non-linear keyframe progression creates acceleration effect
 * - **Back-Face Styling**: Curled portion shows darker tinted backside with brightness filter
 * - **Dynamic Shadows**: Multiple shadow layers follow the curl edge with varying blur
 * - **Subtle Unfurl**: Incoming video animates from top-left with rotateY(-10deg -> 0deg)
 * - **Spring-Based Easing**: Physics-based cubic-bezier for natural motion
 * - **2.2s Overlap**: Extended overlap period for dramatic effect
 *
 * Use cases:
 * - Dramatic page-turn style transitions
 * - Paper-based aesthetic video transitions
 * - Document or book-style presentations
 * - Creative video montages with spiral effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
  curlIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for the curl effect'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Opacity multiplier for the shadow effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    curlIntensity = 1,
    shadowIntensity = 0.7,
  } = params;

  // Calculate total duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Transition timing
  const transitionStartTime = outgoingVideoDuration - transitionDuration;

  // Spring-based easing cubic-bezier
  const springEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // ===== INCOMING VIDEO CONTAINER =====
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'top left',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
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
            duration: incomingVideoDuration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'incoming-unfurl-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            // Subtle unfurl rotation
            { key: 'rotateY', val: -10, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Subtle scale
            { key: 'scale', val: 0.98, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      },
    ],
  };

  // ===== OUTGOING VIDEO CONTAINER =====
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'bottom right',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      // Front face (outgoing video)
      {
        id: 'outgoing-video-front',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            backfaceVisibility: 'hidden',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
      } as RenderableComponentData,
      // Back face (tinted backside)
      {
        id: 'outgoing-video-back',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              backgroundColor: 'rgba(0,0,0,0.2)',
              filter: 'brightness(0.8)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        childrenData: [
          {
            id: 'back-tint-overlay',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
                style: {
                  backgroundColor: 'rgba(50, 40, 30, 0.3)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: outgoingVideoDuration,
              },
            },
            childrenData: [],
          },
        ],
      },
    ],
    effects: [
      {
        id: 'spiral-curl-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            // Spiral rotation (0deg -> 720deg) with acceleration
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 180 * curlIntensity, prog: 0.3 },
            { key: 'rotateY', val: 360 * curlIntensity, prog: 0.5 },
            { key: 'rotateY', val: 540 * curlIntensity, prog: 0.7 },
            { key: 'rotateY', val: 648 * curlIntensity, prog: 0.85 },
            { key: 'rotateY', val: 720 * curlIntensity, prog: 1 },
            // Additional X rotation for depth
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 15, prog: 0.3 },
            { key: 'rotateX', val: 30, prog: 0.5 },
            { key: 'rotateX', val: 40, prog: 0.7 },
            { key: 'rotateX', val: 43, prog: 0.85 },
            { key: 'rotateX', val: 45, prog: 1 },
            // Scale down (tightening curl)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.85, prog: 0.3 },
            { key: 'scale', val: 0.65, prog: 0.5 },
            { key: 'scale', val: 0.4, prog: 0.7 },
            { key: 'scale', val: 0.15, prog: 0.85 },
            { key: 'scale', val: 0, prog: 1 },
            // Z-depth movement
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -100, prog: 0.3 },
            { key: 'translateZ', val: -200, prog: 0.5 },
            { key: 'translateZ', val: -350, prog: 0.7 },
            { key: 'translateZ', val: -450, prog: 0.85 },
            { key: 'translateZ', val: -500, prog: 1 },
          ],
        },
      },
    ],
  };

  // ===== SHADOW LAYERS =====
  const shadowLayer1: RenderableComponentData = {
    id: 'shadow-element-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          bottom: '0',
          right: '0',
          width: '200px',
          height: '200px',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
          filter: 'blur(15px)',
          transformOrigin: 'bottom right',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: transitionDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'shadow-1-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shadow-element-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: shadowIntensity * 0.8, prog: 0.3 },
            { key: 'opacity', val: shadowIntensity, prog: 0.5 },
            { key: 'opacity', val: shadowIntensity * 0.6, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  const shadowLayer2: RenderableComponentData = {
    id: 'shadow-element-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          bottom: '0',
          right: '0',
          width: '300px',
          height: '300px',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, transparent 60%)',
          filter: 'blur(25px)',
          transformOrigin: 'bottom right',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: transitionDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'shadow-2-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shadow-element-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: shadowIntensity * 0.6, prog: 0.3 },
            { key: 'opacity', val: shadowIntensity * 0.8, prog: 0.5 },
            { key: 'opacity', val: shadowIntensity * 0.5, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.3, prog: 0.5 },
            { key: 'scale', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  const shadowLayer3: RenderableComponentData = {
    id: 'shadow-element-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          bottom: '0',
          right: '0',
          width: '150px',
          height: '150px',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 80%)',
          filter: 'blur(10px)',
          transformOrigin: 'bottom right',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: transitionDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'shadow-3-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shadow-element-3'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: shadowIntensity, prog: 0.3 },
            { key: 'opacity', val: shadowIntensity * 1.2, prog: 0.5 },
            { key: 'opacity', val: shadowIntensity * 0.7, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.5 },
            { key: 'scale', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
  };

  // ===== ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: 'spiral-curl-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      incomingVideoContainer,
      outgoingVideoContainer,
      shadowLayer1,
      shadowLayer2,
      shadowLayer3,
    ],
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
  id: 'spiral-paper-curl-transition',
  title: 'Spiral Paper Curl Transition',
  description:
    'A cinematic transition where the outgoing video curls up like a rolled piece of paper spiraling inward from the bottom-right corner, revealing the incoming video beneath. Features realistic 3D perspective with backface tinting, accelerating spiral motion, dynamic shadow following the curl edge, and subtle unfurl animation on the incoming video. Uses spring-based physics easing for natural motion over a 2.2 second overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spiral', 'curl', 'paper', '3d', 'cinematic'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 2.2,
    curlIntensity: 1,
    shadowIntensity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralPaperCurlTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
