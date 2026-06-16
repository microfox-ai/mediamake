/**
 * 3D Tunnel Zoom Transition Preset
 *
 * A sci-fi 3D tunnel transition where the outgoing video recedes into a vanishing point
 * while the incoming video emerges from the depth. Features multiple tunnel layers with
 * vortex rotation, chromatic aberration, and ripple timing effects for a portal-like aesthetic.
 *
 * Features:
 * - **3D Perspective Tunnel**: Multiple concentric circular layers creating depth illusion
 * - **Vortex Rotation**: Tunnel walls rotate with staggered timing for ripple effect
 * - **Chromatic Aberration**: RGB channel splitting at transition peak for sci-fi feel
 * - **Deep Z-Space Animation**: Outgoing video recedes to -1000px, incoming emerges from +1000px
 * - **Smooth Transitions**: 2.5s total with 1s overlap period
 * - **Radial Gradient Background**: Dark space-like backdrop enhancing depth
 *
 * Use cases:
 * - Sci-fi video transitions with portal effects
 * - Dynamic scene changes with dimensional depth
 * - Music video transitions with vortex aesthetics
 * - Futuristic presentation slides
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Total transition duration in seconds'),
  overlapDuration: z
    .number()
    .default(1.0)
    .describe('Overlap period duration in seconds'),
  tunnelLayers: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of tunnel frame layers'),
  vortexIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Rotation intensity multiplier for vortex effect'),
  chromaticAberration: z
    .boolean()
    .default(true)
    .describe('Enable chromatic aberration effect at transition peak'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    overlapDuration,
    tunnelLayers,
    vortexIntensity,
    chromaticAberration,
  } = params;

  // Calculate timing
  const outgoingStart = 0;
  const outgoingDuration = outgoingVideo.duration;
  const incomingStart = outgoingDuration - overlapDuration;
  const incomingDuration = incomingVideo.duration;
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Transition timing within overlap
  const transitionStart = outgoingDuration - overlapDuration;
  const transitionMidpoint = transitionStart + overlapDuration / 2;

  // Component IDs
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate tunnel layer colors (gradient from blue to pink/purple)
  const getTunnelLayerColor = (index: number) => {
    const colors = [
      'rgba(100, 150, 255, 0.3)',
      'rgba(150, 100, 255, 0.25)',
      'rgba(200, 100, 255, 0.2)',
      'rgba(255, 100, 200, 0.15)',
      'rgba(100, 200, 255, 0.12)',
      'rgba(150, 150, 255, 0.1)',
    ];
    return colors[index % colors.length];
  };

  // Create tunnel layers with staggered rotation
  const tunnelLayerComponents: RenderableComponentData[] = [];
  for (let i = 0; i < tunnelLayers; i++) {
    const layerMargin = `${i * 5}%`;
    const rotationDelay = (i * transitionDuration) / (tunnelLayers * 2); // Stagger
    const rotationAmount = 360 * vortexIntensity;

    tunnelLayerComponents.push({
      id: `tunnel-layer-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            border: `4px solid ${getTunnelLayerColor(i)}`,
            borderRadius: '50%',
            transformStyle: 'preserve-3d',
            margin: layerMargin,
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
        {
          id: `tunnel-layer-rotate-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart + rotationDelay,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [`tunnel-layer-${i}`],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationAmount, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video (recedes into tunnel)
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-recede-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'translateZ', val: '0px', prog: 0 },
            { key: 'translateZ', val: '-1000px', prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
          ],
        },
      },
    ],
  };

  // Incoming video (emerges from vanishing point)
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      {
        id: 'incoming-emerge-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'translateZ', val: '1000px', prog: 0 },
            { key: 'translateZ', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
          ],
        },
      },
    ],
  };

  // Chromatic aberration overlay (peaks at midpoint)
  const chromaticAberrationComponent: RenderableComponentData | null = chromaticAberration
    ? ({
        id: 'chromatic-aberration-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              mixBlendMode: 'screen',
              background:
                'radial-gradient(circle, rgba(255,0,0,0.3) 0%, rgba(0,255,0,0.2) 50%, rgba(0,0,255,0.3) 100%)',
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
          {
            id: 'chromatic-flash-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionMidpoint - overlapDuration / 4,
              duration: overlapDuration / 2,
              mode: 'provider',
              targetIds: ['chromatic-aberration-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData)
    : null;

  // Assemble children (tunnel layers container, videos, chromatic overlay)
  const tunnelLayersContainer: RenderableComponentData = {
    id: 'tunnel-layers-container',
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
        duration: totalDuration,
      },
    },
    childrenData: tunnelLayerComponents,
  };

  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoComponent],
  };

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingVideoComponent],
  };

  const childrenData: RenderableComponentData[] = [
    tunnelLayersContainer,
    outgoingVideoContainer,
    incomingVideoContainer,
  ];

  if (chromaticAberrationComponent) {
    childrenData.push(chromaticAberrationComponent);
  }

  // Root container with perspective and radial gradient
  const rootContainer: RenderableComponentData = {
    id: '3d-tunnel-zoom-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '600px',
          background: 'radial-gradient(circle, rgba(10,10,30,1) 0%, rgba(0,0,0,1) 100%)',
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
    childrenData,
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
  id: '3d-tunnel-zoom-transition',
  title: '3D Tunnel Zoom Transition',
  description:
    'A sci-fi 3D tunnel transition where outgoing video recedes into a vanishing point while incoming video emerges. Features multiple tunnel layers with vortex rotation, chromatic aberration, and ripple timing effects for a portal-like aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'tunnel', 'zoom', 'sci-fi', 'portal', 'vortex', 'chromatic-aberration'],
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
    transitionDuration: 2.5,
    overlapDuration: 1.0,
    tunnelLayers: 4,
    vortexIntensity: 1,
    chromaticAberration: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const threeDTunnelZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
