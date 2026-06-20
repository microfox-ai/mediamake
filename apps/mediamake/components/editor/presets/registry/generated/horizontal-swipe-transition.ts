/**
 * Horizontal Swipe Transition Preset
 *
 * This preset creates a mobile-inspired horizontal swipe transition that mimics photo gallery
 * gestures. The transition slides media left-to-right with the outgoing media sliding out to
 * the left while the incoming media slides in from the right, creating a continuous horizontal
 * scrolling effect.
 *
 * Features:
 * - Slide-left animation with elastic easing curve for responsive, touchscreen-like feel
 * - 0.8-second overlap period where both media items are visible side-by-side
 * - Subtle drop shadow between media items during transition
 * - Maintains aspect ratios while filling container height
 * - Smooth elastic cubic-bezier easing for natural gesture feel
 *
 * Technical Details:
 * - Uses BaseLayout with relative overflow-hidden container
 * - Outgoing media animates translateX from 0% to -100% during overlap
 * - Incoming media starts at translateX(100%) and animates to 0%
 * - Drop shadow effect applied to outgoing media during transition
 * - Both media use object-fit: cover to maintain aspect ratios
 *
 * Use cases:
 * - Creating mobile photo gallery-style transitions
 * - Building swipeable content sequences
 * - Implementing touch-inspired video transitions
 * - Creating horizontal scrolling media experiences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('First media item (outgoing)'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Second media item (incoming)'),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate container duration: sum of media durations minus overlap
  const containerDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Elastic cubic-bezier easing for responsive touchscreen-like feel
  const elasticEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  const childrenData: RenderableComponentData[] = [
    // Outgoing media (media1) - slides out to the left
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Transform effect: slide out to the left
        {
          id: 'outgoing-transform-effect',
          componentId: 'generic',
          data: {
            type: elasticEasing,
            start: media1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
        // Drop shadow effect during transition
        {
          id: 'outgoing-shadow-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: media1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(4px 0 8px rgba(0,0,0,0.2))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(4px 0 8px rgba(0,0,0,0.2))',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media (media2) - slides in from the right
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 10,
          transform: 'translateX(100%)', // Initial position: off-screen to the right
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: media2.duration,
        },
      },
      effects: [
        // Transform effect: slide in from the right
        {
          id: 'incoming-transform-effect',
          componentId: 'generic',
          data: {
            type: elasticEasing,
            start: 0, // Relative to incoming-media's start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'horizontal-swipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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
  id: 'horizontal-swipe-transition',
  title: 'Horizontal Swipe Transition',
  description:
    'Mobile-inspired horizontal swipe transition that slides media left-to-right with elastic easing. Creates a continuous scrolling effect with outgoing media sliding left while incoming media enters from the right. Features a 0.8-second overlap period with both items visible side-by-side, drop shadow between them, and elastic cubic-bezier easing for natural touchscreen-like responsiveness.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'swipe', 'mobile', 'horizontal', 'slide', 'gesture'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/media1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/media2.mp4',
      type: 'video',
      duration: 4,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const horizontalSwipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
