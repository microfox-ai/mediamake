/**
 * Liquid Metal Morphing Transition Preset
 *
 * Creates a mercury-like fluid transformation between two videos using circular masked segments.
 * The 1.4-second transition features the outgoing video liquefying into metallic droplets that
 * coalesce to form the incoming video.
 *
 * Features:
 * - 6 circular masked segments for each video (12 total)
 * - Elastic scaling animations (1 → 1.3 → 0 for outgoing, reverse for incoming)
 * - Position animations that scatter and coalesce
 * - Metallic sheen effects using CSS filters (grayscale, brightness, contrast)
 * - Drop-shadow for depth
 * - Screen blend mode for luminous mercury effect
 * - 1.4-second overlap duration
 *
 * Use cases:
 * - Creative video transitions with liquid metal aesthetics
 * - Science fiction or futuristic video content
 * - Music videos with dynamic visual effects
 * - Product showcase transitions
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate base layout duration (overlap reduces total duration)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Define 6 circular positions with varying sizes
  const circlePositions = [
    { x: 30, y: 40, radius: 20 }, // Top-left region
    { x: 70, y: 30, radius: 18 }, // Top-right region
    { x: 50, y: 60, radius: 22 }, // Center-bottom
    { x: 15, y: 70, radius: 15 }, // Bottom-left
    { x: 85, y: 75, radius: 19 }, // Bottom-right
    { x: 45, y: 20, radius: 17 }, // Top-center
  ];

  // Helper function to create scatter positions (outward movement)
  const getScatterPosition = (x: number, y: number) => {
    const centerX = 50;
    const centerY = 50;
    const scatterDistance = 30; // Distance to scatter outward
    const angle = Math.atan2(y - centerY, x - centerX);
    return {
      x: x + Math.cos(angle) * scatterDistance,
      y: y + Math.sin(angle) * scatterDistance,
    };
  };

  const childrenData: RenderableComponentData[] = [];

  // Create 6 outgoing video circles
  circlePositions.forEach((pos, index) => {
    const scatterPos = getScatterPosition(pos.x, pos.y);

    childrenData.push({
      id: `outgoing-circle-${index + 1}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute mix-blend-screen',
        style: {
          width: '100%',
          height: '100%',
          clipPath: `circle(${pos.radius}% at ${pos.x}% ${pos.y}%)`,
        },
        fit: 'cover',
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: `outgoing-scale-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`outgoing-circle-${index + 1}`],
            ranges: [
              // Scale: 1 → 1.3 → 0 (elastic effect)
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.3 },
              { key: 'scale', val: 0, prog: 1 },
              // Position: animate outward to scatter position
              {
                key: 'translateX',
                val: `0%`,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `${scatterPos.x - pos.x}%`,
                prog: 1,
              },
              {
                key: 'translateY',
                val: `0%`,
                prog: 0,
              },
              {
                key: 'translateY',
                val: `${scatterPos.y - pos.y}%`,
                prog: 1,
              },
              // Metallic filter: grayscale + brightness + contrast
              {
                key: 'filter',
                val: 'grayscale(0) brightness(1) contrast(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'grayscale(1) brightness(1.3) contrast(1.2)',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'grayscale(1) brightness(1.3) contrast(1.2)',
                prog: 1,
              },
              // Opacity fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // Create 6 incoming video circles (reverse animation)
  circlePositions.forEach((pos, index) => {
    const scatterPos = getScatterPosition(pos.x, pos.y);

    childrenData.push({
      id: `incoming-circle-${index + 1}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute mix-blend-screen',
        style: {
          width: '100%',
          height: '100%',
          clipPath: `circle(${pos.radius}% at ${pos.x}% ${pos.y}%)`,
        },
        fit: 'cover',
        muted: true,
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: `incoming-scale-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming video start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-circle-${index + 1}`],
            ranges: [
              // Scale: 0 → 1.3 → 1 (reverse of outgoing)
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
              // Position: animate inward from scattered position
              {
                key: 'translateX',
                val: `${scatterPos.x - pos.x}%`,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `0%`,
                prog: 1,
              },
              {
                key: 'translateY',
                val: `${scatterPos.y - pos.y}%`,
                prog: 0,
              },
              {
                key: 'translateY',
                val: `0%`,
                prog: 1,
              },
              // Metallic filter fade in (reverse)
              {
                key: 'filter',
                val: 'grayscale(1) brightness(1.3) contrast(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.5))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'grayscale(1) brightness(1.3) contrast(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.5))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'grayscale(0) brightness(1) contrast(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
                prog: 1,
              },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
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
  id: 'liquid-metal-transition',
  title: 'Liquid Metal Morphing Transition',
  description:
    'A 1.4-second transition simulating mercury-like fluid transformation between videos. Features 6 circular masked segments with elastic scaling, metallic sheen effects, and smooth position animations creating a liquid metal coalescing effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'metal',
    'mercury',
    'morphing',
    'creative',
    'circular',
    'elastic',
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
    transitionDuration: 1.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMetalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
