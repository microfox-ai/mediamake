/**
 * Liquid Pixel Flow Transition
 *
 * A dynamic transition effect where pixels from the outgoing video appear to melt and flow
 * downward like digital rain, revealing the incoming video behind. The preset creates 60
 * vertical pixel strips that fall at varying speeds with horizontal drift, simulating an
 * organic flowing motion. Color bleeding effects are applied where falling pixels temporarily
 * tint the incoming video using mix-blend-mode. The transition creates a mesmerizing liquid
 * cascade that bridges two videos.
 *
 * Features:
 * - 60 vertical pixel strips with randomized fall speeds and delays
 * - Horizontal drift during fall for organic motion
 * - Stretching effects via scaleY animations for liquid appearance
 * - Opacity fade during final 30% of animation
 * - Color bleeding via color-dodge blend mode
 * - Overlap timing for smooth transition between videos
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Building dynamic liquid-style scene changes
 * - Adding futuristic digital rain effects
 * - Transitioning between thematic sections with visual impact
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
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of transition overlap in seconds'),
  stripCount: z
    .number()
    .default(60)
    .describe('Number of vertical pixel strips (default: 60)'),
  fallDurationRange: z
    .tuple([z.number(), z.number()])
    .default([0.8, 1.5])
    .describe('Range for strip fall durations [min, max] in seconds'),
  delayRange: z
    .tuple([z.number(), z.number()])
    .default([0, 0.6])
    .describe('Range for strip animation delays [min, max] in seconds'),
  driftRange: z
    .tuple([z.number(), z.number()])
    .default([-20, 20])
    .describe('Range for horizontal drift [min, max] in pixels'),
  scaleYRange: z
    .tuple([z.number(), z.number()])
    .default([0.5, 1.5])
    .describe('Range for vertical stretching [min, max] scale values'),
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
    stripCount,
    fallDurationRange,
    delayRange,
    driftRange,
    scaleYRange,
  } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Generate pixel strip data
  const generateStripData = (index: number) => {
    const delay = randomInRange(delayRange[0], delayRange[1]);
    const duration = randomInRange(fallDurationRange[0], fallDurationRange[1]);
    const drift = randomInRange(driftRange[0], driftRange[1]);
    const scaleY = randomInRange(scaleYRange[0], scaleYRange[1]);
    const leftPosition = (index / stripCount) * 100;

    return { delay, duration, drift, scaleY, leftPosition };
  };

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Create pixel strips
  const pixelStrips: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripData = generateStripData(i);
    const stripId = `pixel-strip-${i}`;

    // Calculate opacity fade timing (last 30% of animation)
    const fadeStartProg = 0.7;

    pixelStrips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full overflow-hidden',
          style: {
            width: '2%',
            left: `${stripData.leftPosition}%`,
            mixBlendMode: 'color-dodge',
            backgroundColor: `hsl(${(i * 360) / stripCount}, 70%, 60%)`,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration + stripData.delay,
          duration: stripData.duration,
        },
      },
      effects: [
        {
          id: `fall-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: stripData.duration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              // Fall animation (translateY)
              { key: 'translateY', val: '0vh', prog: 0 },
              { key: 'translateY', val: '120vh', prog: 1 },
              // Horizontal drift (translateX)
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${stripData.drift}px`, prog: 1 },
              // Vertical stretching (scaleY)
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: stripData.scaleY, prog: 0.5 },
              { key: 'scaleY', val: 1, prog: 1 },
              // Opacity fade (last 30% of animation)
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: fadeStartProg },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Build composition
  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-0)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [],
      childrenData: [],
    } as RenderableComponentData,
    // Outgoing video (middle layer, z-10)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [],
      childrenData: [],
    } as RenderableComponentData,
    // Pixel strips container (top layer, z-20)
    {
      id: 'pixel-strips-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: pixelStrips,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-pixel-flow-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
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
  id: 'liquid-pixel-flow-transition',
  title: 'Liquid Pixel Flow Transition',
  description:
    'A liquid pixel flow transition where pixels from the outgoing video appear to melt and flow downward like digital rain, revealing the incoming video behind. Features 60 vertical pixel strips with varying fall speeds, horizontal drift, stretching effects, and color bleeding via mix-blend-mode.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'pixel',
    'flow',
    'digital-rain',
    'melt',
    'color-bleeding',
    'video',
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
    stripCount: 60,
    fallDurationRange: [0.8, 1.5],
    delayRange: [0, 0.6],
    driftRange: [-20, 20],
    scaleYRange: [0.5, 1.5],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidPixelFlowTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
