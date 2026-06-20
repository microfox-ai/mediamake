/**
 * Depth Blur Cascade Transition Preset
 *
 * A cinematic z-depth transition effect where videos transition through layered glass panels with progressive blur.
 * The outgoing video blurs heavily while scaling up (1.1x) and fading out in a 'falling away' effect.
 * The incoming video emerges from extreme blur (20px) and scale-down (0.85x) in the background, coming into sharp focus.
 * During the 1.8-second overlap, 2-3 semi-transparent intermediate layers at different blur levels (5px, 10px, 15px)
 * with slight position offsets create a convincing depth-of-field illusion.
 *
 * Features:
 * - Depth-of-field layering with progressive blur
 * - Outgoing video: blur 0→20px, scale 1→1.1, opacity 1→0
 * - Incoming video: blur 20→0px, scale 0.85→1
 * - Intermediate glass panel layers with fixed blur and opacity
 * - Smooth ease-in-out timing for natural focus pulls
 * - 1.8-second overlap period for transition
 *
 * Use cases:
 * - Cinematic video transitions with depth perception
 * - Creating focus shift effects between scenes
 * - Professional multi-layer transitions
 * - Glass panel aesthetic transitions
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
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of transition overlap in seconds (glass panel effect period)'),
  depthLayers: z
    .number()
    .min(2)
    .max(4)
    .default(3)
    .describe('Number of intermediate depth layers (2-4, default 3)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, depthLayers } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate timing for outgoing video effect (starts before video1 ends)
  const outgoingEffectStart = video1.duration - transitionDuration;

  // Calculate timing for incoming video (starts before video1 ends to create overlap)
  const incomingVideoStart = video1.duration - transitionDuration;

  // Helper function to generate depth layer configurations
  const generateDepthLayers = (layerCount: number): Array<{
    id: string;
    blur: number;
    opacity: number;
    offsetClass: string;
    zIndex: number;
  }> => {
    const layers = [];
    const blurStep = 15 / layerCount; // Distribute blur from 5px to 15px
    const opacityStep = 0.2 / layerCount; // Distribute opacity from 0.4 to 0.2

    for (let i = 0; i < layerCount; i++) {
      const blur = 5 + blurStep * i;
      const opacity = 0.4 - opacityStep * i;
      const offsets = ['top-[5%]', 'left-[5%]', 'top-[-5%]', 'left-[-5%]'];
      const offsetClass = offsets[i % offsets.length];
      const zIndex = 30 - (i + 1) * 5; // Z-index: 25, 20, 15, 10

      layers.push({
        id: `depth-layer-${i + 1}`,
        blur: Math.round(blur),
        opacity: Math.round(opacity * 10) / 10,
        offsetClass,
        zIndex,
      });
    }

    return layers;
  };

  const depthLayerConfigs = generateDepthLayers(depthLayers);

  // Create depth layer components
  const depthLayerComponents = depthLayerConfigs.map((layer) => {
    const fadeInProg = 0.3 + (layer.zIndex / 30) * 0.1; // Stagger fade-in
    const fadeOutProg = 0.7 - (layer.zIndex / 30) * 0.1; // Stagger fade-out

    return {
      id: layer.id,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: `absolute inset-0 ${layer.offsetClass} will-change-transform`,
        fit: 'cover' as const,
        style: {
          filter: `blur(${layer.blur}px)`,
          transformOrigin: 'center center',
          zIndex: layer.zIndex,
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${layer.id}-timing-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: [layer.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: layer.opacity, prog: fadeInProg },
              { key: 'opacity', val: layer.opacity, prog: fadeOutProg },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing video component
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 will-change-transform',
      fit: 'cover' as const,
      style: {
        transformOrigin: 'center center',
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-blur-scale-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 20, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video component
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 will-change-transform',
      fit: 'cover' as const,
      style: {
        filter: 'blur(20px)',
        transform: 'scale(0.85)',
        transformOrigin: 'center center',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'incoming-blur-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'blur', val: 20, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'depth-blur-cascade-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      incomingVideo,
      ...depthLayerComponents,
      outgoingVideo,
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
  id: 'depth-blur-cascade-transition',
  title: 'Depth Blur Cascade Transition',
  description:
    'A cinematic z-depth transition effect where videos transition through layered glass panels with progressive blur. The outgoing video blurs heavily while scaling up (1.1x) and fading out in a \'falling away\' effect. The incoming video emerges from extreme blur (20px) and scale-down (0.85x) in the background, coming into sharp focus. During the 1.8-second overlap, 2-3 semi-transparent intermediate layers at different blur levels (5px, 10px, 15px) with slight position offsets create a convincing depth-of-field illusion. Uses smooth ease-in-out timing for natural focus pulls.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'depth',
    'blur',
    'cascade',
    'cinematic',
    'glass',
    'focus',
    'z-depth',
    'layers',
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
    transitionDuration: 1.8,
    depthLayers: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const depthBlurCascadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
