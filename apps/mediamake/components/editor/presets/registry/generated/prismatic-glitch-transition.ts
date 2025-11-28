/**
 * Prismatic Glitch Transition Preset
 *
 * A glitch-style prismatic video transition where the video appears to hit a prism and shatter
 * into rainbow-colored fragments that scatter and reassemble into the next video.
 *
 * Features:
 * - Creates 8 vertical slices per video (16 total) with rainbow spectrum hue-rotate filters
 * - Animates slices with randomized translateX scatter effects during 0.8s transition
 * - Applies rapid opacity flickering to simulate digital glitching
 * - Uses wave-like scaleY distortions that ripple across slices
 * - Staggered timing (50ms per slice) for dynamic scatter/reassemble effect
 * - Outgoing slices scatter away, incoming slices converge and reassemble
 *
 * Use cases:
 * - Music videos with glitch aesthetics
 * - Tech/gaming content transitions
 * - Creative video montages with digital effects
 * - Social media content with eye-catching transitions
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
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
  sliceCount: z
    .number()
    .default(8)
    .describe('Number of vertical slices per video (8 recommended)'),
  staggerDelay: z
    .number()
    .default(0.05)
    .describe('Delay between each slice animation in seconds (50ms default)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, sliceCount, staggerDelay } = params;

  // Helper: Generate random translateX value for scatter effect
  const randomTranslateX = (): number => {
    return Math.random() * 160 - 80; // Random value between -80 and 80
  };

  // Calculate total duration (overlap reduces total time)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate slice width percentage
  const sliceWidth = 100 / sliceCount;

  // Create outgoing video slices
  const outgoingSlices: RenderableComponentData[] = [];
  for (let i = 0; i < sliceCount; i++) {
    const sliceId = `out-slice-${i}`;
    const hueRotate = (i / sliceCount) * 360; // Distribute 0-360 degrees
    const translateAmount = randomTranslateX();
    const effectStartTime = video1.duration - transitionDuration + i * staggerDelay;

    outgoingSlices.push({
      id: sliceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          filter: `hue-rotate(${hueRotate}deg)`,
          position: 'absolute',
          left: `${i * sliceWidth}%`,
          width: `${sliceWidth}%`,
          height: '100%',
          overflow: 'hidden',
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
          id: `scatter-${sliceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: effectStartTime,
            duration: transitionDuration - i * staggerDelay,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              // Scatter translateX
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateAmount, prog: 1 },
              // Glitch opacity flickering
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.5, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              // Wave-like scaleY distortion
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.15, prog: 0.3 },
              { key: 'scaleY', val: 0.85, prog: 0.6 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video slices
  const incomingSlices: RenderableComponentData[] = [];
  for (let i = 0; i < sliceCount; i++) {
    const sliceId = `in-slice-${i}`;
    const hueRotate = (i / sliceCount) * 360;
    const translateAmount = randomTranslateX();
    // Reverse stagger order for incoming (last slice starts first)
    const reverseIndex = sliceCount - 1 - i;
    const effectStartTime = 0; // Relative to incoming start

    incomingSlices.push({
      id: sliceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          filter: `hue-rotate(${hueRotate}deg)`,
          position: 'absolute',
          left: `${i * sliceWidth}%`,
          width: `${sliceWidth}%`,
          height: '100%',
          overflow: 'hidden',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: `reassemble-${sliceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStartTime + reverseIndex * staggerDelay,
            duration: transitionDuration - reverseIndex * staggerDelay,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              // Converge translateX to 0
              { key: 'translateX', val: translateAmount, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              // Glitch opacity flickering (reversed pattern)
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.3, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
              // Wave-like scaleY distortion (reversed)
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 0.85, prog: 0.3 },
              { key: 'scaleY', val: 1.15, prog: 0.6 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-glitch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...outgoingSlices, ...incomingSlices] as RenderableComponentData[],
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
  id: 'prismatic-glitch-transition',
  title: 'Prismatic Glitch Transition',
  description:
    'A glitch-style prismatic video transition where the video shatters into rainbow-colored vertical slices that scatter with digital glitch effects, then reassemble into the next video. Features randomized scatter animations, rapid opacity flickering, and wave-like distortions with staggered timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'prismatic',
    'rainbow',
    'scatter',
    'video',
    'digital',
    'effects',
    'chromatic',
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
    transitionDuration: 0.8,
    sliceCount: 8,
    staggerDelay: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
