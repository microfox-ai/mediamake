/**
 * 3D Door Swing Transition Preset
 *
 * This preset creates a stunning 3D door-swing transition where the outgoing video
 * acts as a door that swings open from the right edge to reveal the incoming video behind it.
 *
 * Features:
 * - **3D Door Swing Effect**: Outgoing video rotates 90 degrees on Y-axis with right-edge origin
 * - **Realistic Perspective**: 1000px perspective for depth and realism
 * - **Bounce Easing**: Subtle bounce at the end of the swing animation
 * - **Dynamic Shadow**: Drop shadow increases during rotation for depth
 * - **Incoming Zoom**: Incoming video scales from 0.95 to 1 as it's revealed
 * - **Brightness Fade**: Incoming video fades from 0.8 to 1 brightness
 * - **Provider Mode Effects**: Precise control using targetIds
 *
 * Use cases:
 * - Creating dramatic video transitions with 3D depth
 * - Building cinematic scene changes with door-opening metaphor
 * - Adding high-impact transitions to video compilations
 * - Creating immersive storytelling transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video (the door)'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video (revealed behind)'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(0.9)
    .describe('Duration of the door swing transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate total duration: sum of both videos minus the overlap
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Incoming video starts before outgoing ends (overlap)
  const incomingStartTime = outgoingVideo.duration - transitionDuration;

  // Create the incoming video container with zoom and brightness effects
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale effect: 0.95 to 1
      {
        id: 'incoming-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness effect: 0.8 to 1
      {
        id: 'incoming-brightness-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'brightness', val: 0.8, prog: 0 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create the outgoing video container (the door) with rotation and shadow effects
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'right center',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Door swing rotation effect with bounce easing
      {
        id: 'door-swing-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'custom',
          easingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
          ],
        },
      },
      // Shadow effect: increases during rotation
      {
        id: 'door-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'dropShadowX', val: 0, prog: 0 },
            { key: 'dropShadowX', val: -20, prog: 1 },
            { key: 'dropShadowY', val: 0, prog: 0 },
            { key: 'dropShadowY', val: 10, prog: 1 },
            { key: 'dropShadowBlur', val: 5, prog: 0 },
            { key: 'dropShadowBlur', val: 30, prog: 1 },
            { key: 'dropShadowOpacity', val: 0.2, prog: 0 },
            { key: 'dropShadowOpacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'door-swing-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
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
    childrenData: [
      incomingVideoContainer,
      outgoingVideoContainer,
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
  id: 'door-swing-3d-transition',
  title: '3D Door Swing Transition',
  description:
    'A 3D door-swing transition where the outgoing video acts as a door that swings open from the right edge to reveal the incoming video behind it. Features perspective transformation, bounce easing, realistic shadow effects, and synchronized incoming video zoom animation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'door', 'swing', 'perspective', 'cinematic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doorSwing3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
