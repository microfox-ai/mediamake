/**
 * 3D Card Flip Transition Preset
 *
 * This preset creates a UI-inspired card flip transition that rotates media items
 * in 3D space, similar to flipping through a digital card deck. The outgoing media
 * rotates on the Y-axis from 0 to -90 degrees while scaling down slightly, and the
 * incoming media rotates from 90 to 0 degrees while scaling up. A subtle blur effect
 * during the rotation simulates depth of field.
 *
 * Features:
 * - 3D perspective rendering with proper layering
 * - Synchronized rotation and scaling animations
 * - Depth-of-field blur effect during transition
 * - Smooth 1-second overlap period
 * - Support for both images and videos
 * - Backface visibility handling for clean transitions
 *
 * Use cases:
 * - Creating card-based navigation transitions
 * - Building interactive card deck animations
 * - Professional media transitions with depth
 * - UI-inspired video sequences
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
    src: z.string().describe('Source URL of the first media item'),
    type: z.enum(['image', 'video']).describe('Type of the first media item'),
    duration: z.number().describe('Duration of the first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second media item'),
    type: z.enum(['image', 'video']).describe('Type of the second media item'),
    duration: z.number().describe('Duration of the second media in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds (default: 1.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate total duration: media1 + media2 - overlap
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media types
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  const media1ComponentId = getComponentId(media1.type);
  const media2ComponentId = getComponentId(media2.type);

  // Timing for outgoing media
  const outgoingStart = 0;
  const outgoingDuration = media1.duration;
  const outgoingTransitionStart = outgoingDuration - overlapDuration;

  // Timing for incoming media
  const incomingStart = media1.duration - overlapDuration;
  const incomingDuration = media2.duration;

  // Create outgoing media wrapper with transform and blur effects
  const outgoingMediaWrapper: RenderableComponentData = {
    id: 'outgoing-media-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Transform effect: rotate and scale during transition
      {
        id: 'outgoing-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingTransitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-wrapper'],
          ranges: [
            { key: 'transform', val: 'rotateY(0deg) scale(1)', prog: 0 },
            {
              key: 'transform',
              val: 'rotateY(-90deg) scale(0.9)',
              prog: 1,
            },
          ],
        },
      },
      // Blur effect: subtle blur during rotation
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingTransitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-wrapper'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          style: {
            backfaceVisibility: 'hidden',
          },
          ...(media1.type === 'video'
            ? {
                playbackRate: 1,
                volume: 1,
                muted: false,
              }
            : {}),
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create incoming media wrapper with transform and blur effects
  const incomingMediaWrapper: RenderableComponentData = {
    id: 'incoming-media-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          transform: 'rotateY(90deg) scale(0.9)',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Transform effect: rotate from 90deg to 0deg and scale up
      {
        id: 'incoming-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media-wrapper'],
          ranges: [
            { key: 'transform', val: 'rotateY(90deg) scale(0.9)', prog: 0 },
            { key: 'transform', val: 'rotateY(0deg) scale(1)', prog: 1 },
          ],
        },
      },
      // Blur effect: subtle blur during rotation
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media-wrapper'],
          ranges: [
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2ComponentId,
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          style: {
            backfaceVisibility: 'hidden',
          },
          ...(media2.type === 'video'
            ? {
                playbackRate: 1,
                volume: 1,
                muted: false,
              }
            : {}),
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'card-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          perspective: '1000px',
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingMediaWrapper, incomingMediaWrapper],
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
  id: 'card-flip-transition',
  title: '3D Card Flip Transition',
  description:
    'UI-inspired card flip transition that rotates media items in 3D space with depth-of-field blur effects. Creates a smooth flip animation with outgoing media rotating from 0 to -90 degrees while incoming media rotates from 90 to 0 degrees, both with subtle scaling and blur effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'card-flip', 'rotation', 'media', 'depth'],
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
    overlapDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cardFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
