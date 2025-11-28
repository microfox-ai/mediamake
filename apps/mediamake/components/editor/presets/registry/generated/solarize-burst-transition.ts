/**
 * Solarize Burst Transition Preset
 *
 * Creates a dramatic radial color inversion transition with circular shockwave expanding from center.
 * The transition features:
 * - Circular portal reveal that expands from center to full frame
 * - Color inversion effect that creates a solarized burst appearance
 * - Outgoing video gets inverted colors as the circle expands
 * - Incoming video reveals with inverse colors that normalize
 * - Camera shake effect at burst moment for added impact
 * - Smooth synchronization of all effects during overlap period
 *
 * Technical approach:
 * - Single BaseLayout container with two VideoAtoms
 * - Outgoing video: filter transitions from invert(0%) to invert(100%)
 * - Incoming video: starts with invert(100%), transitions to invert(0%)
 * - Circular clip-path animation from 0% to 150% radius
 * - Shake effect applied to container during burst peak
 * - Z-index management ensures proper layering
 *
 * Use cases:
 * - High-energy music video transitions
 * - Action sequence cuts with impact
 * - Dramatic scene changes in cinematic content
 * - Beat-synchronized video edits
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      type: z
        .enum(['video', 'image'])
        .default('video')
        .describe('Media type of outgoing content'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Configuration for the outgoing video'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      type: z
        .enum(['video', 'image'])
        .default('video')
        .describe('Media type of incoming content'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Configuration for the incoming video'),

  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of the transition overlap in seconds'),

  shakeIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Intensity of camera shake effect in pixels'),

  burstMoment: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('When the burst/shake happens during transition (0-1 progress)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    shakeIntensity,
    burstMoment,
  } = params;

  // Calculate timing
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const transitionStartTime = outgoingVideo.duration - transitionDuration;
  const incomingStartTime = transitionStartTime;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate shake timing (relative to container start)
  const shakeStart = transitionStartTime + transitionDuration * burstMoment;
  const shakeDuration = 0.1; // 100ms shake burst

  // Outgoing video with color inversion
  const outgoingVideoNode: RenderableComponentData = {
    id: 'solarize-outgoing-video',
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-invert-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['solarize-outgoing-video'],
          ranges: [
            { key: 'filter:invert', val: 0, prog: 0 },
            { key: 'filter:invert', val: 100, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with inverse color normalization and circular reveal
  const incomingVideoNode: RenderableComponentData = {
    id: 'solarize-incoming-video',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Circular clip-path reveal
      {
        id: 'incoming-clip-path-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['solarize-incoming-video'],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
          ],
        },
      },
      // Color inversion normalization (100% -> 0%)
      {
        id: 'incoming-invert-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration * 0.75, // Normalize by 75% of transition
          mode: 'provider',
          targetIds: ['solarize-incoming-video'],
          ranges: [
            { key: 'filter:invert', val: 100, prog: 0 },
            { key: 'filter:invert', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'solarize-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Camera shake effect at burst moment
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['solarize-burst-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.25 },
            { key: 'translateY', val: shakeIntensity, prog: 0.25 },
            { key: 'translateX', val: shakeIntensity, prog: 0.5 },
            { key: 'translateY', val: -shakeIntensity, prog: 0.5 },
            { key: 'translateX', val: -shakeIntensity * 0.6, prog: 0.75 },
            { key: 'translateY', val: shakeIntensity * 0.6, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [outgoingVideoNode, incomingVideoNode] as RenderableComponentData[],
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
  id: 'solarize-burst-transition',
  title: 'Solarize Burst Transition',
  description:
    'Dramatic radial color inversion transition with circular shockwave expanding from center, synchronized camera shake, and inverse color normalization effect',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'solarize',
    'burst',
    'radial',
    'color-inversion',
    'shockwave',
    'dramatic',
    'shake',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.6,
    shakeIntensity: 5,
    burstMoment: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const solarizeBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
