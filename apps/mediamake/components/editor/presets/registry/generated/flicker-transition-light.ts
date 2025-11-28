/**
 * Flickering Light Bulb Transition Preset
 *
 * This preset creates a noir/thriller-style transition that mimics a flickering light bulb
 * turning on and off between video clips. The outgoing video flickers out like a dying bulb
 * with rapid opacity changes that slow down, while the incoming video flickers in like a bulb
 * warming up with slow flickers that speed up to stability.
 *
 * Features:
 * - **Dying Bulb Effect**: Outgoing video flickers with rapid changes slowing to darkness
 * - **Warming Up Effect**: Incoming video flickers from darkness to steady illumination
 * - **2-Second Overlap**: Both videos visible during the transition for dramatic effect
 * - **Shadow-Play Effects**: Synchronized contrast and brightness pulses with opacity
 * - **Camera Shake**: Subtle shake during peak flicker moments to simulate electrical instability
 * - **High Contrast**: Noir/thriller mood with dramatic light-dark transitions
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Building suspense or tension in thriller/horror content
 * - Adding cinematic flair to documentaries or narrative content
 * - Simulating electrical disturbances or power fluctuations
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z.number().default(2).describe('Duration of the flicker transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Outgoing video starts at 0 and lasts full duration
  // Incoming video starts at (video1.duration - overlapDuration) to create overlap
  const incomingStartTime = video1.duration - overlapDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video with dying bulb flicker
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Dying bulb opacity flicker (rapid → slower → darkness)
        {
          id: 'outgoing-flicker-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration, // Start flicker at overlap
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },        // 0s: Full brightness
              { key: 'opacity', val: 0.2, prog: 0.15 },   // 0.3s: Rapid flicker down
              { key: 'opacity', val: 1, prog: 0.25 },     // 0.5s: Flash back up
              { key: 'opacity', val: 0, prog: 0.4 },      // 0.8s: Flicker out
              { key: 'opacity', val: 0.7, prog: 0.5 },    // 1s: Brief recovery
              { key: 'opacity', val: 0, prog: 0.75 },     // 1.5s: Fade to dark
              { key: 'opacity', val: 0, prog: 1 },        // 2s: Stay dark
            ],
          },
        },
        // Contrast pulses synchronized with opacity
        {
          id: 'outgoing-flicker-contrast',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'contrast', val: 100, prog: 0 },
              { key: 'contrast', val: 150, prog: 0.15 },  // High contrast at first flicker
              { key: 'contrast', val: 100, prog: 0.25 },
              { key: 'contrast', val: 150, prog: 0.4 },   // High contrast at second flicker
              { key: 'contrast', val: 100, prog: 0.75 },
              { key: 'contrast', val: 100, prog: 1 },
            ],
          },
        },
        // Brightness pulses for shadow-play
        {
          id: 'outgoing-flicker-brightness',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'brightness', val: 100, prog: 0 },
              { key: 'brightness', val: 50, prog: 0.15 },   // Dim at flicker
              { key: 'brightness', val: 100, prog: 0.25 },
              { key: 'brightness', val: 50, prog: 0.4 },
              { key: 'brightness', val: 100, prog: 0.75 },
              { key: 'brightness', val: 50, prog: 1 },      // End dim
            ],
          },
        },
        // Camera shake X-axis during intense flicker
        {
          id: 'outgoing-camera-shake-x',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration * 0.4, // First 0.8s of transition
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 5, prog: 0.2 },
              { key: 'translateX', val: -5, prog: 0.4 },
              { key: 'translateX', val: 3, prog: 0.6 },
              { key: 'translateX', val: -3, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        // Camera shake Y-axis during intense flicker
        {
          id: 'outgoing-camera-shake-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration * 0.4,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -4, prog: 0.15 },
              { key: 'translateY', val: 4, prog: 0.35 },
              { key: 'translateY', val: -2, prog: 0.65 },
              { key: 'translateY', val: 2, prog: 0.85 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video with warming bulb flicker
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: video2.duration,
        },
      },
      effects: [
        // Warming bulb opacity flicker (slow → faster → stable)
        {
          id: 'incoming-flicker-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0, // Relative to incoming video start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },        // 0s: Dark
              { key: 'opacity', val: 0, prog: 0.25 },     // 0.5s: Stay dark
              { key: 'opacity', val: 0.3, prog: 0.5 },    // 1s: Weak flicker
              { key: 'opacity', val: 0, prog: 0.6 },      // 1.2s: Flicker out
              { key: 'opacity', val: 0.8, prog: 0.75 },   // 1.5s: Stronger flicker
              { key: 'opacity', val: 0.2, prog: 0.85 },   // 1.7s: Brief dim
              { key: 'opacity', val: 1, prog: 1 },        // 2s: Full brightness
            ],
          },
        },
        // Contrast pulses
        {
          id: 'incoming-flicker-contrast',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'contrast', val: 100, prog: 0 },
              { key: 'contrast', val: 100, prog: 0.25 },
              { key: 'contrast', val: 150, prog: 0.6 },   // High contrast at flicker
              { key: 'contrast', val: 100, prog: 0.75 },
              { key: 'contrast', val: 150, prog: 0.85 },  // High contrast at final flicker
              { key: 'contrast', val: 100, prog: 1 },
            ],
          },
        },
        // Brightness pulses
        {
          id: 'incoming-flicker-brightness',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'brightness', val: 50, prog: 0 },
              { key: 'brightness', val: 50, prog: 0.25 },
              { key: 'brightness', val: 100, prog: 0.6 },
              { key: 'brightness', val: 50, prog: 0.75 },
              { key: 'brightness', val: 100, prog: 0.85 },
              { key: 'brightness', val: 100, prog: 1 },
            ],
          },
        },
        // Camera shake X-axis during intense flicker (later in transition)
        {
          id: 'incoming-camera-shake-x',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: overlapDuration * 0.6, // Start at 1.2s (relative to incoming video)
            duration: overlapDuration * 0.4, // Last 0.8s of transition
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -5, prog: 0.2 },
              { key: 'translateX', val: 5, prog: 0.4 },
              { key: 'translateX', val: -3, prog: 0.6 },
              { key: 'translateX', val: 3, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        // Camera shake Y-axis during intense flicker
        {
          id: 'incoming-camera-shake-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: overlapDuration * 0.6,
            duration: overlapDuration * 0.4,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 4, prog: 0.15 },
              { key: 'translateY', val: -4, prog: 0.35 },
              { key: 'translateY', val: 2, prog: 0.65 },
              { key: 'translateY', val: -2, prog: 0.85 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'flicker-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
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
  id: 'flicker-transition-light',
  title: 'Flickering Light Bulb Transition',
  description:
    'A noir/thriller-style transition that mimics a flickering light bulb turning on and off between video clips. Features strobe-like opacity effects where the outgoing video flickers out like a dying bulb (rapid changes slowing down) while the incoming video flickers in like a bulb warming up (slow flickers speeding up). Includes synchronized contrast/brightness filters and subtle camera shake during intense flicker moments for dramatic shadow-play effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flicker', 'light-bulb', 'noir', 'thriller', 'dramatic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const flickerTransitionLightPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
