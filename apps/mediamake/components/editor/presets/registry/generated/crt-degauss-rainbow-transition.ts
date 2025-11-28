/**
 * CRT Degaussing Rainbow Transition Preset
 *
 * Simulates the colorful magnetic interference pattern when degaussing an old CRT monitor.
 * Features:
 * - Outgoing video warps outward with rainbow hue rotation
 * - Animated concentric rainbow circles pulse from center during transition
 * - Brief black flash during peak interference
 * - Incoming video appears through the interference with desaturation effect
 * - Satisfying 'snap' via brightness spike as magnetic field normalizes
 *
 * Technical Approach:
 * - All effects use generic effects with provider mode
 * - Transform animations on VideoAtoms for scale/rotation
 * - Multiple HTMLBlockAtom nodes for rainbow gradient rings
 * - Layered z-index structure for proper compositing
 * - GPU-optimized with will-change hints
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media that will warp and distort'),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media that appears through the interference'),
  overlapDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate total duration
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculations
  const outgoingEnd = media1.duration;
  const incomingStart = media1.duration - overlapDuration;
  const blackFlashStart = incomingStart + 0.2;
  const blackFlashDuration = 0.4;

  // Outgoing video: scales from 1 to 1.5 and rotates hue
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        willChange: 'transform, filter',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-scale-warp',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: incomingStart,
          duration: overlapDuration + 0.3,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.5, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-hue-rotate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: incomingStart,
          duration: overlapDuration + 0.3,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(720deg)', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: incomingStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Black flash layer
  const blackFlashLayer: RenderableComponentData = {
    id: 'black-flash-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
          zIndex: 5,
          willChange: 'opacity',
        },
      },
    },
    context: {
      timing: {
        start: blackFlashStart,
        duration: blackFlashDuration,
      },
    },
    effects: [
      {
        id: 'black-flash-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: blackFlashDuration,
          mode: 'provider',
          targetIds: ['black-flash-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Rainbow ring helpers
  const createRainbowRing = (
    index: number,
    startOffset: number,
    duration: number,
    gradient: string,
    opacity: number,
  ): RenderableComponentData => {
    const ringId = `rainbow-ring-${index}`;
    const ringInnerId = `rainbow-ring-inner-${index}`;

    return {
      id: ringId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: 10 + index,
            willChange: 'transform, opacity',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart + startOffset,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${ringId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [ringId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: ringInnerId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="
              width: 200%;
              height: 200%;
              border-radius: 50%;
              background: ${gradient};
              opacity: ${opacity};
              will-change: transform;
            "></div>`,
            className: 'w-full h-full flex items-center justify-center',
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [
            {
              id: `${ringInnerId}-scale`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [ringInnerId],
                ranges: [
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 3, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    };
  };

  // Create three staggered rainbow rings
  const rainbowRing1 = createRainbowRing(
    1,
    0,
    1.0,
    'conic-gradient(from 0deg, red, orange, yellow, green, cyan, blue, violet, red)',
    0.7,
  );

  const rainbowRing2 = createRainbowRing(
    2,
    0.15,
    0.85,
    'conic-gradient(from 90deg, violet, blue, cyan, green, yellow, orange, red, violet)',
    0.6,
  );

  const rainbowRing3 = createRainbowRing(
    3,
    0.3,
    0.7,
    'conic-gradient(from 180deg, red, yellow, green, cyan, blue, violet, red)',
    0.5,
  );

  // Incoming video: starts desaturated, scales up, then 'snaps' with brightness spike
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        willChange: 'transform, filter',
      },
    },
    context: {
      timing: {
        start: incomingStart + 0.3,
        duration: media2.duration + overlapDuration - 0.3,
      },
    },
    effects: [
      {
        id: 'incoming-scale-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-saturate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'saturate(0)', prog: 0 },
            { key: 'filter', val: 'saturate(1)', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-brightness-snap',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: overlapDuration - 0.15,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'brightness(1)', prog: 0 },
            { key: 'filter', val: 'brightness(1.5)', prog: 0.5 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'crt-degauss-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          willChange: 'transform',
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
      outgoingVideo,
      blackFlashLayer,
      rainbowRing1,
      rainbowRing2,
      rainbowRing3,
      incomingVideo,
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
  id: 'crt-degauss-rainbow-transition',
  title: 'CRT Degaussing Rainbow Transition',
  description:
    'A nostalgic CRT monitor degaussing transition effect that simulates the colorful magnetic interference pattern when degaussing old CRT monitors. Features outgoing video warping outward with rainbow hue rotation, animated concentric rainbow circles pulsing from center, a brief black flash, and incoming video appearing through the interference with a satisfying color correction snap at the end.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crt', 'degauss', 'rainbow', 'retro', 'vintage', 'magnetic', 'interference'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 1.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crtDegaussRainbowTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
