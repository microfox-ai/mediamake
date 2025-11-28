/**
 * Venetian Blinds Transition Preset
 *
 * Creates a geometric blinds transition using thin horizontal rectangular strips that rotate
 * on their X-axis to reveal the next video. Divides the frame into 8-10 horizontal strips
 * that flip like venetian blinds. Each strip rotates 180 degrees around its center axis
 * with a subtle wave-like timing offset from top to bottom.
 *
 * Features:
 * - 10 horizontal strips that flip independently
 * - Wave-like cascade timing (0.05s offset per strip)
 * - 3D rotation with preserve-3d and perspective
 * - Each strip has front (outgoing) and back (incoming) video faces
 * - Crisp edges with backface-hidden
 * - 0.8 second transition duration
 * - Supports both image and video media
 *
 * Use cases:
 * - Creating smooth venetian blinds transitions between videos
 * - Building dynamic video sequences with 3D effects
 * - Adding professional flip-reveal transitions
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
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media item'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media item'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition in seconds'),
  stripCount: z
    .number()
    .min(8)
    .max(10)
    .default(10)
    .describe('Number of horizontal strips (8-10)'),
  stripDelayOffset: z
    .number()
    .default(0.05)
    .describe('Time delay offset between strips (seconds)'),
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
    stripDelayOffset,
  } = params;

  // Helper to determine component ID from media type
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Calculate BaseLayout duration (sum of durations minus overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Create strips
  const strips: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `strip-${i}`;
    const stripStartDelay = i * stripDelayOffset;
    
    // Calculate object position for each strip (vertical slicing)
    const verticalPosition = (i / (stripCount - 1)) * 100;
    const objectPosition = `center ${verticalPosition.toFixed(1)}%`;

    // Front face container (outgoing video)
    const frontContainer: RenderableComponentData = {
      id: `${stripId}-front-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backfaceVisibility: 'hidden',
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
          id: `${stripId}-front-video`,
          type: 'atom',
          componentId: getComponentId(outgoingVideo.type),
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              objectPosition: objectPosition,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    // Back face container (incoming video, pre-rotated 180deg)
    const backContainer: RenderableComponentData = {
      id: `${stripId}-back-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: `${stripId}-back-video`,
          type: 'atom',
          componentId: getComponentId(incomingVideo.type),
          data: {
            src: incomingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              objectPosition: objectPosition,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    // Strip container with rotation effect
    const strip: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full flex-1',
          style: {
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: `${stripId}-rotate-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration + stripStartDelay,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 180, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [frontContainer, backContainer],
    };

    strips.push(strip);
  }

  // Root container with perspective for 3D effect
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex flex-col',
        style: {
          perspective: '2000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: strips,
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
  id: 'venetian-blinds-transition',
  title: 'Venetian Blinds Transition',
  description:
    'Geometric blinds transition using horizontal strips that rotate on their X-axis to reveal the next video. Divides the frame into 8-10 strips that flip like venetian blinds with a wave-like timing offset from top to bottom.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'venetian', 'blinds', 'flip', '3d', 'rotate'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.8,
    stripCount: 10,
    stripDelayOffset: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};