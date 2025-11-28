/**
 * Liquid Mirror Kaleidoscope Transition
 *
 * This preset creates a mesmerizing transition effect where videos liquefy into metallic
 * mercury-like droplets that scatter and replicate in a radial pattern with reflection
 * symmetry across multiple axes. Each droplet has a convex distortion effect simulating
 * surface tension, and the incoming video coalesces from these scattered droplets converging
 * back to the center.
 *
 * Features:
 * - **Liquid Metal Effect**: Videos morph through reflective mercury-like surfaces
 * - **Radial Droplet Pattern**: 16 droplets arranged in circular formation using polar coordinates
 * - **Reflection Symmetry**: Alternating droplets use scaleX(-1) for mirror effect
 * - **Surface Tension Simulation**: Elastic scale animations with [1, 1.3, 0.8, 1.1, 0] pattern
 * - **Iridescent Color Shifts**: Hue-rotate animations from 0deg to 360deg
 * - **Scatter and Converge**: Droplets scatter outward then converge back to center
 * - **1.6-Second Transition**: Smooth overlap feeling like liquid metal reshaping
 *
 * Use cases:
 * - Creating mesmerizing video transitions
 * - Adding liquid metal effects between clips
 * - Building kaleidoscope-style transitions
 * - Creating futuristic sci-fi transitions
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
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Total duration of the transition effect in seconds'),
  dropletCount: z
    .number()
    .default(16)
    .describe('Number of droplets in the radial pattern'),
  dropletRadius: z
    .number()
    .default(200)
    .describe('Radius of the circular droplet formation in pixels'),
  dropletSize: z
    .number()
    .default(96)
    .describe('Size of each droplet in pixels (w-24 h-24 default)'),
  scatterDistance: z
    .number()
    .default(100)
    .describe('Distance droplets scatter from center in pixels'),
  metallicContrast: z
    .number()
    .default(1.2)
    .describe('Contrast value for metallic effect'),
  metallicBrightness: z
    .number()
    .default(1.1)
    .describe('Brightness value for metallic effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    dropletCount,
    dropletRadius,
    dropletSize,
    scatterDistance,
    metallicContrast,
    metallicBrightness,
  } = params;

  // Calculate timing phases
  const overlapDuration = transitionDuration;
  const scatterDuration = overlapDuration / 2; // 0.8s
  const convergeDuration = overlapDuration / 2; // 0.8s
  const dropletLayerStart = 0.2; // Slight delay before droplets appear

  // Helper function to calculate polar coordinates
  const calculatePolarPosition = (index: number, total: number) => {
    const angle = (index * 360) / total;
    const angleRad = (angle * Math.PI) / 180;
    const x = Math.cos(angleRad) * dropletRadius;
    const y = Math.sin(angleRad) * dropletRadius;
    return { x, y, angle };
  };

  // Helper function to create droplet with videos
  const createDroplet = (index: number) => {
    const { x, y, angle } = calculatePolarPosition(index, dropletCount);
    const isReflected = index % 2 === 1; // Alternating reflection
    const staggerDelay = (index % 4) * 0.05; // Stagger pattern: 0, 0.05, 0.1, 0.15

    const dropletId = `droplet-${index}`;
    const outgoingVideoId = `${dropletId}-video-out`;
    const incomingVideoId = `${dropletId}-video-in`;

    // Calculate scatter direction based on angle
    const scatterX = Math.cos((angle * Math.PI) / 180) * scatterDistance;
    const scatterY = Math.sin((angle * Math.PI) / 180) * scatterDistance;

    // Droplet container
    const droplet: RenderableComponentData = {
      id: dropletId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full overflow-hidden',
          style: {
            width: `${dropletSize}px`,
            height: `${dropletSize}px`,
            top: `calc(50% + ${y}px)`,
            left: `calc(50% + ${x}px)`,
            transform: `translate(-50%, -50%)${isReflected ? ' scaleX(-1)' : ''}`,
          },
        },
      },
      context: {
        timing: {
          start: dropletLayerStart + staggerDelay,
          duration: overlapDuration,
        },
      },
      childrenData: [
        // Outgoing video in droplet
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            className: 'absolute inset-0 w-full h-full',
            style: {
              objectFit: 'cover',
              filter: `contrast(${metallicContrast}) brightness(${metallicBrightness})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: scatterDuration,
            },
          },
        } as RenderableComponentData,
        // Incoming video in droplet
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0 w-full h-full',
            style: {
              objectFit: 'cover',
              filter: `contrast(${metallicContrast}) brightness(${metallicBrightness})`,
            },
          },
          context: {
            timing: {
              start: scatterDuration,
              duration: convergeDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Surface tension scale animation (scatter phase)
        {
          id: `${dropletId}-scale-scatter`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.25 },
              { key: 'scale', val: 0.8, prog: 0.5 },
              { key: 'scale', val: 1.1, prog: 0.75 },
              { key: 'scale', val: 0, prog: 1 },
            ],
          },
        },
        // Scatter motion (outward)
        {
          id: `${dropletId}-scatter-motion`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: scatterX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: scatterY, prog: 1 },
            ],
          },
        },
        // Converge motion (inward)
        {
          id: `${dropletId}-converge-motion`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterDuration,
            duration: convergeDuration,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'translateX', val: scatterX, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: scatterY, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    return droplet;
  };

  // Generate all droplets
  const droplets: RenderableComponentData[] = [];
  for (let i = 0; i < dropletCount; i++) {
    droplets.push(createDroplet(i));
  }

  // Droplet layer container with hue-rotate effect
  const dropletLayer: RenderableComponentData = {
    id: 'droplet-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: dropletLayerStart,
        duration: overlapDuration,
      },
    },
    childrenData: droplets,
    effects: [
      // Iridescent hue-rotate effect
      {
        id: 'droplet-layer-hue-rotate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['droplet-layer'],
          ranges: [
            { key: 'filter:hue-rotate', val: '0deg', prog: 0 },
            { key: 'filter:hue-rotate', val: '360deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Fullscreen outgoing video
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video-fullscreen',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        filter: `contrast(${metallicContrast}) brightness(${metallicBrightness})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade out during transition
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: dropletLayerStart + 0.2,
          mode: 'provider',
          targetIds: ['outgoing-video-fullscreen'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Fullscreen incoming video
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video-fullscreen',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        filter: `contrast(${metallicContrast}) brightness(${metallicBrightness})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in at the end of transition
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionDuration - 0.4,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video-fullscreen'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with radial gradient background
  const rootContainer: RenderableComponentData = {
    id: 'liquid-mirror-kaleidoscope-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background:
            'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingVideo, dropletLayer, incomingVideo],
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
  id: 'liquid-mirror-kaleidoscope-transition',
  title: 'Liquid Mirror Kaleidoscope Transition',
  description:
    'A mesmerizing transition effect where videos liquefy into metallic mercury-like droplets that scatter and replicate in a radial pattern with reflection symmetry. Features convex distortion simulating surface tension, iridescent color shifts, and convergence animations creating a liquid metal reshaping experience.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'mirror',
    'kaleidoscope',
    'metallic',
    'mercury',
    'droplet',
    'radial',
    'iridescent',
    'sci-fi',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.6,
    dropletCount: 16,
    dropletRadius: 200,
    dropletSize: 96,
    scatterDistance: 100,
    metallicContrast: 1.2,
    metallicBrightness: 1.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMirrorKaleidoscopeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
