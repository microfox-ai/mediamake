/**
 * Warped Vortex Tunnel Transition Preset
 *
 * Creates a mesmerizing time-warp vortex transition effect where the outgoing video
 * spirals into a central point while the incoming video emerges from the vortex center.
 * Features exponential easing, motion blur trails via duplicated layers, and swirl
 * distortion effects using scale, rotation, and blur transformations.
 *
 * Features:
 * - Exponential easing for dramatic acceleration/deceleration
 * - Motion blur trails with staggered timing offsets
 * - Spiral vortex effect with 720-degree rotation
 * - Scale transformation from full size to pinpoint center
 * - Progressive blur from 0 to 30px for depth effect
 * - Reverse rotation for incoming video creating counter-spiral
 * - Multiple opacity-faded duplicates for trail effect
 * - 1.5-second overlap period for smooth transition
 *
 * Use cases:
 * - Creating dramatic sci-fi transitions between video clips
 * - Building time-travel or dimensional shift effects
 * - Adding cinematic vortex transitions to video montages
 * - Creating portal-style transitions between scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingDuration,
    incomingDuration,
    transitionDuration,
  } = params;

  // Calculate total container duration (sum of both videos minus overlap)
  const totalDuration = outgoingDuration + incomingDuration - transitionDuration;

  // Timing offsets for trail duplicates
  const trailOffsets = [0.1, 0.2, 0.3];
  const trailOpacities = [0.3, 0.2, 0.1];
  const trailRotations = [700, 680, 660]; // Slightly different rotation speeds

  // Create outgoing video trail layers (3 duplicates + 1 main)
  const outgoingTrails: RenderableComponentData[] = [];

  // Trail 3 (lowest z-index, most offset)
  outgoingTrails.push({
    id: 'outgoing-trail-3',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-trail-3-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[2],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-3'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-3-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[2],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-3'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: trailRotations[2], prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-3-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[2],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-3'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(30px)', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-3-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[2],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-3'],
          ranges: [
            { key: 'opacity', val: trailOpacities[2], prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Trail 2
  outgoingTrails.push({
    id: 'outgoing-trail-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-trail-2-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[1],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-2'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-2-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[1],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-2'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: trailRotations[1], prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-2-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[1],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-2'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(30px)', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-2-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[1],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-2'],
          ranges: [
            { key: 'opacity', val: trailOpacities[1], prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Trail 1
  outgoingTrails.push({
    id: 'outgoing-trail-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-trail-1-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[0],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-1'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-1-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[0],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-1'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: trailRotations[0], prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-1-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[0],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-1'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(30px)', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-trail-1-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration + trailOffsets[0],
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-trail-1'],
          ranges: [
            { key: 'opacity', val: trailOpacities[0], prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Main outgoing video
  outgoingTrails.push({
    id: 'outgoing-main',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-main-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-main'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-main-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-main'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 720, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-main-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-main'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(30px)', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-main-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-expo',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-main'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Create incoming video trail layers (3 duplicates + 1 main)
  const incomingTrails: RenderableComponentData[] = [];

  // Calculate incoming start time (relative to container)
  const incomingStartTime = outgoingDuration - transitionDuration;

  // Trail 3 (lowest z-index, most offset)
  incomingTrails.push({
    id: 'incoming-trail-3',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: incomingStartTime + trailOffsets[2],
        duration: incomingDuration + transitionDuration - trailOffsets[2],
      },
    },
    effects: [
      {
        id: 'incoming-trail-3-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-3'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-3-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-3'],
          ranges: [
            { key: 'rotate', val: -trailRotations[2], prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-3-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-3'],
          ranges: [
            { key: 'filter', val: 'blur(30px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-3-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-3'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: trailOpacities[2], prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Trail 2
  incomingTrails.push({
    id: 'incoming-trail-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: incomingStartTime + trailOffsets[1],
        duration: incomingDuration + transitionDuration - trailOffsets[1],
      },
    },
    effects: [
      {
        id: 'incoming-trail-2-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-2'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-2-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-2'],
          ranges: [
            { key: 'rotate', val: -trailRotations[1], prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-2-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-2'],
          ranges: [
            { key: 'filter', val: 'blur(30px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-2-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: trailOpacities[1], prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Trail 1
  incomingTrails.push({
    id: 'incoming-trail-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: incomingStartTime + trailOffsets[0],
        duration: incomingDuration + transitionDuration - trailOffsets[0],
      },
    },
    effects: [
      {
        id: 'incoming-trail-1-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-1'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-1-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-1'],
          ranges: [
            { key: 'rotate', val: -trailRotations[0], prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-1-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-1'],
          ranges: [
            { key: 'filter', val: 'blur(30px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-trail-1-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-trail-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: trailOpacities[0], prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Main incoming video
  incomingTrails.push({
    id: 'incoming-main',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 object-cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-main-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-main'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-main-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-main'],
          ranges: [
            { key: 'rotate', val: -720, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-main-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-main'],
          ranges: [
            { key: 'filter', val: 'blur(30px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-main-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out-expo',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-main'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Combine all layers (trails behind mains via order)
  const allLayers = [...outgoingTrails, ...incomingTrails];

  const rootContainer: RenderableComponentData = {
    id: 'warped-vortex-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allLayers,
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
  id: 'warped-vortex-transition',
  title: 'Warped Vortex Tunnel Transition',
  description:
    'Creates a time-warp vortex tunnel transition effect where the outgoing video spirals into the center while the incoming video emerges from the vortex. Features exponential easing, motion blur trails via duplicated layers with staggered timing, and swirl distortion effects using scale, rotation, and blur transformations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vortex', 'tunnel', 'warp', 'spiral', 'rotation'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const warpedVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
