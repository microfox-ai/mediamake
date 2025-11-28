/**
 * Pixel Stretch Corruption Transition Preset
 *
 * This preset creates a data corruption-style transition that simulates horizontal
 * pixel stretching between two videos. The outgoing video progressively stretches
 * and smears while fading out, creating a glitch effect. The incoming video starts
 * compressed and gradually normalizes while fading in.
 *
 * Features:
 * - Horizontal pixel stretching effect (scaleX transform)
 * - RGB channel split effect at transition peak
 * - Synchronized fade in/out animations
 * - Configurable overlap period
 * - Works with videos and images
 *
 * Technical Details:
 * - Uses CSS transform scaleX for pixel stretching
 * - Applies hue-rotate and saturate filters for RGB split effect
 * - BaseLayout duration calculated as sum of media durations minus overlap
 * - All timings are relative to parent components
 *
 * Use cases:
 * - Creating glitch-style transitions between clips
 * - Simulating data corruption effects
 * - Adding retro/digital aesthetic to video transitions
 * - Creating intense, impactful scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video or image'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
    startFrom: z.number().optional().describe('Start time for the outgoing video (default: 0)'),
    volume: z.number().optional().describe('Volume level for outgoing video (0-1, default: 1)'),
    muted: z.boolean().optional().describe('Whether to mute the outgoing video (default: false)'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video or image'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
    startFrom: z.number().optional().describe('Start time for the incoming video (default: 0)'),
    volume: z.number().optional().describe('Volume level for incoming video (0-1, default: 1)'),
    muted: z.boolean().optional().describe('Whether to mute the incoming video (default: false)'),
  }),
  overlapDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds (default: 1.5)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Calculate BaseLayout duration (sum of durations minus overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Determine component types (VideoAtom or ImageAtom)
  const outgoingComponentId = outgoingVideo.src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)
    ? 'VideoAtom'
    : 'ImageAtom';
  const incomingComponentId = incomingVideo.src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)
    ? 'VideoAtom'
    : 'ImageAtom';

  // Build outgoing video effects
  const outgoingStretchEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: outgoingVideo.duration - overlapDuration,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: ['outgoing-video'],
    ranges: [
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 8, prog: 1 },
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const outgoingRgbSplitEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: outgoingVideo.duration - overlapDuration + overlapDuration * 0.25,
    duration: overlapDuration * 0.5,
    mode: 'provider',
    targetIds: ['outgoing-video'],
    ranges: [
      { key: 'hue-rotate', val: 0, prog: 0 },
      { key: 'hue-rotate', val: 10, prog: 0.5 },
      { key: 'hue-rotate', val: 0, prog: 1 },
      { key: 'saturate', val: 1, prog: 0 },
      { key: 'saturate', val: 1.5, prog: 0.5 },
      { key: 'saturate', val: 1, prog: 1 },
    ],
  };

  // Build incoming video effects
  const incomingUncompressEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: ['incoming-video'],
    ranges: [
      { key: 'scaleX', val: 0.2, prog: 0 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  const incomingRgbSplitEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: overlapDuration * 0.25,
    duration: overlapDuration * 0.5,
    mode: 'provider',
    targetIds: ['incoming-video'],
    ranges: [
      { key: 'hue-rotate', val: 0, prog: 0 },
      { key: 'hue-rotate', val: 10, prog: 0.5 },
      { key: 'hue-rotate', val: 0, prog: 1 },
      { key: 'saturate', val: 1, prog: 0 },
      { key: 'saturate', val: 1.5, prog: 0.5 },
      { key: 'saturate', val: 1, prog: 1 },
    ],
  };

  // Build outgoing video component
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      ...(outgoingComponentId === 'VideoAtom' && {
        startFrom: outgoingVideo.startFrom ?? 0,
        volume: outgoingVideo.volume ?? 1,
        muted: outgoingVideo.muted ?? false,
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-stretch-effect',
        componentId: 'generic',
        data: outgoingStretchEffect,
      },
      {
        id: 'outgoing-rgb-split-effect',
        componentId: 'generic',
        data: outgoingRgbSplitEffect,
      },
    ],
  };

  // Build incoming video component
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      ...(incomingComponentId === 'VideoAtom' && {
        startFrom: incomingVideo.startFrom ?? 0,
        volume: incomingVideo.volume ?? 1,
        muted: incomingVideo.muted ?? false,
      }),
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      {
        id: 'incoming-uncompress-effect',
        componentId: 'generic',
        data: incomingUncompressEffect,
      },
      {
        id: 'incoming-rgb-split-effect',
        componentId: 'generic',
        data: incomingRgbSplitEffect,
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'pixel-stretch-corruption-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideoComponent,
      incomingVideoComponent,
    ] as RenderableComponentData[],
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
  id: 'pixel-stretch-corruption-transition',
  title: 'Pixel Stretch Corruption Transition',
  description:
    'A data corruption-style transition that simulates horizontal pixel stretching between two videos. The outgoing video progressively stretches and smears while fading out, creating a glitch effect. The incoming video starts compressed and gradually normalizes while fading in. Features RGB channel splitting at the transition peak for enhanced corruption aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'corruption', 'pixel-stretch', 'video'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      duration: 5,
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      duration: 5,
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pixelStretchCorruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
