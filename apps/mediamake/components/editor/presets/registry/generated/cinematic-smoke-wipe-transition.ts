/**
 * Cinematic Smoke Wipe Transition Preset
 *
 * This preset creates a cinematic smoke wipe transition where fog particles sweep across
 * the screen horizontally, revealing the next video. The transition features directional
 * dissolve effects with turbulence-like shake for organic particle movement.
 *
 * Features:
 * - **Directional Smoke Wipe**: Fog particles sweep from right to left
 * - **Dual Video Animation**: Outgoing video slides left while incoming video is revealed
 * - **Turbulence Shake**: Mid-transition shake effects for organic particle feel
 * - **Custom Blur Gradients**: Progressive blur effects simulate smoke density
 * - **Transform Animations**: Combined translateX and opacity animations
 * - **Configurable Duration**: 1.5-second transition overlap period
 *
 * Use cases:
 * - Creating cinematic video transitions
 * - Building professional video montages
 * - Adding smoke-like particle effects between clips
 * - Creating atmospheric scene changes
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video properties'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video properties'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the smoke wipe transition overlap in seconds'),
  smokeDirection: z
    .enum(['right-to-left', 'left-to-right'])
    .default('right-to-left')
    .describe('Direction of smoke particle movement'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of turbulence shake effect in pixels'),
  blurIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .describe('Maximum blur intensity for smoke effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    smokeDirection,
    turbulenceIntensity,
    blurIntensity,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate direction values
  const isRightToLeft = smokeDirection === 'right-to-left';
  const outgoingTranslateStart = 0;
  const outgoingTranslateEnd = isRightToLeft ? -20 : 20;
  const incomingTranslateStart = isRightToLeft ? 10 : -10;
  const incomingTranslateEnd = 0;

  // Calculate timing for turbulence (midpoint of transition)
  const turbulenceStart = video1.duration - transitionDuration / 2 - 0.15; // 0.3s duration centered at midpoint
  const turbulenceDuration = 0.3;

  // Outgoing video (slides out with fade and blur)
  const outgoingVideo: RenderableComponentData = {
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
      // Main slide-fade-blur effect
      {
        id: 'outgoing-slide-fade',
        componentId: 'generic',
        data: {
          type: 'easeInOutCubic',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: outgoingTranslateStart, prog: 0, unit: '%' },
            { key: 'translateX', val: outgoingTranslateEnd, prog: 1, unit: '%' },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: blurIntensity, prog: 1, unit: 'px' },
          ],
        },
      },
      // Turbulence shake effect at midpoint
      {
        id: 'outgoing-shake-turbulence',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: turbulenceStart,
          duration: turbulenceDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: 'px' },
            { key: 'translateY', val: turbulenceIntensity, prog: 0.25, unit: 'px' },
            { key: 'translateY', val: -turbulenceIntensity, prog: 0.75, unit: 'px' },
            { key: 'translateY', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
    ],
  };

  // Incoming video (revealed from offset position with fade-in and blur-out)
  const incomingVideo: RenderableComponentData = {
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
        start: video1.duration - transitionDuration,
        duration: video2.duration,
      },
    },
    effects: [
      // Reveal-fade-blur effect
      {
        id: 'incoming-reveal-fade',
        componentId: 'generic',
        data: {
          type: 'easeInOutCubic',
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: incomingTranslateStart, prog: 0, unit: '%' },
            { key: 'translateX', val: incomingTranslateEnd, prog: 1, unit: '%' },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'blur', val: blurIntensity * 1.33, prog: 0, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
    ],
  };

  // Container for outgoing video (z-10)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [outgoingVideo],
  };

  // Container for incoming video (z-20)
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'smoke-wipe-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'cinematic-smoke-wipe-transition',
  title: 'Cinematic Smoke Wipe Transition',
  description:
    'A cinematic smoke wipe transition where fog particles sweep across the screen horizontally, revealing the next video with directional dissolve effects, turbulent shake, and custom blur gradients.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'smoke',
    'wipe',
    'cinematic',
    'fog',
    'particles',
    'directional',
    'blur',
    'shake',
    'turbulence',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.5,
    smokeDirection: 'right-to-left',
    turbulenceIntensity: 2,
    blurIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicSmokeWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
