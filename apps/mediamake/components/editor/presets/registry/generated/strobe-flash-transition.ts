/**
 * Stroboscopic Flash Transition Preset
 *
 * This preset creates a dramatic paparazzi/club strobe-style transition between two videos.
 * It features multiple rapid white flashes of varying intensity that create glimpses of both
 * the outgoing and incoming videos with harsh overexposure effects.
 *
 * Features:
 * - **4 Irregular Flash Effects**: Quick white flashes with varying intensity (0.8, 1, 0.6, 1)
 * - **Staggered Timing**: Flashes at 0.2s, 0.5s, 0.8s, and 1.2s for organic, chaotic feel
 * - **Final Long Flash**: The last flash (at 1.2s) is longest (0.3s) and brightest for transition completion
 * - **Double-Exposure Effect**: Between flashes, both videos are visible with reduced opacity
 * - **Overexposure Simulation**: Brightness and contrast oscillate during flashes for harsh effect
 * - **Overlap Period**: 1.5s transition overlap where both videos are visible
 *
 * Use cases:
 * - Creating dramatic video transitions with paparazzi flash effects
 * - Building club/nightlife style transitions with strobe effects
 * - Adding high-energy transitions to music videos
 * - Creating attention-grabbing transitions for promotional content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First (outgoing) video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second (incoming) video configuration'),
  
  overlapDuration: z.number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;
  
  // Calculate base layout duration (sum of videos minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;
  
  // Flash configurations (timing and peak opacity relative to overlap period)
  const flashes = [
    { id: 'flash-1', start: 0.2, duration: 0.1, peakOpacity: 0.8 },
    { id: 'flash-2', start: 0.5, duration: 0.1, peakOpacity: 1 },
    { id: 'flash-3', start: 0.8, duration: 0.1, peakOpacity: 0.6 },
    { id: 'flash-4', start: 1.2, duration: 0.3, peakOpacity: 1 }, // Longest and brightest final flash
  ];
  
  // Outgoing video timing: starts at beginning, lasts full duration
  const outgoingVideoStart = 0;
  const outgoingVideoDuration = video1.duration;
  
  // Incoming video timing: starts before outgoing ends (overlap), extends into its full duration
  const incomingVideoStart = video1.duration - overlapDuration;
  const incomingVideoDuration = video2.duration + overlapDuration;
  
  // Build flash layer components
  const flashLayers: RenderableComponentData[] = flashes.map((flash) => {
    const flashEffects = [
      {
        id: `${flash.id}-animation`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: flash.start,
          duration: flash.duration,
          mode: 'provider' as const,
          targetIds: [flash.id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flash.peakOpacity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
    
    return {
      id: flash.id,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: 'white',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: incomingVideoStart, // Flashes occur during overlap period
          duration: overlapDuration,
        },
      },
      effects: flashEffects,
      childrenData: [],
    } as RenderableComponentData;
  });
  
  // Outgoing video effects
  const outgoingVideoEffects = [
    // Opacity: start at 1, fade to 0.6 during non-flash moments, then to 0 at end
    {
      id: 'outgoing-opacity',
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
    // Brightness oscillation (1 to 2) during overlap
    {
      id: 'outgoing-brightness',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.2 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.35 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.65 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.8 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
        ],
      },
    },
  ];
  
  // Incoming video effects
  const incomingVideoEffects = [
    // Opacity: start at 0.4 during non-flash, fade to 1 at end
    {
      id: 'incoming-opacity',
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.4, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
    // Brightness oscillation (1 to 2) during overlap
    {
      id: 'incoming-brightness',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.2 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.35 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.65 },
          { key: 'filter', val: 'brightness(2) contrast(1.5)', prog: 0.8 },
          { key: 'filter', val: 'brightness(1.5) contrast(1.2)', prog: 1 },
        ],
      },
    },
  ];
  
  // Build outgoing video
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover' as const,
      style: {
        position: 'absolute',
        inset: 0,
      },
    },
    context: {
      timing: {
        start: outgoingVideoStart,
        duration: outgoingVideoDuration,
      },
    },
    effects: outgoingVideoEffects,
  };
  
  // Build incoming video
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover' as const,
      startFrom: 0,
      style: {
        position: 'absolute',
        inset: 0,
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: incomingVideoDuration,
      },
    },
    effects: incomingVideoEffects,
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'strobe-flash-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingVideo,
      ...flashLayers,
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
  id: 'strobe-flash-transition',
  title: 'Stroboscopic Flash Transition',
  description: 'A dramatic paparazzi/club strobe-style transition with multiple rapid white flashes of varying intensity between two videos. Features 4 irregular flashes that create glimpses of both videos with harsh overexposure effects. During non-flash moments, both videos are visible in a double-exposure effect. The final flash is longest and brightest, completing the transition to the incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'strobe', 'flash', 'paparazzi', 'club', 'dramatic', 'overexposure', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const strobeFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
