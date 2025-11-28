/**
 * Photo Negative Solarization Flash Transition Preset
 *
 * This preset creates an aggressive photo-negative solarization transition between two videos
 * with rapid strobe-like inversion pulses. During the overlap period, colors are inverted
 * with 3 rapid flash pulses, creating a dramatic solarization effect reminiscent of old
 * photo processing techniques combined with modern strobe effects.
 *
 * Features:
 * - Dual video crossfade with 0.8s overlap transition at the midpoint
 * - Aggressive color inversion effect (0% → 100% → pulsing)
 * - 3 rapid flash pulses during transition (strobe effect)
 * - Synchronized brightness surges during flash peaks
 * - Outgoing video: progressive invert + pulse + fade out
 * - Incoming video: reverse invert + pulse + fade in
 * - Precise keyframe timing at 0ms, 100ms, 200ms, 300ms, 400ms intervals
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Music video edits with aggressive visual effects
 * - High-energy content with strobe-like transitions
 * - Retro/vintage photo negative aesthetic
 * - Beat-synchronized video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video (outgoing during transition)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video (incoming during transition)'),
  overlapDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of the overlap transition in seconds (default: 0.8s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const transitionStart = video1.duration - overlapDuration;

  // IDs
  const containerId = 'photo-negative-solarization-container';
  const outgoingVideoId = 'outgoing-video';
  const incomingVideoId = 'incoming-video';

  // Create outgoing video with solarization effects
  const outgoingVideo: RenderableComponentData = {
    id: outgoingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      muted: false,
      loop: false,
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Solarization invert effect (progressive invert + pulses)
      {
        id: 'outgoing-solarization-invert',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            // Progressive invert 0% → 100% (first half)
            { key: 'filter:invert', val: 0, prog: 0 },
            { key: 'filter:invert', val: 100, prog: 0.5 },
            // Pulse 1: down to 20%
            { key: 'filter:invert', val: 100, prog: 0.5 },
            { key: 'filter:invert', val: 20, prog: 0.625 },
            // Pulse 2: back to 100%
            { key: 'filter:invert', val: 100, prog: 0.75 },
            // Pulse 3: down to 40%
            { key: 'filter:invert', val: 40, prog: 0.875 },
            // Final: back to 100%
            { key: 'filter:invert', val: 100, prog: 1 },
          ],
        },
      },
      // Brightness surge during flash moments
      {
        id: 'outgoing-brightness-surge',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            // Normal → surge at midpoint
            { key: 'filter:brightness', val: 1, prog: 0 },
            { key: 'filter:brightness', val: 1.5, prog: 0.5 },
            // Pulse 1: dip
            { key: 'filter:brightness', val: 1.2, prog: 0.625 },
            // Pulse 2: surge
            { key: 'filter:brightness', val: 1.5, prog: 0.75 },
            // Pulse 3: dip
            { key: 'filter:brightness', val: 1.3, prog: 0.875 },
            // Final surge
            { key: 'filter:brightness', val: 1.5, prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with reverse solarization effects
  const incomingVideo: RenderableComponentData = {
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover z-10',
      muted: false,
      loop: false,
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      // Solarization invert effect (reverse: starts inverted, pulses, then normal)
      {
        id: 'incoming-solarization-invert',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            // Start at 100% invert
            { key: 'filter:invert', val: 100, prog: 0 },
            // Pulse 1: down to 20%
            { key: 'filter:invert', val: 20, prog: 0.125 },
            // Pulse 2: back to 100%
            { key: 'filter:invert', val: 100, prog: 0.25 },
            // Pulse 3: down to 40%
            { key: 'filter:invert', val: 40, prog: 0.375 },
            // Back to 100%
            { key: 'filter:invert', val: 100, prog: 0.5 },
            // Progressive return to normal (second half)
            { key: 'filter:invert', val: 0, prog: 1 },
          ],
        },
      },
      // Brightness surge during flash moments
      {
        id: 'incoming-brightness-surge',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            // Start with surge
            { key: 'filter:brightness', val: 1.5, prog: 0 },
            // Pulse 1: dip
            { key: 'filter:brightness', val: 1.2, prog: 0.125 },
            // Pulse 2: surge
            { key: 'filter:brightness', val: 1.5, prog: 0.25 },
            // Pulse 3: dip
            { key: 'filter:brightness', val: 1.3, prog: 0.375 },
            // Back to surge
            { key: 'filter:brightness', val: 1.5, prog: 0.5 },
            // Normalize to 1
            { key: 'filter:brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo],
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
  id: 'photo-negative-solarization-transition',
  title: 'Photo Negative Solarization Flash Transition',
  description:
    'Aggressive photo-negative solarization transition with strobe-like inversion pulses during video crossfade. Features rapid 3x flash pulses with inverted colors, brightness surges, and smooth opacity cross-fade during a 0.8-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'solarization',
    'photo-negative',
    'flash',
    'strobe',
    'invert',
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
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const photoNegativeSolarizationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
