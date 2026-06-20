/**
 * Glass Shatter Transition Preset
 *
 * Creates a dramatic glass-shattering transition effect where the outgoing video
 * appears to shatter into 12 triangular fragments that fall away with realistic
 * gravity-like physics, revealing the incoming video behind.
 *
 * Features:
 * - 12 triangular fragments using CSS clip-path
 * - Individual transform animations (rotate, scale, translate) per fragment
 * - Gravity-like acceleration using cubic-bezier easing
 * - Progressive motion blur that increases as fragments fall
 * - Staggered timing for realistic shattering sequence
 * - Incoming video fades in with subtle scale animation
 *
 * Technical Implementation:
 * - BaseLayout with 1.6s overlap duration
 * - Outgoing video split into 12 clipped divs with unique triangular masks
 * - Each fragment has independent rotation, scale, translation, opacity, and blur
 * - Cubic-bezier(0.55, 0, 1, 0.45) easing for acceleration effect
 * - Staggered animation delays (0-0.3s) for sequential shattering
 *
 * Use cases:
 * - Dramatic scene transitions in action videos
 * - Impact moments in storytelling
 * - Breaking news or reveal sequences
 * - Creative video transitions with high visual impact
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  overlapDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition overlap in seconds'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    overlapDuration,
    outgoingVideoDuration,
    incomingVideoDuration,
  } = params;

  // Fragment definitions with clip-path polygons
  const fragments = [
    { id: 0, clipPath: 'polygon(0% 0%, 33% 0%, 16.5% 33%)' },
    { id: 1, clipPath: 'polygon(33% 0%, 66% 0%, 50% 33%)' },
    { id: 2, clipPath: 'polygon(66% 0%, 100% 0%, 83% 33%)' },
    { id: 3, clipPath: 'polygon(0% 0%, 16.5% 33%, 0% 33%)' },
    { id: 4, clipPath: 'polygon(16.5% 33%, 33% 0%, 50% 33%, 33% 66%)' },
    { id: 5, clipPath: 'polygon(50% 33%, 66% 0%, 83% 33%, 66% 66%)' },
    { id: 6, clipPath: 'polygon(83% 33%, 100% 0%, 100% 33%, 100% 66%)' },
    {
      id: 7,
      clipPath: 'polygon(0% 33%, 16.5% 33%, 33% 66%, 16.5% 100%, 0% 100%)',
    },
    { id: 8, clipPath: 'polygon(33% 66%, 50% 33%, 66% 66%, 50% 100%)' },
    { id: 9, clipPath: 'polygon(66% 66%, 83% 33%, 100% 66%, 83% 100%)' },
    { id: 10, clipPath: 'polygon(16.5% 100%, 50% 100%, 33% 66%)' },
    { id: 11, clipPath: 'polygon(50% 100%, 83% 100%, 66% 66%)' },
  ];

  // Random values for each fragment (consistent per fragment)
  const fragmentAnimations = [
    { rotate: -35, translateX: -45, stagger: 0.0 },
    { rotate: 25, translateX: 15, stagger: 0.05 },
    { rotate: 40, translateX: 50, stagger: 0.1 },
    { rotate: -20, translateX: -30, stagger: 0.02 },
    { rotate: 15, translateX: 10, stagger: 0.12 },
    { rotate: -40, translateX: 25, stagger: 0.18 },
    { rotate: 30, translateX: 40, stagger: 0.25 },
    { rotate: -25, translateX: -50, stagger: 0.08 },
    { rotate: 20, translateX: 5, stagger: 0.15 },
    { rotate: -30, translateX: 35, stagger: 0.22 },
    { rotate: 35, translateX: -20, stagger: 0.28 },
    { rotate: -15, translateX: 45, stagger: 0.3 },
  ];

  // Create fragment components
  const fragmentComponents: RenderableComponentData[] = fragments.map(
    (fragment, index) => {
      const animation = fragmentAnimations[index];
      const fragmentId = `fragment-${fragment.id}`;

      return {
        id: fragmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              clipPath: fragment.clipPath,
              transformOrigin: 'center center',
            },
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
            id: `fragment-${fragment.id}-effect`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: animation.stagger,
              duration: overlapDuration - animation.stagger,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                // Rotation
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: animation.rotate, prog: 1 },
                // Scale
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
                // TranslateY (gravity)
                { key: 'translateY', val: '0%', prog: 0 },
                { key: 'translateY', val: '150%', prog: 1 },
                // TranslateX (horizontal spread)
                {
                  key: 'translateX',
                  val: '0%',
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${animation.translateX}%`,
                  prog: 1,
                },
                // Opacity fade
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
                // Motion blur (increases as it falls)
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(3px)', prog: 0.5 },
                { key: 'filter', val: 'blur(6px)', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: `fragment-${fragment.id}-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideoSrc,
              fit: 'cover',
              className: 'w-full h-full',
              muted: true,
            },
            context: {
              timing: {
                start: 0,
                duration: overlapDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing fragments container
  const outgoingFragmentsContainer: RenderableComponentData = {
    id: 'outgoing-fragments-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
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
    childrenData: fragmentComponents,
  };

  // Incoming video container (behind fragments)
  const incomingVideoContainerId = 'incoming-video-container';
  const incomingVideoContainer: RenderableComponentData = {
    id: incomingVideoContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: incomingVideoDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: [incomingVideoContainerId],
          ranges: [
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoContainerId],
          ranges: [
            // Scale up
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glass-shatter-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          outgoingVideoDuration + incomingVideoDuration - overlapDuration,
      },
    },
    childrenData: [incomingVideoContainer, outgoingFragmentsContainer],
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
  id: 'glass-shatter-transition',
  title: 'Glass Shatter Transition',
  description:
    'A dramatic transition effect where the outgoing video shatters into 12 triangular glass fragments that fall away with gravity-like acceleration, revealing the incoming video behind with motion blur.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glass', 'shatter', 'fragments', 'dramatic', 'effects'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    overlapDuration: 1.6,
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glassShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
