/**
 * Liquid 3D Warp Transition Preset
 *
 * This preset creates a 3D perspective warp transition that simulates videos existing in a viscous liquid 3D space.
 * During a 2-second overlap, the outgoing video appears to sink into a liquid surface using perspective transforms
 * and rotateX animations, while the incoming video rises from beneath.
 *
 * Features:
 * - **3D Perspective Space**: Creates illusion of videos in 3D liquid environment
 * - **Displacement Effect**: Multiple stacked semi-transparent duplicates with different blend modes
 * - **Perspective Transforms**: rotateX animations from 0deg to -45deg (outgoing) and 45deg to 0deg (incoming)
 * - **Chromatic Aberration**: RGB channel splitting effect during transition peak
 * - **Dynamic Blur**: Blur increases on outgoing video as it sinks
 * - **Scale Animations**: Outgoing scales down to 0.7, incoming scales from 1.3 to 1.0
 * - **Staggered Opacity**: Multiple layers with different opacity fadeouts
 *
 * Use cases:
 * - Creating cinematic transitions with 3D depth effects
 * - Building immersive video sequences with liquid-like motion
 * - Adding professional broadcast-style transitions
 * - Creating surreal video montages with warping effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of chromatic aberration effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, chromaticIntensity } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;
  const incomingStart = video1.duration - overlapDuration;
  const incomingDuration = video2.duration + overlapDuration;
  const transitionStart = video1.duration - overlapDuration;

  // Helper to create video layer with effects
  const createVideoLayer = (
    id: string,
    src: string,
    zIndex: number,
    blendMode: string,
    opacity: number,
    isOutgoing: boolean,
    layerIndex: number,
  ): RenderableComponentData => {
    const startTime = isOutgoing ? outgoingStart : incomingStart;
    const duration = isOutgoing ? outgoingDuration : incomingDuration;
    const effectStart = isOutgoing ? transitionStart : 0;

    // Chromatic offset for each layer
    const chromaticOffset =
      layerIndex === 1
        ? -chromaticIntensity
        : layerIndex === 2
        ? chromaticIntensity
        : 0;

    const effects = [];

    if (isOutgoing) {
      // Outgoing animation: rotateX(0deg) → rotateX(-45deg), scale(1) → scale(0.7), blur(0) → blur(10px)
      effects.push({
        id: `${id}-transform-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: effectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -45, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.7, prog: 1 },
            { key: 'translateX', val: chromaticOffset, prog: 0 },
            {
              key: 'translateX',
              val: chromaticOffset * 1.5,
              prog: 0.5,
            }, // Peak chromatic
            { key: 'translateX', val: chromaticOffset, prog: 1 },
          ],
        },
      });

      // Blur effect
      effects.push({
        id: `${id}-blur-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: effectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(10px)', prog: 1 },
          ],
        },
      });

      // Staggered opacity fadeout (different for each layer)
      const opacityDelay = layerIndex * 0.1; // Stagger by layer index
      effects.push({
        id: `${id}-opacity-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: effectStart + opacityDelay,
          duration: overlapDuration - opacityDelay,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'opacity', val: opacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    } else {
      // Incoming animation: rotateX(45deg) → rotateX(0deg), scale(1.3) → scale(1.0)
      effects.push({
        id: `${id}-transform-in`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: effectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'rotateX', val: 45, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'scale', val: 1.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'translateX', val: chromaticOffset, prog: 0 },
            {
              key: 'translateX',
              val: chromaticOffset * 1.5,
              prog: 0.5,
            }, // Peak chromatic
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      });

      // Fade in opacity
      effects.push({
        id: `${id}-opacity-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: effectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: opacity, prog: 1 },
          ],
        },
      });
    }

    return {
      id,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full',
        style: {
          mixBlendMode: blendMode as any,
          opacity,
          zIndex,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration,
        },
      },
      effects,
    } as RenderableComponentData;
  };

  // Create outgoing video layers
  const outgoingLayers: RenderableComponentData[] = [
    createVideoLayer(
      'outgoing-layer-1',
      video1.src,
      10,
      'normal',
      1,
      true,
      0,
    ),
    createVideoLayer(
      'outgoing-layer-2',
      video1.src,
      11,
      'multiply',
      0.6,
      true,
      1,
    ),
    createVideoLayer(
      'outgoing-layer-3',
      video1.src,
      12,
      'screen',
      0.4,
      true,
      2,
    ),
  ];

  // Create incoming video layers
  const incomingLayers: RenderableComponentData[] = [
    createVideoLayer(
      'incoming-layer-1',
      video2.src,
      20,
      'normal',
      1,
      false,
      0,
    ),
    createVideoLayer(
      'incoming-layer-2',
      video2.src,
      21,
      'overlay',
      0.5,
      false,
      1,
    ),
    createVideoLayer(
      'incoming-layer-3',
      video2.src,
      22,
      'screen',
      0.3,
      false,
      2,
    ),
  ];

  // Create outgoing group container
  const outgoingGroup: RenderableComponentData = {
    id: 'outgoing-video-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    childrenData: outgoingLayers,
  };

  // Create incoming group container
  const incomingGroup: RenderableComponentData = {
    id: 'incoming-video-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    childrenData: incomingLayers,
  };

  // Root 3D perspective container
  const rootContainer: RenderableComponentData = {
    id: 'root-3d-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
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
    childrenData: [outgoingGroup, incomingGroup],
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
  id: 'liquid-3d-warp-transition',
  title: 'Liquid 3D Warp Transition',
  description:
    'Creates a 3D perspective warp transition that simulates videos existing in a viscous liquid 3D space. During a 2-second overlap, the outgoing video sinks into a liquid surface using perspective transforms and rotateX animations, while the incoming video rises from beneath. Features displacement-like effects using multiple stacked semi-transparent duplicates with different blend modes, chromatic aberration via RGB channel splitting, and dynamic blur effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'perspective',
    'liquid',
    'warp',
    'chromatic-aberration',
    'blur',
    'cinematic',
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
    overlapDuration: 2,
    chromaticIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquid3dWarpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
