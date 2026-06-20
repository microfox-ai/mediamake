/**
 * Atmospheric Smoke Wave Transition Preset
 *
 * This preset creates a fluid atmospheric smoke wave transition between two videos.
 * The outgoing video distorts with wave-like motion (skewing and scaling) while fading
 * behind simulated smoke, and the incoming video emerges from the wave crest with
 * complementary distortion patterns.
 *
 * Features:
 * - **Wave Motion**: Undulating skew and scale transforms with multiple keyframes
 * - **Smoke Effect**: Blur transitions simulating fog rolling across the screen
 * - **Brightness Waves**: Dynamic brightness changes following the smoke movement
 * - **Fluid Timing**: 2.8-second overlap period with easeInOutQuad easing
 * - **Complementary Distortion**: Inverse wave patterns on incoming video
 *
 * Use cases:
 * - Creating cinematic video transitions with atmospheric effects
 * - Building dream-like or ethereal scene changes
 * - Adding organic, fluid transitions to video montages
 * - Creating ocean wave-inspired visual effects
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
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(2.8)
    .describe('Duration of the smoke wave transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate BaseLayout duration (total time accounting for overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Outgoing video: starts at 0, full duration
  const outgoingVideoData: RenderableComponentData = {
    id: 'smoke-wave-outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-wave-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOutQuad',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['smoke-wave-outgoing-video'],
          ranges: [
            // SkewX oscillation: -5deg → 5deg → -3deg → 0deg
            { key: 'skewX', val: '-5deg', prog: 0 },
            { key: 'skewX', val: '5deg', prog: 0.33 },
            { key: 'skewX', val: '-3deg', prog: 0.66 },
            { key: 'skewX', val: '0deg', prog: 1 },
            // ScaleY wave: 1 → 1.1 → 0.95 → 1
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.1, prog: 0.33 },
            { key: 'scaleY', val: 0.95, prog: 0.66 },
            { key: 'scaleY', val: 1, prog: 1 },
            // Opacity fade: 1 → 0
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Blur increase: 0 → 22px
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 22, prog: 1 },
            // Brightness oscillation: 100% → 120% → 80% → 50%
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1.2, prog: 0.25 },
            { key: 'brightness', val: 0.8, prog: 0.66 },
            { key: 'brightness', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video: starts before outgoing ends (overlap), extended duration
  const incomingVideoData: RenderableComponentData = {
    id: 'smoke-wave-incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-wave-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOutQuad',
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['smoke-wave-incoming-video'],
          ranges: [
            // SkewX inverse oscillation: 5deg → -5deg → 3deg → 0deg
            { key: 'skewX', val: '5deg', prog: 0 },
            { key: 'skewX', val: '-5deg', prog: 0.33 },
            { key: 'skewX', val: '3deg', prog: 0.66 },
            { key: 'skewX', val: '0deg', prog: 1 },
            // ScaleY inverse wave: 0.9 → 1.05 → 1.1 → 1
            { key: 'scaleY', val: 0.9, prog: 0 },
            { key: 'scaleY', val: 1.05, prog: 0.33 },
            { key: 'scaleY', val: 1.1, prog: 0.66 },
            { key: 'scaleY', val: 1, prog: 1 },
            // Opacity fade in: 0 → 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Blur decrease: 28px → 0
            { key: 'blur', val: 28, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            // Brightness inverse oscillation: 50% → 80% → 120% → 100%
            { key: 'brightness', val: 0.5, prog: 0 },
            { key: 'brightness', val: 0.8, prog: 0.25 },
            { key: 'brightness', val: 1.2, prog: 0.66 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'smoke-wave-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideoData, incomingVideoData],
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
  id: 'smoke-wave-transition',
  title: 'Atmospheric Smoke Wave Transition',
  description:
    'A fluid 2.8-second smoke wave transition with wave-like distortion, undulating motion, and brightness waves that follow smoke movement between videos',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'smoke',
    'wave',
    'atmospheric',
    'fluid',
    'distortion',
    'cinematic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 2.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const smokeWaveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
