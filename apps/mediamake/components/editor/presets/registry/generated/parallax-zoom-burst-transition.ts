/**
 * Parallax Zoom Burst Transition Preset
 *
 * Creates a dramatic transition effect where videos explode into multiple depth layers
 * that zoom past the camera at different speeds. The outgoing video splits into 5 concentric
 * layers (tunnel effect) that scale up dramatically while fading out and rotating, as incoming
 * video layers zoom in from a tiny point. Each layer has different zoom speeds and rotation for
 * a dynamic spiral effect, with motion blur and chromatic aberration on the fastest-moving layers.
 *
 * Features:
 * - **5-Layer Tunnel Effect**: Concentric rings create depth illusion
 * - **Variable Zoom Speeds**: Each layer zooms at different rates (5x to 20x for outgoing, reverse for incoming)
 * - **Spiral Rotation**: Layers rotate at different speeds (90° to 450°) for kinetic effect
 * - **Motion Blur**: Blur increases with zoom speed (0-12px)
 * - **Chromatic Aberration**: RGB split on fastest layers for glitch aesthetic
 * - **Radial Masks**: Circular clipping creates tunnel/ring appearance
 * - **Synchronized Timing**: 1-second overlap transition between videos
 *
 * Use cases:
 * - High-energy video transitions
 * - Music video effects
 * - Action sequences
 * - Dramatic scene changes
 * - Sci-fi/futuristic content
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to determine media component ID
  const getMediaComponentId = (src: string): string => {
    return src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i) ? 'VideoAtom' : 'ImageAtom';
  };

  const video1ComponentId = getMediaComponentId(video1.src);
  const video2ComponentId = getMediaComponentId(video2.src);

  // =====================
  // OUTGOING VIDEO LAYERS
  // =====================

  // Layer 1 (Innermost): Scale 1 → 5, Rotate 90°, Fade out
  const outgoingLayer1: RenderableComponentData = {
    id: 'outgoing-layer-1-inner',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(20% at center)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-layer-1-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['outgoing-layer-1-inner'],
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 5, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 90, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video-1-inner',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 2: Scale 1 → 8, Rotate 180°, Blur 0 → 3px
  const outgoingLayer2: RenderableComponentData = {
    id: 'outgoing-layer-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(40% at center)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-layer-2-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['outgoing-layer-2'],
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 8, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.85 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 180, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 3, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video-2',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 3: Scale 1 → 12, Rotate 270°, Blur 0 → 5px
  const outgoingLayer3: RenderableComponentData = {
    id: 'outgoing-layer-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(60% at center)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-layer-3-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['outgoing-layer-3'],
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 12, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.9 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 270, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 5, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video-3',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 4: Scale 1 → 16, Rotate 360°, Blur 0 → 8px
  const outgoingLayer4: RenderableComponentData = {
    id: 'outgoing-layer-4',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(80% at center)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-layer-4-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['outgoing-layer-4'],
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 16, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.92 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 360, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 8, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video-4',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 5 (Outermost): Scale 1 → 20, Rotate 450°, Blur 0 → 12px, Chromatic Aberration
  const outgoingLayer5: RenderableComponentData = {
    id: 'outgoing-layer-5-outer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-layer-5-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['outgoing-layer-5-outer'],
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 20, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.95 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 450, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 12, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video-5-outer',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Chromatic aberration red channel
      {
        id: 'outgoing-chromatic-red',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter: 'sepia(1) hue-rotate(-50deg) saturate(3)',
            transform: 'translate(3px, 3px)',
            opacity: 0.6,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Chromatic aberration cyan channel
      {
        id: 'outgoing-chromatic-cyan',
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter: 'sepia(1) hue-rotate(150deg) saturate(3)',
            transform: 'translate(-3px, -3px)',
            opacity: 0.6,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Outgoing tunnel container
  const outgoingTunnelContainer: RenderableComponentData = {
    id: 'outgoing-tunnel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingLayer5,
      outgoingLayer4,
      outgoingLayer3,
      outgoingLayer2,
      outgoingLayer1,
    ],
  };

  // =====================
  // INCOMING VIDEO LAYERS
  // =====================

  // Layer 1 (Innermost): Scale 0.2 → 1, Rotate -90° → 0°
  const incomingLayer1: RenderableComponentData = {
    id: 'incoming-layer-1-inner',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(20% at center)',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-layer-1-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-layer-1-inner'],
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 0.2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.05 },
            { key: 'rotateZ', val: -90, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video-1-inner',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 2: Scale 0.125 → 1, Rotate -180° → 0°, Blur 3px → 0
  const incomingLayer2: RenderableComponentData = {
    id: 'incoming-layer-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(40% at center)',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-layer-2-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-layer-2'],
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 0.125, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.08 },
            { key: 'rotateZ', val: -180, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'blur', val: 3, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video-2',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 3: Scale 0.0833 → 1, Rotate -270° → 0°, Blur 5px → 0
  const incomingLayer3: RenderableComponentData = {
    id: 'incoming-layer-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(60% at center)',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-layer-3-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-layer-3'],
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 0.0833, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'rotateZ', val: -270, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'blur', val: 5, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video-3',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 4: Scale 0.0625 → 1, Rotate -360° → 0°, Blur 8px → 0
  const incomingLayer4: RenderableComponentData = {
    id: 'incoming-layer-4',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(80% at center)',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-layer-4-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-layer-4'],
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 0.0625, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'rotateZ', val: -360, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'blur', val: 8, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video-4',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Layer 5 (Outermost): Scale 0.05 → 1, Rotate -450° → 0°, Blur 12px → 0, Chromatic Aberration
  const incomingLayer5: RenderableComponentData = {
    id: 'incoming-layer-5-outer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-layer-5-zoom',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-layer-5-outer'],
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          ranges: [
            { key: 'scale', val: 0.05, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'rotateZ', val: -450, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'blur', val: 12, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video-5-outer',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Chromatic aberration red channel
      {
        id: 'incoming-chromatic-red',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter: 'sepia(1) hue-rotate(-50deg) saturate(3)',
            transform: 'translate(3px, 3px)',
            opacity: 0.6,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Chromatic aberration cyan channel
      {
        id: 'incoming-chromatic-cyan',
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter: 'sepia(1) hue-rotate(150deg) saturate(3)',
            transform: 'translate(-3px, -3px)',
            opacity: 0.6,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming tunnel container
  const incomingTunnelContainer: RenderableComponentData = {
    id: 'incoming-tunnel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [
      incomingLayer5,
      incomingLayer4,
      incomingLayer3,
      incomingLayer2,
      incomingLayer1,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-zoom-burst-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingTunnelContainer, incomingTunnelContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'parallax-zoom-burst-transition',
  title: 'Parallax Zoom Burst Transition',
  description:
    'Dramatic transition effect where videos explode into multiple depth layers that zoom past the camera at different speeds with rotation, motion blur, and chromatic aberration',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'parallax', 'zoom', 'burst', 'tunnel', 'chromatic', 'rotation', 'kinetic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxZoomBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
