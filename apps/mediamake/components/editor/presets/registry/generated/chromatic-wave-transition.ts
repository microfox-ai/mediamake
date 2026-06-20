/**
 * Chromatic Wave Transition Preset
 *
 * Creates a prismatic wave transition where videos transition through a wave of chromatic distortion
 * that rolls across the screen like light through a moving prism.
 *
 * Features:
 * - 15 vertical video strips that undulate with sine wave animations
 * - Progressive RGB channel separation that peaks as the wave passes through each strip
 * - Refraction distortion using skew transforms
 * - Wave propagation from left to right over 1.1 seconds
 * - Mix blend modes for chromatic aberration effect
 *
 * Technical Details:
 * - BaseLayout with 1.1s overlap duration
 * - 15 vertical strips (6.67% width each)
 * - Staggered animation delays based on strip position
 * - Sine wave motion: translateY (-30px to +30px)
 * - Skew transforms: -10deg to +10deg for refraction
 * - RGB color overlays with lighten blend mode
 * - Opacity transitions for fade in/out
 *
 * Use cases:
 * - Creating dynamic video transitions
 * - Adding prismatic effects to video sequences
 * - Building engaging visual transitions for social media content
 * - Creating professional video montages with unique transitions
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
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.1)
    .describe('Duration of transition overlap in seconds'),
  numStrips: z
    .number()
    .int()
    .min(10)
    .max(20)
    .default(15)
    .describe('Number of vertical strips (10-20)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration, numStrips } = params;

  // Calculate strip width
  const stripWidth = 100 / numStrips;

  // Helper function to create video strips
  const createVideoStrips = (
    video: { src: string; duration: number },
    isOutgoing: boolean,
  ): RenderableComponentData[] => {
    const strips: RenderableComponentData[] = [];

    for (let i = 0; i < numStrips; i++) {
      const stripId = `${isOutgoing ? 'outgoing' : 'incoming'}-strip-${i}`;
      const objectPosition = `${(i * stripWidth).toFixed(2)}% center`;

      // Calculate staggered animation delay
      const delayFraction = i / numStrips;
      const animationDelay = delayFraction * overlapDuration;
      const animationDuration = overlapDuration - animationDelay;

      // Create animation ranges for sine wave motion
      const ranges = [
        // TranslateY - sine wave motion
        { key: 'translateY', val: isOutgoing ? 0 : -30, prog: 0 },
        { key: 'translateY', val: isOutgoing ? 30 : 0, prog: 0.25 },
        { key: 'translateY', val: isOutgoing ? 0 : 30, prog: 0.5 },
        { key: 'translateY', val: isOutgoing ? -30 : 0, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
        // SkewY - refraction distortion
        { key: 'skewY', val: isOutgoing ? 0 : -10, prog: 0 },
        { key: 'skewY', val: isOutgoing ? 10 : 0, prog: 0.25 },
        { key: 'skewY', val: 0, prog: 0.5 },
        { key: 'skewY', val: isOutgoing ? -10 : 10, prog: 0.75 },
        { key: 'skewY', val: 0, prog: 1 },
        // Opacity - fade in/out
        { key: 'opacity', val: isOutgoing ? 1 : 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: isOutgoing ? 0 : 1, prog: 1 },
      ];

      strips.push({
        id: stripId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            width: `${stripWidth.toFixed(2)}%`,
            height: '100%',
            objectPosition,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${stripId}-wave`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: animationDelay,
              duration: animationDuration,
              mode: 'provider',
              targetIds: [stripId],
              ranges,
            },
          },
        ],
      } as RenderableComponentData);
    }

    return strips;
  };

  // Create outgoing and incoming strip containers
  const outgoingStrips = createVideoStrips(outgoingVideo, true);
  const incomingStrips = createVideoStrips(incomingVideo, false);

  // Create RGB chromatic overlays
  const chromaticOverlays: RenderableComponentData[] = [
    {
      id: 'chromatic-red-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            mixBlendMode: 'lighten',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'red-chromatic-shift',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['chromatic-red-overlay'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -8, prog: 0.25 },
              { key: 'translateX', val: -12, prog: 0.5 },
              { key: 'translateX', val: -8, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.15, prog: 0.25 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.15, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'chromatic-blue-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: 'rgba(0, 100, 255, 0.1)',
            mixBlendMode: 'lighten',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'blue-chromatic-shift',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['chromatic-blue-overlay'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 8, prog: 0.25 },
              { key: 'translateX', val: 12, prog: 0.5 },
              { key: 'translateX', val: 8, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.15, prog: 0.25 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.15, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Build container structure
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: outgoingStrips,
  };

  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: incomingStrips,
  };

  const chromaticOverlayContainer: RenderableComponentData = {
    id: 'chromatic-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: chromaticOverlays,
  };

  const rootContainer: RenderableComponentData = {
    id: 'chromatic-wave-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [
      outgoingContainer,
      incomingContainer,
      chromaticOverlayContainer,
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
  id: 'chromatic-wave-transition',
  title: 'Chromatic Wave Transition',
  description:
    'A prismatic video transition where videos transition through a wave of chromatic distortion rolling across the screen like light through a moving prism. Features 15 vertical video strips with staggered sine wave animations, skew transforms for refraction effect, and RGB color overlays for chromatic aberration feel. Wave propagates left to right over 1.1 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'chromatic',
    'wave',
    'prismatic',
    'distortion',
    'rgb',
    'strips',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.1,
    numStrips: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const chromaticWaveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
