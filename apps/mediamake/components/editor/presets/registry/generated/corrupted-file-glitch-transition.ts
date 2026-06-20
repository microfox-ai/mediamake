/**
 * Corrupted File Glitch Transition
 *
 * A transition effect that simulates a damaged video file switching to another video.
 * Features blocky artifacts, frozen frames, and digital noise bursts using an 8x8 mosaic grid.
 * The outgoing video progressively breaks down into frozen pixel blocks that flicker and shift position,
 * while the incoming video assembles from similar corrupted blocks.
 *
 * Features:
 * - 8x8 grid mosaic breakdown effect
 * - Random block freezing and corruption
 * - Position shifts and rotation glitches
 * - RGB channel splitting on corrupted blocks
 * - Contrast and brightness corruption
 * - 0.7s overlap transition period
 *
 * Use cases:
 * - Creating glitchy video transitions
 * - Simulating corrupted file playback
 * - Adding digital noise and artifact effects
 * - Building cyberpunk or tech-themed transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(0.7)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Helper function to generate random values
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to generate random integer
  const randomInt = (min: number, max: number) => {
    return Math.floor(random(min, max));
  };

  // Create 64 grid blocks (8x8) with random corruption effects
  const gridBlocks: RenderableComponentData[] = [];
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const shouldCorrupt = Math.random() > 0.3; // 70% chance of corruption

    // Generate random corruption values
    const translateX = shouldCorrupt ? random(-10, 10) : 0;
    const translateY = shouldCorrupt ? random(-10, 10) : 0;
    const rotate = shouldCorrupt ? random(-5, 5) : 0;
    const brightness = shouldCorrupt ? random(0.5, 1.5) : 1;
    const contrast = 2.0; // High contrast for glitch effect
    const animationDelay = random(0, 0.5);
    const opacity = shouldCorrupt && Math.random() > 0.5 ? 0 : 1; // Random freeze

    gridBlocks.push({
      id: `grid-block-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        className: 'w-full h-full bg-transparent',
        style: {
          gridColumn: `${col + 1}`,
          gridRow: `${row + 1}`,
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
          id: `corruption-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: animationDelay,
            duration: overlapDuration - animationDelay,
            mode: 'provider',
            targetIds: [`grid-block-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX, prog: 0.5 },
              { key: 'translateX', val: translateX * 0.5, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY, prog: 0.5 },
              { key: 'translateY', val: translateY * 0.5, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotate, prog: 0.5 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: opacity, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
              {
                key: 'filter',
                val: `contrast(${contrast}) brightness(${brightness})`,
                prog: 0.5,
              },
              {
                key: 'boxShadow',
                val: shouldCorrupt ? '2px 0 red, -2px 0 cyan' : 'none',
                prog: 0.5,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build the component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (bottom layer)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-glitch-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Grid overlay container (middle layer, active during transition)
    {
      id: 'grid-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 grid grid-cols-8 grid-rows-8',
          style: {
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: gridBlocks,
    } as RenderableComponentData,

    // Incoming video (top layer)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - overlapDuration,
          duration: incomingVideo.duration,
        },
      },
      effects: [
        {
          id: 'incoming-glitch-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'corrupted-glitch-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-gray-900',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration + incomingVideo.duration - overlapDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'corrupted-file-glitch-transition',
  title: 'Corrupted File Glitch Transition',
  description:
    'A glitch transition effect that simulates a damaged video file switching to another. Features blocky artifacts, frozen frames, and digital noise bursts using an 8x8 mosaic grid. Outgoing video progressively breaks down into corrupted pixel blocks while incoming video assembles from similar corrupted blocks.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'corruption', 'video', 'mosaic', 'digital-noise'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const corruptedFileGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
