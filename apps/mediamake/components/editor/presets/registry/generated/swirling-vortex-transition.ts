/**
 * Swirling Vortex Transition Preset
 *
 * A dynamic 1.8-second transition where the outgoing video rotates clockwise into a vortex center
 * with radial blur and smoke-like particle effects, while the incoming video emerges counter-clockwise
 * from the center.
 *
 * Features:
 * - Compound transforms (scale + rotation) with synchronized timing
 * - Radial blur effects creating spinning smoke sensation
 * - Opacity pulsing simulating particle density variations
 * - Custom cubic-bezier easing for realistic swirl motion
 * - Centered transform origin for vortex focal point
 *
 * Technical Details:
 * - Outgoing video: scale(1→0.3), rotate(0→180deg), opacity[1→0.8→0.3→0], blur(0→30px)
 * - Incoming video: scale(0.3→1), rotate(-180deg→0), opacity[0→0.2→0.7→1], blur(30px→0)
 * - Duration: 1.8 seconds overlap between videos
 * - Easing: cubic-bezier(0.68, -0.55, 0.265, 1.55) for swirl effect
 *
 * Use Cases:
 * - Dramatic video transitions with rotational motion
 * - Cinematic scene changes with vortex effects
 * - Music video transitions synchronized with beat drops
 * - Documentary transitions emphasizing thematic shifts
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the vortex transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate total duration (sum of videos minus overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Outgoing video - spins clockwise into vortex center
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0',
      style: {
        objectFit: 'cover',
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Transform effect (scale + rotation)
      {
        id: 'outgoing-transform',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 180, prog: 1 },
          ],
        },
      },
      // Opacity pulsing effect
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.33 },
            { key: 'opacity', val: 0.3, prog: 0.67 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Radial blur effect
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 30, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video - emerges counter-clockwise from vortex center
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0',
      style: {
        objectFit: 'cover',
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Transform effect (scale + rotation)
      {
        id: 'incoming-transform',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: -180, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity pulsing effect
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.33 },
            { key: 'opacity', val: 0.7, prog: 0.67 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Radial blur effect
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'blur', val: 30, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'swirling-vortex-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoNode, incomingVideoNode],
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
  id: 'swirling-vortex-transition',
  title: 'Swirling Vortex Transition',
  description:
    'A dynamic 1.8-second transition where the outgoing video rotates clockwise into a vortex center with radial blur and smoke-like particle effects, while the incoming video emerges counter-clockwise from the center. Features compound transforms, opacity pulsing, and cubic-bezier easing for a realistic swirling effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vortex', 'spin', 'rotation', 'blur', 'video'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const swirlingVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
