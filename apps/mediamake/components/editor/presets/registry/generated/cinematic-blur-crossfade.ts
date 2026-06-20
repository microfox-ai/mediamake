/**
 * Cinematic Blur Crossfade Transition Preset
 *
 * This preset creates a dreamy, professional transition between two videos with:
 * - Synchronized blur effects (outgoing blurs from 0→8px, incoming unblurs from 8px→0)
 * - Opacity crossfade (outgoing fades to 0, incoming fades to 1)
 * - Subtle scale animations (outgoing scales down to 0.95, incoming scales up from 1.05)
 * - 2-second overlap period for smooth handoff
 *
 * The transition creates a focus-shift effect where the viewer's attention smoothly
 * transfers from one video to the next through coordinated blur, opacity, and scale changes.
 *
 * Features:
 * - **2-second overlap**: Both videos visible during transition
 * - **Synchronized effects**: Blur, opacity, and scale all animate together
 * - **Dreamy aesthetic**: Blur creates a soft, cinematic feel
 * - **Depth perception**: Scale animations add dimensional movement
 * - **Provider mode**: Effects applied directly to video atoms via targetIds
 *
 * Use cases:
 * - Professional video transitions
 * - Scene changes in narratives
 * - Dreamy montage sequences
 * - Memory/flashback effects
 * - Smooth video stitching
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
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration accounting for overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Timing for incoming video (starts before outgoing video ends)
  const incomingStartTime = video1.duration - overlapDuration;

  // Create outgoing video with fade-out, blur-out, and scale-down effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade-out effect
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect (sharp to 8px)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
      // Scale down effect (1 to 0.95)
      {
        id: 'outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with fade-in, unblur, and scale-up effects
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: video2.duration,
      },
    },
    effects: [
      // Opacity fade-in effect
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Unblur effect (8px to sharp)
      {
        id: 'incoming-unblur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Scale up effect (1.05 to 1)
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 1.05, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with both videos
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-blur-crossfade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full',
        style: {
          position: 'relative',
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
  id: 'cinematic-blur-crossfade',
  title: 'Cinematic Blur Crossfade Transition',
  description:
    'A dreamy cinematic cross-fade transition with synchronized blur and opacity animations. During the 2-second overlap, the outgoing video gradually blurs from sharp (0px) to 8px while fading out and scaling down to 0.95, as the incoming video simultaneously unblurs from 8px to sharp while fading in and scaling up from 1.05 to 1. Creates a professional focus-shift effect between scenes with smooth handoff between video layers.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'blur', 'crossfade', 'cinematic', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicBlurCrossfadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
