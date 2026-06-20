/**
 * Circular Ring Transition Preset
 *
 * A minimalist circular ring transition where concentric rings expand outward from the center,
 * each revealing portions of the new video. Creates 5-6 rings with increasing diameters that
 * scale up sequentially. Each ring is a perfect circle with a clean 2-pixel white border.
 * The rings expand with elastic easing, slightly overshooting before settling.
 *
 * Features:
 * - **Concentric Rings**: 5-6 rings with increasing diameters expanding from center
 * - **Sequential Animation**: Rings appear one after another with 0.15s delays
 * - **Elastic Easing**: Rings scale with overshoot effect (scale(0) → scale(1.05) → scale(1))
 * - **White Borders**: Clean 2-pixel white borders on each ring
 * - **Ripple Reveal**: Area inside each ring shows incoming video, outside shows outgoing video
 * - **Smooth Transition**: 1.1 second total transition duration
 *
 * Use cases:
 * - Creating elegant transitions between video clips
 * - Adding sophisticated reveal effects to presentations
 * - Building modern video montages with style
 * - Creating ripple-like visual transitions
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
    type: z.enum(['image', 'video']).describe('Media type of outgoing content'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['image', 'video']).describe('Media type of incoming content'),
  }),
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Total duration of the transition in seconds'),
  ringCount: z
    .number()
    .min(5)
    .max(6)
    .default(5)
    .describe('Number of concentric rings (5-6)'),
  ringDelay: z
    .number()
    .default(0.15)
    .describe('Delay between each ring animation in seconds'),
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
    ringCount,
    ringDelay,
  } = params;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate ring diameters (10%, 20%, 35%, 50%, 71%)
  const ringDiameters = [10, 20, 35, 50, 71].slice(0, ringCount);

  // Calculate animation timing for each ring
  const ringAnimationDuration = 1.0; // Each ring animates for 1 second

  // Create ring containers with videos and borders
  const ringContainers: RenderableComponentData[] = ringDiameters.map(
    (diameter, index) => {
      // Calculate staggered start time for this ring
      const ringStartDelay = index * ringDelay;
      const effectDuration = ringAnimationDuration - ringStartDelay;

      // Ring container ID
      const containerId = `ring-${index + 1}-container`;

      // Ring border size (2x diameter for border element)
      const borderDiameter = diameter * 2;

      return {
        id: containerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex items-center justify-center pointer-events-none',
            style: {
              zIndex: index + 1,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [
          // Incoming video with circular clip-path
          {
            id: `ring-${index + 1}-video`,
            type: 'atom',
            componentId: incomingComponentId,
            data: {
              src: incomingVideo.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                clipPath: `circle(${diameter}% at 50% 50%)`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
          // Ring border using HTMLBlockAtom
          {
            id: `ring-${index + 1}-border`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: ${borderDiameter}%; height: 0; padding-bottom: ${borderDiameter}%; border: 2px solid white; border-radius: 50%; pointer-events: none;"></div>`,
              className:
                'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
        ] as RenderableComponentData[],
        effects: [
          {
            id: `ring-${index + 1}-scale-effect`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Elastic easing
              start: ringStartDelay,
              duration: effectDuration,
              mode: 'provider',
              targetIds: [containerId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.05, prog: 0.8 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'circular-ring-transition-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing video (full screen, z-index 0)
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: outgoingComponentId,
        data: {
          src: outgoingVideo.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            zIndex: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Ring containers (stacked with increasing z-index)
      ...ringContainers,
    ] as RenderableComponentData[],
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
  id: 'circular-ring-transition',
  title: 'Circular Ring Transition',
  description:
    'A minimalist circular ring transition where 5-6 concentric rings expand outward from the center, each revealing portions of the new video. Rings expand sequentially with elastic easing, featuring clean white borders and a ripple-like reveal effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'circular', 'rings', 'reveal', 'elegant', 'ripple'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.1,
    ringCount: 5,
    ringDelay: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const circularRingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};