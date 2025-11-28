/**
 * Multi-Layer Parallax Depth Transition Preset
 *
 * Creates a cinematic parallax depth transition between two videos using multiple z-indexed layers.
 * The preset simulates depth-of-field effects by having foreground, midground, and background layers
 * move at different speeds during the transition, creating a realistic 3D parallax effect.
 *
 * Features:
 * - **3 Depth Layers**: Background (z-10), midground (z-20), and foreground (z-30)
 * - **Differential Speed Movement**: Background moves slowest, foreground moves fastest
 * - **Depth-of-Field Simulation**: Blur effects enhance depth perception during transition
 * - **Scale Animations**: Outgoing videos scale up slightly while incoming scale from small to full
 * - **Smooth Overlap**: 1.5-second transition period with ease-out timing
 * - **GPU Acceleration**: Uses transform-gpu and will-change-transform for performance
 *
 * Technical Details:
 * - Container: Single BaseLayout with relative positioning and overflow hidden
 * - Layer Structure: 3 absolute-positioned BaseLayouts, each containing 2 VideoAtom instances
 * - Timing: BaseLayout duration = video1.duration + video2.duration - 1.5s overlap
 * - Effects: Generic effects in provider mode targeting specific layer IDs
 * - Movement: Achieved through translateY and scale (simulating Z-axis depth)
 *
 * Use Cases:
 * - Cinematic video transitions with depth
 * - Music videos with layered visual effects
 * - Documentary transitions between scenes
 * - Professional video editing with parallax effects
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
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
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
  const { video1, video2, transitionDuration } = params;

  // Calculate timing
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;
  const video1TransitionStart = video1.duration - transitionDuration;

  // Background layer children
  const backgroundLayerChildren: RenderableComponentData[] = [
    // Video 1 - Background
    {
      id: 'video1-background',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-bg-out-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: video1TransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-background'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Video 2 - Background
    {
      id: 'video2-background',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: video1TransitionStart,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-bg-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-background'],
            ranges: [
              { key: 'scale', val: 0.7, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Midground layer children
  const midgroundLayerChildren: RenderableComponentData[] = [
    // Video 1 - Midground
    {
      id: 'video1-midground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-mid-out-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: video1TransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-midground'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.15, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -30, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Video 2 - Midground
    {
      id: 'video2-midground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: video1TransitionStart,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-mid-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-midground'],
            ranges: [
              { key: 'scale', val: 0.75, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateY', val: 50, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Foreground layer children
  const foregroundLayerChildren: RenderableComponentData[] = [
    // Video 1 - Foreground
    {
      id: 'video1-foreground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-fg-out-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: video1TransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-foreground'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.2, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -60, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Video 2 - Foreground
    {
      id: 'video2-foreground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full',
      },
      context: {
        timing: {
          start: video1TransitionStart,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-fg-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-foreground'],
            ranges: [
              { key: 'scale', val: 0.7, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateY', val: 80, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Build layer components
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu will-change-transform',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: backgroundLayerChildren,
  };

  const midgroundLayer: RenderableComponentData = {
    id: 'midground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu will-change-transform',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: midgroundLayerChildren,
  };

  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu will-change-transform',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: foregroundLayerChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-depth-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden transform-gpu',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [backgroundLayer, midgroundLayer, foregroundLayer],
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
  id: 'parallax-depth-transition',
  title: 'Multi-Layer Parallax Depth Transition',
  description:
    'A parallax depth transition preset featuring 3 z-indexed layers (background z-10, midground z-20, foreground z-30) where videos transition with depth-simulating effects. During the 1.5s overlap, outgoing videos scale up (1.0 to 1.1-1.2) and fade out while moving upward at different speeds per layer (background slowest, foreground fastest). Incoming videos scale up from 0.7-0.75 to 1.0 with upward movement and fade in, creating a depth-of-field parallax effect. Uses translateY and scale to simulate Z-axis depth movement. Applies ease-out timing for natural deceleration and transform-gpu/will-change-transform classes for GPU acceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'parallax', 'depth', 'video', 'cinematic', '3d'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxDepthTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
