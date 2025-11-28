/**
 * Barn Door Transition Preset
 *
 * Creates a minimalist transition where the outgoing video splits into horizontal bands
 * that slide apart like opening barn doors, revealing the incoming video underneath.
 *
 * Features:
 * - Divides frame into 3-4 horizontal strips
 * - Top strips slide upward, bottom strips slide downward
 * - Staggered timing (0.08s between each strip) for mechanical reveal
 * - Perfectly straight horizontal edges with precise masking
 * - Supports multiple video clips with consistent transitions
 * - 0.6 second total transition duration
 *
 * Use cases:
 * - Clean transitions between video segments
 * - Mechanical/organized reveal effects
 * - Professional video editing transitions
 * - Sequential video playback with style
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time of the outgoing video (for trimming)'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time of the incoming video (for trimming)'),
  }),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the barn door transition in seconds'),
  stripCount: z
    .number()
    .min(3)
    .max(4)
    .default(4)
    .describe('Number of horizontal strips (3 or 4)'),
  staggerDelay: z
    .number()
    .default(0.08)
    .describe('Delay in seconds between each strip animation'),
  stripDuration: z
    .number()
    .default(0.3)
    .describe('Duration of each individual strip animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    stripCount,
    staggerDelay,
    stripDuration,
  } = params;

  // Calculate total composition duration (overlap transition)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Define strip configurations based on count
  const getStripConfig = (count: number) => {
    if (count === 3) {
      return [
        { clipPath: 'inset(0 0 66.67% 0)', translateY: -100, zIndex: 30 }, // Top
        { clipPath: 'inset(33.33% 0 33.33% 0)', translateY: 0, zIndex: 20 }, // Middle (no movement)
        { clipPath: 'inset(66.67% 0 0 0)', translateY: 100, zIndex: 10 }, // Bottom
      ];
    } else {
      // 4 strips (default)
      return [
        { clipPath: 'inset(0 0 75% 0)', translateY: -100, zIndex: 40 }, // Top
        { clipPath: 'inset(25% 0 50% 0)', translateY: -50, zIndex: 30 }, // Upper-mid
        { clipPath: 'inset(50% 0 25% 0)', translateY: 50, zIndex: 20 }, // Lower-mid
        { clipPath: 'inset(75% 0 0 0)', translateY: 100, zIndex: 10 }, // Bottom
      ];
    }
  };

  const stripConfigs = getStripConfig(stripCount);

  // Create strip children data
  const stripChildren: RenderableComponentData[] = stripConfigs.map(
    (config, index) => {
      const stripId = `strip-${index + 1}`;
      const effectStart = index * staggerDelay;

      return {
        id: stripId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'absolute inset-0 object-cover',
          style: {
            clipPath: config.clipPath,
            zIndex: config.zIndex,
          },
          fit: 'cover',
          startFrom: outgoingVideo.startFrom || 0,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `${stripId}-slide-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: effectStart,
              duration: stripDuration,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: config.translateY, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create strip container
  const stripContainer: RenderableComponentData = {
    id: 'strip-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: stripChildren,
  };

  // Create incoming video layer (static, underneath strips)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 object-cover',
      style: {
        zIndex: 0,
      },
      fit: 'cover',
      startFrom: incomingVideo.startFrom || 0,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration + incomingVideo.duration,
      },
    },
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'barn-door-transition-root',
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
        fitDurationTo: 'this',
      },
    },
    childrenData: [incomingVideoLayer, stripContainer],
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
  id: 'barn-door-transition',
  title: 'Barn Door Transition Preset',
  description:
    'A minimalist transition effect where videos transition through symmetrical horizontal bands that slide apart like opening barn doors. Divides the frame into 3-4 horizontal strips that slide outward from the center with staggered timing, revealing the incoming video underneath. Features precise mechanical reveal with perfectly straight edges.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'barn-door', 'horizontal', 'slide', 'reveal', 'video'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
      startFrom: 0,
    },
    transitionDuration: 0.6,
    stripCount: 4,
    staggerDelay: 0.08,
    stripDuration: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const barnDoorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
