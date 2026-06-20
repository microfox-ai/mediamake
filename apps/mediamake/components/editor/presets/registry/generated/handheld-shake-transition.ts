/**
 * Handheld Camera Shake Transition Preset
 *
 * Creates a documentary-style stop motion transition with organic handheld camera shake using sine wave patterns.
 * Features 0.8s overlap where outgoing video shakes with increasing amplitude while fading out, and incoming video
 * starts with maximum shake that stabilizes. Includes motion blur proportional to shake intensity and subtle zoom
 * breathing effect (scale oscillation 1 to 1.02 to 0.98 to 1) with cubic-bezier easing for organic movement feel.
 *
 * Features:
 * - Organic sine wave motion patterns for X and Y axes (amplitude: 8-12px, frequency: 3-4 cycles)
 * - 0.8s overlap transition period
 * - Outgoing video: increasing shake amplitude with fade out
 * - Incoming video: maximum shake decreasing to stable
 * - Motion blur proportional to shake intensity (0px to 2px)
 * - Zoom breathing effect (scale: 1 to 1.02 to 0.98 to 1)
 * - Cubic-bezier(0.4, 0, 0.6, 1) easing for organic feel
 *
 * Use cases:
 * - Documentary-style transitions between video clips
 * - Stop motion animation effects
 * - Organic handheld camera movement simulation
 * - Dynamic video transitions with realistic camera shake
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
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration (outgoing video)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration (incoming video)'),
  overlapDuration: z.number().default(0.8).describe('Duration of the transition overlap in seconds (default: 0.8s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate timing: total duration = video1.duration + video2.duration - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const incomingStartTime = video1.duration - overlapDuration;

  // Helper function to create sine wave shake keyframes
  const createShakeRanges = (
    startAmplitude: number,
    endAmplitude: number,
    isX: boolean,
  ) => {
    const key = isX ? 'translateX' : 'translateY';
    const cycles = 3.5; // 3-4 cycles over 0.8s
    const steps = 7; // Keyframe steps to simulate sine wave
    const ranges: Array<{ key: string; val: string; prog: number }> = [];

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const angle = progress * cycles * Math.PI * 2;
      const amplitude = startAmplitude + (endAmplitude - startAmplitude) * progress;
      const sineValue = Math.sin(angle) * amplitude;
      ranges.push({
        key,
        val: `${sineValue.toFixed(2)}px`,
        prog: progress,
      });
    }

    return ranges;
  };

  // Outgoing video: shake increases, opacity fades out
  const outgoingShakeXRanges = createShakeRanges(0, 12, true); // X: 0 to 12px
  const outgoingShakeYRanges = createShakeRanges(0, 10, false); // Y: 0 to 10px (offset sine)

  // Incoming video: shake decreases from max to stable
  const incomingShakeXRanges = createShakeRanges(12, 0, true); // X: 12 to 0px
  const incomingShakeYRanges = createShakeRanges(10, 0, false); // Y: 10 to 0px

  // Scale breathing effect keyframes (1 → 1.02 → 0.98 → 1.01 → 0.99 → 1)
  const scaleRanges = [
    { key: 'scale', val: 1, prog: 0 },
    { key: 'scale', val: 1.02, prog: 0.2 },
    { key: 'scale', val: 0.98, prog: 0.4 },
    { key: 'scale', val: 1.01, prog: 0.6 },
    { key: 'scale', val: 0.99, prog: 0.8 },
    { key: 'scale', val: 1, prog: 1 },
  ];

  // Opacity ranges for fade out
  const opacityFadeOutRanges = [
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: 0, prog: 1 },
  ];

  // Opacity ranges for fade in
  const opacityFadeInRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Motion blur ranges (proportional to shake intensity)
  const outgoingBlurRanges = [
    { key: 'filter', val: 'blur(0px)', prog: 0 },
    { key: 'filter', val: 'blur(2px)', prog: 1 },
  ];

  const incomingBlurRanges = [
    { key: 'filter', val: 'blur(2px)', prog: 0 },
    { key: 'filter', val: 'blur(0px)', prog: 1 },
  ];

  // Outgoing video container with effects
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Shake X effect (increasing amplitude)
      {
        id: 'outgoing-shake-x',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: outgoingShakeXRanges,
        },
      },
      // Shake Y effect (increasing amplitude, offset)
      {
        id: 'outgoing-shake-y',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: outgoingShakeYRanges,
        },
      },
      // Scale breathing effect
      {
        id: 'outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: scaleRanges,
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: opacityFadeOutRanges,
        },
      },
      // Motion blur (increasing)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: outgoingBlurRanges,
        },
      },
    ],
  };

  // Incoming video container with effects
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Shake X effect (decreasing amplitude)
      {
        id: 'incoming-shake-x',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: incomingShakeXRanges,
        },
      },
      // Shake Y effect (decreasing amplitude, offset)
      {
        id: 'incoming-shake-y',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: incomingShakeYRanges,
        },
      },
      // Scale breathing effect
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)' as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: scaleRanges,
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: opacityFadeInRanges,
        },
      },
      // Motion blur (decreasing)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: incomingBlurRanges,
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'handheld-shake-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
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
  id: 'handheld-shake-transition',
  title: 'Handheld Camera Shake Transition',
  description: 'A documentary-style stop motion transition with organic handheld camera shake using sine wave patterns. Features 0.8s overlap where outgoing video shakes with increasing amplitude while fading out, and incoming video starts with maximum shake that stabilizes. Includes motion blur proportional to shake intensity and subtle zoom breathing effect (scale oscillation 1 to 1.02 to 0.98 to 1) with cubic-bezier easing for organic movement feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shake', 'handheld', 'documentary', 'stop-motion', 'video', 'organic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const handheldShakeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
