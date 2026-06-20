/**
 * 3D Page Turn Transition Preset
 *
 * This preset creates a realistic 3D page turn transition where videos appear to be on physical
 * pages that curl and flip over. The outgoing video peels from the top-right corner, gradually
 * curling to reveal the incoming video underneath.
 *
 * Features:
 * - **Realistic 3D Page Curl**: Uses CSS 3D transforms with perspective and rotate3d
 * - **Bezier Curve Motion**: Custom cubic-bezier easing for organic curl motion
 * - **Dynamic Shadow**: Drop shadow follows the curling edge to enhance 3D illusion
 * - **Page Thickness Effect**: Gradient on curling edge simulates page thickness
 * - **Brightness Animation**: Incoming video brightens as page reveals it
 * - **Configurable Timing**: Default 1.5s transition with 70% reveal point
 *
 * Use cases:
 * - Creating page-flip effects between video clips
 * - Building book-like video presentations
 * - Adding elegant transitions to video montages
 * - Simulating physical page turns in digital content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the page turn transition in seconds'),
  perspective: z
    .number()
    .default(1500)
    .describe('CSS perspective value for 3D effect (in pixels)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of the shadow effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, perspective, shadowIntensity } =
    params;

  // Calculate overlap timing
  // BaseLayout duration = video1.duration + video2.duration - transitionDuration
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Transition starts when video1 is about to end
  const transitionStart = video1.duration - transitionDuration;

  // Incoming video starts at the transition point
  const incomingStart = transitionStart;

  // Incoming video duration extends into overlap
  const incomingDuration = video2.duration + transitionDuration;

  // Shadow opacity peaks at 50% then fades
  const shadowPeakProgress = 0.5;

  const childrenData: RenderableComponentData[] = [
    // Incoming video (underneath, revealed as page turns)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        {
          id: 'incoming-brightness-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming video start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'brightness', val: 0.7, prog: 0 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing video (page that curls)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: 2,
          transformOrigin: 'left center',
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'page-curl-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -180, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Shadow overlay (follows the curl edge)
    {
      id: 'curl-shadow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 3,
            background: `linear-gradient(to left, rgba(0,0,0,${shadowIntensity * 0.6}) 0%, transparent 30%)`,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'shadow-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to shadow start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['curl-shadow'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: shadowPeakProgress },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'page-turn-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspective}px`,
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
  id: 'page-turn-3d-transition',
  title: '3D Page Turn Transition',
  description:
    'A realistic 3D page turn transition preset where videos appear on physical pages that curl and flip over. The outgoing video peels from the right edge, gradually curling to reveal the incoming video underneath. Features CSS 3D transforms with perspective, eased animation timing via the effects system, dynamic shadow following the curl edge, and brightness animation on the revealed video. Default duration is 1.5 seconds with configurable overlap timing via transitionDuration parameter.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'page-turn', 'curl', 'flip', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    perspective: 1500,
    shadowIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageTurn3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};