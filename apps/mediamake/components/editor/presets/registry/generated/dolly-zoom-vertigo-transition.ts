/**
 * Dolly Zoom Vertigo Transition Preset
 *
 * Creates a disorienting vertigo effect (dolly zoom) by combining Ken Burns zoom
 * with counter-zoom perspective transforms. The outgoing video zooms in while
 * applying a reverse perspective that maintains subject size but warps the background.
 * Includes progressive edge blur and color desaturation during overlap.
 *
 * Features:
 * - Ken Burns zoom (100% → 160% scale) on outgoing video
 * - Counter-zoom perspective transform (rotateY 0deg → 15deg)
 * - Progressive radial edge blur (0 → 10px)
 * - Incoming video with inverted perspective (rotateY -15deg → 0deg)
 * - Scale transition (80% → 100%)
 * - Color desaturation during overlap (100% → 60% → 100%)
 * - 1s overlap period with opposing transforms
 * - 3D transform preservation for proper perspective
 *
 * Technical Implementation:
 * - BaseLayout container with 1s overlap
 * - Outgoing: 2.5s duration, zoom + perspective + blur + desaturation
 * - Incoming: starts at 1.5s (overlap), 2s duration, inverted perspective + scale
 * - Total duration: 3.5s (2.5 + 2 - 1)
 *
 * Use cases:
 * - Creating disorienting scene transitions
 * - Hitchcock-style vertigo effects
 * - Cinematic psychological transitions
 * - Dramatic mood shifts between scenes
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
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds'),
    endAt: z.number().optional().describe('End time in seconds'),
    volume: z.number().min(0).max(1).optional().describe('Volume (0-1)'),
    muted: z.boolean().optional().describe('Mute video audio'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds'),
    endAt: z.number().optional().describe('End time in seconds'),
    volume: z.number().min(0).max(1).optional().describe('Volume (0-1)'),
    muted: z.boolean().optional().describe('Mute video audio'),
  }),
  outgoingDuration: z
    .number()
    .default(2.5)
    .describe('Duration of outgoing video in seconds'),
  incomingDuration: z
    .number()
    .default(2)
    .describe('Duration of incoming video in seconds'),
  overlapDuration: z
    .number()
    .default(1)
    .describe('Overlap duration in seconds'),
  maxZoomScale: z
    .number()
    .min(1.1)
    .max(2)
    .default(1.6)
    .describe('Maximum zoom scale for outgoing video (100% = 1.0)'),
  incomingStartScale: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .describe('Starting scale for incoming video (100% = 1.0)'),
  maxPerspectiveRotation: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum perspective rotation in degrees'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum blur amount in pixels'),
  minSaturation: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Minimum saturation during vertigo peak (0-1)'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
    maxZoomScale,
    incomingStartScale,
    maxPerspectiveRotation,
    maxBlur,
    minSaturation,
    perspectiveDepth,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;
  const incomingStartTime = outgoingDuration - overlapDuration;

  // Outgoing video with dolly zoom, perspective, blur, and desaturation
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom,
      endAt: outgoingVideo.endAt,
      volume: outgoingVideo.volume ?? 1,
      muted: outgoingVideo.muted ?? false,
      fit: 'cover',
      className: 'w-full h-full',
      style: {
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Ken Burns zoom effect (100% → maxZoomScale)
      {
        id: 'outgoing-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: outgoingDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: maxZoomScale, prog: 1 },
          ],
        },
      },
      // Perspective transform (rotateY 0deg → maxPerspectiveRotation)
      {
        id: 'outgoing-perspective',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: outgoingDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            {
              key: 'transform',
              val: `perspective(${perspectiveDepth}px) rotateY(0deg)`,
              prog: 0,
            },
            {
              key: 'transform',
              val: `perspective(${perspectiveDepth}px) rotateY(${maxPerspectiveRotation}deg) scale(${maxZoomScale})`,
              prog: 1,
            },
          ],
        },
      },
      // Progressive blur (0 → maxBlur) during overlap
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: `blur(0px)`, prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
          ],
        },
      },
      // Desaturation during overlap (100% → minSaturation%)
      {
        id: 'outgoing-desaturate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: `saturate(1)`, prog: 0 },
            { key: 'filter', val: `saturate(${minSaturation})`, prog: 1 },
          ],
        },
      },
      // Fade out during overlap
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingDuration - overlapDuration,
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

  // Incoming video with inverted perspective and scale transition
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom,
      endAt: incomingVideo.endAt,
      volume: incomingVideo.volume ?? 1,
      muted: incomingVideo.muted ?? false,
      fit: 'cover',
      className: 'w-full h-full',
      style: {
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration,
      },
    },
    effects: [
      // Scale transition (incomingStartScale → 100%)
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: incomingStartScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Inverted perspective transform (rotateY -maxPerspectiveRotation → 0deg)
      {
        id: 'incoming-perspective',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            {
              key: 'transform',
              val: `perspective(${perspectiveDepth}px) rotateY(-${maxPerspectiveRotation}deg) scale(${incomingStartScale})`,
              prog: 0,
            },
            {
              key: 'transform',
              val: `perspective(${perspectiveDepth}px) rotateY(0deg) scale(1)`,
              prog: 1,
            },
          ],
        },
      },
      // Desaturation during overlap (minSaturation% → 100%)
      {
        id: 'incoming-saturate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: `saturate(${minSaturation})`, prog: 0 },
            { key: 'filter', val: `saturate(1)`, prog: 1 },
          ],
        },
      },
      // Fade in during overlap
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with 3D transform preservation
  const rootContainer: RenderableComponentData = {
    id: 'dolly-zoom-vertigo-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
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
      // Outgoing video container
      {
        id: 'outgoing-container',
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
            duration: outgoingDuration,
          },
        },
        childrenData: [outgoingVideoNode],
      } as RenderableComponentData,
      // Incoming video container
      {
        id: 'incoming-container',
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
            start: incomingStartTime,
            duration: incomingDuration,
          },
        },
        childrenData: [incomingVideoNode],
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'dolly-zoom-vertigo-transition',
  title: 'Dolly Zoom Vertigo Transition',
  description:
    'Advanced transition effect combining Ken Burns zoom with counter-zoom perspective transform (vertigo/dolly zoom effect). Outgoing video zooms in from 100% to 160% scale while applying reverse perspective transform that maintains subject size but warps the background. Includes progressive edge blur and color desaturation during the 1s overlap. Incoming video starts at 80% scale with inverted perspective, then normalizes to 100% scale with standard perspective. Both videos undergo opposing perspective transforms creating a disorienting vertigo effect synchronized with desaturation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vertigo', 'dolly-zoom', 'perspective', 'cinematic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      volume: 1,
      muted: false,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      volume: 1,
      muted: false,
    },
    outgoingDuration: 2.5,
    incomingDuration: 2,
    overlapDuration: 1,
    maxZoomScale: 1.6,
    incomingStartScale: 0.8,
    maxPerspectiveRotation: 15,
    maxBlur: 10,
    minSaturation: 0.6,
    perspectiveDepth: 1000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dollyZoomVertigoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
