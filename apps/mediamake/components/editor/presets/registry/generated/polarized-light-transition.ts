/**
 * Polarized Light Solarization Transition Preset
 *
 * Creates a stunning transition effect simulating rotating polarization filters
 * with progressive color inversion cycles. As the polarization filter rotates,
 * colors invert and saturations shift, creating a solarization effect.
 *
 * Features:
 * - **3 Full Inversion Cycles**: Outgoing video goes through 3 complete
 *   invert(0%)-invert(100%) cycles during 1.3-second overlap
 * - **Opposite Phase Rotation**: Incoming video rotates with opposite phase,
 *   creating interference patterns where both videos overlap
 * - **Hue Rotation**: Synchronized hue-rotate() animation offset by 90 degrees
 *   from the invert cycle
 * - **Prismatic Rainbow Edges**: Animated box-shadow with cycling RGB values
 *   creating rainbow prismatic effects during rotation
 * - **Physical Rotation**: Slight 6-degree rotation during transition
 * - **Screen Blend Mode**: Creates interference patterns during overlap
 * - **Sinusoidal Animation**: Smooth Math.sin()-based keyframes for natural
 *   polarization filter simulation
 *
 * Technical Implementation:
 * - Outgoing video: 3 inversion cycles (0→100→0→100→0→100→0) over 1.3s
 * - Incoming video: Opposite phase (100→0→100→0→100→0→100)
 * - Hue rotation: Full 360° cycle with 90° offset
 * - Box-shadow RGB cycling: Creates prismatic rainbow edge effect
 * - Physical rotation: 0° to 6° for outgoing, -6° to 0° for incoming
 * - Screen blend mode on incoming video wrapper for interference
 *
 * Use Cases:
 * - Scientific/technical video transitions
 * - Documentary transitions with optical effects
 * - Educational content about light and polarization
 * - Artistic transitions with color manipulation
 * - Music video transitions with psychedelic effects
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
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  outgoingStartFrom: z
    .number()
    .optional()
    .describe('Start time for outgoing video (trim start)'),
  outgoingEndAt: z
    .number()
    .optional()
    .describe('End time for outgoing video (trim end)'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  incomingStartFrom: z
    .number()
    .optional()
    .describe('Start time for incoming video (trim start)'),
  incomingEndAt: z
    .number()
    .optional()
    .describe('End time for incoming video (trim end)'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition overlap in seconds (default: 1.3)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    outgoingStartFrom,
    outgoingEndAt,
    incomingVideoSrc,
    incomingVideoDuration,
    incomingStartFrom,
    incomingEndAt,
    transitionDuration,
  } = params;

  // Calculate timing
  // The overlap starts when outgoing video is about to end
  const overlapStart = outgoingVideoDuration - transitionDuration;

  // Total duration: outgoing duration + incoming duration - overlap
  const totalDuration = outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Create outgoing video with effects
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      startFrom: outgoingStartFrom,
      endAt: outgoingEndAt,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      // Invert cycle: 3 full cycles over 1.3s
      // Keyframes at: 0ms, 216ms, 433ms, 650ms, 866ms, 1083ms, 1300ms
      {
        id: 'outgoing-filter-invert-cycle',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter-invert', val: 0, prog: 0 }, // 0ms
            { key: 'filter-invert', val: 100, prog: 0.166 }, // 216ms
            { key: 'filter-invert', val: 0, prog: 0.333 }, // 433ms
            { key: 'filter-invert', val: 100, prog: 0.5 }, // 650ms
            { key: 'filter-invert', val: 0, prog: 0.666 }, // 866ms
            { key: 'filter-invert', val: 100, prog: 0.833 }, // 1083ms
            { key: 'filter-invert', val: 0, prog: 1 }, // 1300ms
          ],
        },
      },
      // Hue-rotate: full 360° cycle, offset by 90° from invert
      {
        id: 'outgoing-hue-rotate-cycle',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter-hue-rotate', val: 0, prog: 0 },
            { key: 'filter-hue-rotate', val: 90, prog: 0.25 },
            { key: 'filter-hue-rotate', val: 180, prog: 0.5 },
            { key: 'filter-hue-rotate', val: 270, prog: 0.75 },
            { key: 'filter-hue-rotate', val: 360, prog: 1 },
          ],
        },
      },
      // Rotation: 0° to 6°
      {
        id: 'outgoing-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 6, prog: 1 },
          ],
        },
      },
      // Fade out
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Red channel
      {
        id: 'outgoing-prismatic-edge-red',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'box-shadow-r', val: 255, prog: 0 },
            { key: 'box-shadow-r', val: 0, prog: 0.333 },
            { key: 'box-shadow-r', val: 255, prog: 0.666 },
            { key: 'box-shadow-r', val: 128, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Green channel
      {
        id: 'outgoing-prismatic-edge-green',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'box-shadow-g', val: 0, prog: 0 },
            { key: 'box-shadow-g', val: 255, prog: 0.333 },
            { key: 'box-shadow-g', val: 0, prog: 0.666 },
            { key: 'box-shadow-g', val: 255, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Blue channel
      {
        id: 'outgoing-prismatic-edge-blue',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'box-shadow-b', val: 128, prog: 0 },
            { key: 'box-shadow-b', val: 0, prog: 0.333 },
            { key: 'box-shadow-b', val: 255, prog: 0.666 },
            { key: 'box-shadow-b', val: 128, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video wrapper
  const outgoingWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [outgoingVideoNode],
  };

  // Create incoming video with opposite phase effects
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      startFrom: incomingStartFrom,
      endAt: incomingEndAt,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingVideoDuration,
      },
    },
    effects: [
      // Invert cycle: opposite phase (starts at 100%)
      {
        id: 'incoming-filter-invert-cycle',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter-invert', val: 100, prog: 0 },
            { key: 'filter-invert', val: 0, prog: 0.166 },
            { key: 'filter-invert', val: 100, prog: 0.333 },
            { key: 'filter-invert', val: 0, prog: 0.5 },
            { key: 'filter-invert', val: 100, prog: 0.666 },
            { key: 'filter-invert', val: 0, prog: 0.833 },
            { key: 'filter-invert', val: 100, prog: 1 },
          ],
        },
      },
      // Hue-rotate: offset by 180° from outgoing
      {
        id: 'incoming-hue-rotate-cycle',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter-hue-rotate', val: 180, prog: 0 },
            { key: 'filter-hue-rotate', val: 270, prog: 0.25 },
            { key: 'filter-hue-rotate', val: 360, prog: 0.5 },
            { key: 'filter-hue-rotate', val: 450, prog: 0.75 },
            { key: 'filter-hue-rotate', val: 540, prog: 1 },
          ],
        },
      },
      // Rotation: -6° to 0° (opposite direction)
      {
        id: 'incoming-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'rotate', val: -6, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Fade in
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Red channel (opposite phase)
      {
        id: 'incoming-prismatic-edge-red',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'box-shadow-r', val: 128, prog: 0 },
            { key: 'box-shadow-r', val: 255, prog: 0.333 },
            { key: 'box-shadow-r', val: 0, prog: 0.666 },
            { key: 'box-shadow-r', val: 255, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Green channel (opposite phase)
      {
        id: 'incoming-prismatic-edge-green',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'box-shadow-g', val: 255, prog: 0 },
            { key: 'box-shadow-g', val: 0, prog: 0.333 },
            { key: 'box-shadow-g', val: 255, prog: 0.666 },
            { key: 'box-shadow-g', val: 128, prog: 1 },
          ],
        },
      },
      // Prismatic edge - Blue channel (opposite phase)
      {
        id: 'incoming-prismatic-edge-blue',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'box-shadow-b', val: 0, prog: 0 },
            { key: 'box-shadow-b', val: 255, prog: 0.333 },
            { key: 'box-shadow-b', val: 128, prog: 0.666 },
            { key: 'box-shadow-b', val: 255, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video wrapper with screen blend mode for interference effect
  const incomingWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: overlapStart,
        duration: incomingVideoDuration,
      },
    },
    childrenData: [incomingVideoNode],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'polarized-light-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [outgoingWrapper, incomingWrapper],
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
  id: 'polarized-light-transition',
  title: 'Polarized Light Solarization Transition',
  description:
    'Video transition effect simulating rotating polarization filters with progressive color inversion cycles, opposite-phase interference patterns, and prismatic rainbow edges during overlap',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'polarized', 'solarization', 'filter', 'color-invert', 'prismatic', 'interference'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 5,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 5,
    transitionDuration: 1.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const polarizedLightTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
