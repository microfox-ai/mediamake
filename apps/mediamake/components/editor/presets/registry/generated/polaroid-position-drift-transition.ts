/**
 * Polaroid Position Drift Transition Preset
 *
 * Creates a polaroid-style transition where videos appear as instant photos that slowly
 * slide and rotate into new positions. Features a 1.2s overlap with diagonal drift animations,
 * scale transformations, gentle rotation, white border frame effects, paper texture overlay,
 * and soft shadows for a physical photo aesthetic.
 *
 * Features:
 * - Polaroid-style white border frames around videos
 * - Diagonal drift animations (outgoing: -100px X, +50px Y; incoming: +100px X, -50px Y)
 * - Scale transformations (0.85 during transition)
 * - Gentle rotation effects (-5deg and +5deg)
 * - 1.2s overlap transition period
 * - Paper texture overlay for authentic photo feel
 * - Soft shadows that follow movement
 * - Gradient background (gray-100 to gray-200)
 *
 * Use cases:
 * - Creating nostalgic photo slideshow transitions
 * - Building instant camera-style video presentations
 * - Adding vintage aesthetic to video sequences
 * - Creating tactile, physical-feeling transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
    startFrom: z.number().optional().describe('Start time of first video'),
    endAt: z.number().optional().describe('End time of first video'),
  }).describe('First video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
    startFrom: z.number().optional().describe('Start time of second video'),
    endAt: z.number().optional().describe('End time of second video'),
  }).describe('Second video configuration'),
  
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  
  paperTextureSrc: z
    .string()
    .optional()
    .describe('Source URL for paper texture overlay (optional)'),
  
  backgroundColor: z
    .string()
    .default('bg-gradient-to-br from-gray-100 to-gray-200')
    .describe('Background gradient class for the container'),
  
  borderWidth: z
    .number()
    .default(16)
    .describe('Width of the white polaroid border in pixels'),
  
  shadowIntensity: z
    .enum(['sm', 'md', 'lg', 'xl', '2xl'])
    .default('lg')
    .describe('Shadow intensity for polaroid frames'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    paperTextureSrc,
    backgroundColor,
    borderWidth,
    shadowIntensity,
  } = params;

  // Calculate total duration (sum of videos minus overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when outgoing animation starts (relative to container start)
  const outgoingAnimationStart = video1.duration - overlapDuration;
  
  // Calculate when incoming video starts (relative to container start)
  const incomingVideoStart = video1.duration - overlapDuration;

  // Shadow class based on intensity
  const shadowClass = `shadow-${shadowIntensity}`;

  // Outgoing video wrapper with drift-out effects
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'outgoing-polaroid-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-4 bg-white p-${borderWidth / 4} ${shadowClass}`,
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          startFrom: video1.startFrom,
          endAt: video1.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'outgoing-drift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingAnimationStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-polaroid-wrapper'],
          ranges: [
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.85, prog: 1 },
            // Drift left and down
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -100, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 50, prog: 1 },
            // Rotate left
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -5, prog: 1 },
            // Fade out slightly
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video wrapper with drift-in effects
  const incomingVideoWrapper: RenderableComponentData = {
    id: 'incoming-polaroid-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-4 bg-white p-${borderWidth / 4} ${shadowClass}`,
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          startFrom: video2.startFrom,
          endAt: video2.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'incoming-drift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-polaroid-wrapper'],
          ranges: [
            // Scale up from 0.85 to 1
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Drift from right and up to center
            { key: 'translateX', val: 100, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: -50, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Rotate from right to neutral
            { key: 'rotate', val: 5, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Fade in from slightly transparent
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper texture overlay (optional)
  const childrenData: RenderableComponentData[] = [
    outgoingVideoWrapper,
    incomingVideoWrapper,
  ];

  if (paperTextureSrc) {
    childrenData.push({
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTextureSrc,
        className: 'absolute inset-0 mix-blend-multiply opacity-5 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'polaroid-drift-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full ${backgroundColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'polaroid-position-drift-transition',
  title: 'Polaroid Position Drift Transition',
  description:
    'A polaroid-style video transition where videos appear as instant photos that slowly slide and rotate into new positions. Features a 1.2s overlap with diagonal drift animations, scale transformations, gentle rotation, white border frame effects, paper texture overlay, and soft shadows for a physical photo aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'polaroid',
    'instant-photo',
    'drift',
    'rotation',
    'vintage',
    'nostalgic',
    'paper-texture',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.2,
    backgroundColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
    borderWidth: 16,
    shadowIntensity: 'lg',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const polaroidPositionDriftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
