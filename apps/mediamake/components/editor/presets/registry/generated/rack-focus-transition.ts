/**
 * Rack Focus Transition Preset
 *
 * A cinematic depth-of-field transition that simulates a projector lens focusing
 * between two slides at different focal distances. The outgoing video starts in sharp
 * focus and gradually blurs while scaling up slightly, while the incoming video
 * simultaneously transitions from extreme blur to sharp focus with scale adjustment.
 *
 * Features:
 * - Depth-of-field rack focus effect simulating physical camera lens behavior
 * - Simultaneous blur and scale transitions on both videos
 * - Subtle chromatic aberration at peak blur to simulate lens imperfections
 * - Slight brightness changes to simulate depth-of-field light falloff
 * - Z-index switching at midpoint for proper layering
 * - Configurable transition duration and intensity
 *
 * Technical Implementation:
 * - BaseLayout container with two VideoAtoms at different simulated depths
 * - Outgoing: scale(1) to scale(1.1) with blur(0) to blur(20px) over transition
 * - Incoming: scale(0.9) to scale(1) with blur(20px) to blur(0) over transition
 * - Chromatic aberration using separate RGB filter channels at peak blur
 * - Z-index: incoming behind outgoing initially, switch at midpoint
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Simulating camera focus pulls in video editing
 * - Adding professional-looking depth effects to video sequences
 * - Building documentary-style transitions between scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (starts in focus)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (starts blurred)'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of the rack focus transition in seconds'),
  maxBlur: z
    .number()
    .default(20)
    .describe('Maximum blur amount in pixels at peak blur'),
  chromaticAberrationIntensity: z
    .number()
    .default(3)
    .describe('Chromatic aberration intensity in pixels at peak blur'),
  brightnessFalloff: z
    .number()
    .default(0.15)
    .describe(
      'Brightness reduction amount (0-1) to simulate depth-of-field light falloff',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingDuration,
    incomingDuration,
    transitionDuration,
    maxBlur,
    chromaticAberrationIntensity,
    brightnessFalloff,
  } = params;

  // Calculate total composition duration
  const totalDuration =
    outgoingDuration + incomingDuration - transitionDuration;

  // Calculate transition timing
  const transitionStart = outgoingDuration - transitionDuration;
  const midpoint = transitionDuration / 2;

  // Helper function to create chromatic aberration filter
  const createChromaticFilter = (
    progress: number,
    intensity: number,
  ): string => {
    // Chromatic aberration peaks at midpoint (progress = 0.5)
    const aberrationAmount = Math.sin(progress * Math.PI) * intensity;
    return `drop-shadow(${aberrationAmount}px 0 0 rgba(255,0,0,0.5)) drop-shadow(${-aberrationAmount}px 0 0 rgba(0,255,255,0.5))`;
  };

  // Outgoing video container (starts on top, z-index: 2)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          // Scale up and blur out
          {
            id: 'outgoing-blur-scale',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                // Scale from 1 to 1.1
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.1, prog: 1 },
                // Blur from 0 to maxBlur
                { key: 'filter', val: `blur(0px)`, prog: 0 },
                {
                  key: 'filter',
                  val: `blur(${maxBlur / 2}px) ${createChromaticFilter(0.5, chromaticAberrationIntensity)}`,
                  prog: 0.5,
                },
                { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
                // Brightness falloff
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 1 - brightnessFalloff, prog: 1 },
              ],
            },
          },
          // Z-index switch at midpoint
          {
            id: 'outgoing-zindex-switch',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionStart + midpoint,
              duration: 0.001, // Instant switch
              mode: 'provider',
              targetIds: ['outgoing-video-container'],
              ranges: [{ key: 'zIndex', val: 1, prog: 0 }],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container (starts behind, z-index: 1)
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: incomingDuration + transitionDuration,
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
          className: 'w-full h-full',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          // Scale from 0.9 to 1 and blur in
          {
            id: 'incoming-blur-scale',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                // Scale from 0.9 to 1
                { key: 'scale', val: 0.9, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                // Blur from maxBlur to 0
                { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
                {
                  key: 'filter',
                  val: `blur(${maxBlur / 2}px) ${createChromaticFilter(0.5, chromaticAberrationIntensity)}`,
                  prog: 0.5,
                },
                { key: 'filter', val: `blur(0px)`, prog: 1 },
                // Brightness recovery
                { key: 'brightness', val: 1 - brightnessFalloff, prog: 0 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            },
          },
          // Z-index switch at midpoint (becomes top layer)
          {
            id: 'incoming-zindex-switch',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: midpoint,
              duration: 0.001, // Instant switch
              mode: 'provider',
              targetIds: ['incoming-video-container'],
              ranges: [{ key: 'zIndex', val: 2, prog: 0 }],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'rack-focus-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingContainer, outgoingContainer],
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
  id: 'rack-focus-transition',
  title: 'Rack Focus Transition',
  description:
    'A depth-of-field rack focus transition that simulates a projector lens focusing between two slides at different focal distances. The outgoing video starts in sharp focus and gradually blurs while scaling up slightly and fading out, while the incoming video simultaneously transitions from extreme blur to sharp focus with a scale adjustment. Creates a cinematic camera pull-focus effect between two physical slides at different depths.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'rack-focus', 'depth-of-field', 'cinematic', 'video'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 10,
    incomingDuration: 10,
    transitionDuration: 0.7,
    maxBlur: 20,
    chromaticAberrationIntensity: 3,
    brightnessFalloff: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rackFocusTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
