/**
 * Paper Tear Transition Preset
 *
 * This preset simulates a paper being torn away to reveal another video underneath.
 * The outgoing video appears to be torn from left to right with a jagged irregular edge,
 * while a paper texture overlay becomes more prominent as the tear progresses.
 * A subtle curl effect (3D transform) is applied at the torn edge, and a drop shadow
 * appears on the incoming video where it meets the torn edge.
 *
 * Features:
 * - Jagged torn paper edge animated via clip-path polygon
 * - Paper texture overlay on outgoing video (mix-blend-mode: multiply, opacity 0 -> 0.3)
 * - 3D curl effect at torn edge (rotateY 0deg -> -15deg)
 * - Drop shadow on incoming video at tear edge
 * - Paper ripping sound effect during transition
 * - 1.5 seconds overlap between videos
 *
 * Use cases:
 * - Creative transitions between video clips
 * - Simulating physical paper tearing effect
 * - Revealing content with a tactile, organic transition
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video that will be torn away'),

  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video revealed underneath'),

  paperTexture: z
    .object({
      src: z
        .string()
        .optional()
        .describe('Paper texture overlay image URL (optional)'),
    })
    .optional()
    .describe('Paper texture image for the torn paper effect'),

  tearSound: z
    .object({
      src: z
        .string()
        .optional()
        .describe('Paper ripping sound effect URL (optional)'),
    })
    .optional()
    .describe('Sound effect for paper ripping'),

  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of overlap between videos in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, paperTexture, tearSound, overlapDuration } = params;

  // Calculate total BaseLayout duration
  const baseLayoutDuration =
    video1.duration + video2.duration - overlapDuration;

  // Calculate transition start time (when incoming video starts)
  const transitionStart = video1.duration - overlapDuration;

  // Build children data
  const childrenData: RenderableComponentData[] = [];

  // 1. Incoming video (bottom layer, z-0)
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        filter: 'drop-shadow(-10px 0px 15px rgba(0,0,0,0.4))',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
  } as RenderableComponentData);

  // 2. Outgoing video container (top layer, z-10)
  const outgoingVideoChildren: RenderableComponentData[] = [];

  // 2a. Outgoing video
  outgoingVideoChildren.push({
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
        transformOrigin: 'right center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'curl-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -5, prog: 0.3 },
            { key: 'rotateY', val: -10, prog: 0.6 },
            { key: 'rotateY', val: -15, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2b. Paper texture overlay (if provided)
  if (paperTexture?.src) {
    outgoingVideoChildren.push({
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTexture.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'texture-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['paper-texture-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.1, prog: 0.3 },
              { key: 'opacity', val: 0.2, prog: 0.6 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video container
  childrenData.push({
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: outgoingVideoChildren as RenderableComponentData[],
    effects: [
      {
        id: 'clip-path-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 70% 0, 65% 15%, 72% 30%, 60% 45%, 68% 60%, 58% 75%, 66% 90%, 55% 100%, 0 100%)',
              prog: 0.3,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 40% 0, 35% 12%, 42% 28%, 32% 42%, 38% 58%, 28% 72%, 36% 88%, 25% 100%, 0 100%)',
              prog: 0.6,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 10% 0, 5% 15%, 12% 30%, 2% 45%, 8% 60%, 0% 75%, 6% 90%, 0% 100%, 0 100%)',
              prog: 0.9,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 3. Tear audio (if provided)
  if (tearSound?.src) {
    childrenData.push({
      id: 'tear-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: tearSound.src,
        volume: 0.6,
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-tear-root',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'paper-tear-transition',
  title: 'Paper Tear Transition',
  description:
    'A creative transition preset where the outgoing video appears to be torn away like ripping paper, revealing the incoming video underneath. Features a jagged torn paper edge animation moving horizontally across the screen, paper texture overlay with increasing opacity, 3D curl effect at the tear edge, and a paper ripping sound effect. Uses clip-path polygon animation for the torn edge pattern and rotateY transform for the curl effect. The transition has 1.5 seconds of overlap between the two videos.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'tear', 'reveal', 'creative', '3d'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    paperTexture: {
      src: 'https://example.com/paper-texture.jpg',
    },
    tearSound: {
      src: 'https://example.com/tear-sound.mp3',
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const paperTearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
