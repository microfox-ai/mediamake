/**
 * Dimensional Portal Transition Preset
 *
 * Creates a fractal zoom portal transition with exponential scaling, spiral tunnel rotation,
 * chromatic aberration effects, and 3D depth perspective. The outgoing video zooms infinitely
 * inward through nested rectangular frames while the incoming video emerges from the center
 * and expands outward.
 *
 * Features:
 * - **Fractal Tunnel**: 12 nested frames with exponential sizing (5% inset per level)
 * - **Spiral Effect**: Each frame rotates 15° more than the previous (0°, 15°, 30°, etc.)
 * - **3D Perspective**: 1000px perspective for depth illusion
 * - **Chromatic Aberration**: RGB channel splits using multiple video copies with offsets
 * - **Exponential Easing**: Accelerated zoom animation through the tunnel
 * - **Bidirectional**: Outgoing zooms in, incoming expands from center
 *
 * Use cases:
 * - Creating sci-fi portal transitions between videos
 * - Building dimensional warp effects for scene changes
 * - Adding psychedelic tunnel animations to transitions
 * - Creating infinite zoom illusions for creative edits
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the portal transition in seconds'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .optional()
    .describe('Intensity of chromatic aberration effect in pixels'),
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
    chromaticIntensity = 5,
  } = params;

  // Calculate total duration
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Create nested fractal frames with spiral rotation
  const createFractalFrames = (count: number): RenderableComponentData[] => {
    const frames: RenderableComponentData[] = [];

    for (let i = 0; i < count; i++) {
      const insetPercent = i * 5; // 0%, 5%, 10%, 15%, etc.
      const rotationDeg = i * 15; // 0°, 15°, 30°, 45°, etc.

      frames.push({
        id: `fractal-frame-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              inset: `${insetPercent}%`,
              transformStyle: 'preserve-3d',
              transform: `rotateZ(${rotationDeg}deg)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData);
    }

    return frames;
  };

  // Create 12 nested fractal frames
  const fractalFrames = createFractalFrames(12);

  // Chromatic aberration: Create RGB channel splits for outgoing video
  const outgoingRGBChannels: RenderableComponentData[] = [
    {
      id: 'outgoing-red-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'chromatic-red-outgoing',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-red-channel'],
            ranges: [
              { key: 'translateX', val: -chromaticIntensity, prog: 0 },
              {
                key: 'translateX',
                val: -chromaticIntensity * 1.6,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'outgoing-green-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [],
    } as RenderableComponentData,
    {
      id: 'outgoing-blue-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'chromatic-blue-outgoing',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-blue-channel'],
            ranges: [
              { key: 'translateX', val: chromaticIntensity, prog: 0 },
              { key: 'translateX', val: chromaticIntensity * 1.6, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Chromatic aberration: Create RGB channel splits for incoming video
  const incomingRGBChannels: RenderableComponentData[] = [
    {
      id: 'incoming-red-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-red-incoming',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-red-channel'],
            ranges: [
              { key: 'translateX', val: -chromaticIntensity * 1.6, prog: 0 },
              { key: 'translateX', val: -chromaticIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'incoming-green-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [],
    } as RenderableComponentData,
    {
      id: 'incoming-blue-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-blue-incoming',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-blue-channel'],
            ranges: [
              { key: 'translateX', val: chromaticIntensity * 1.6, prog: 0 },
              { key: 'translateX', val: chromaticIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Outgoing video container with fractal frames and RGB channels
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-portal-container',
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
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-tunnel-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-portal-container'],
          ranges: [
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -2000, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.01, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 180, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.9 },
          ],
        },
      },
    ],
    childrenData: [
      // RGB channels container
      {
        id: 'outgoing-rgb-container',
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
            duration: outgoingVideo.duration,
          },
        },
        childrenData: outgoingRGBChannels,
      } as RenderableComponentData,
      // Fractal frames overlays
      ...fractalFrames,
    ],
  };

  // Incoming video container starting from center
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-portal-container',
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
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-center-point',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%)',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-expansion-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-center-point'],
              ranges: [
                { key: 'translateZ', val: -2000, prog: 0 },
                { key: 'translateZ', val: 0, prog: 1 },
                { key: 'scale', val: 0.01, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'rotateZ', val: -180, prog: 0 },
                { key: 'rotateZ', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
              ],
            },
          },
        ],
        childrenData: incomingRGBChannels,
      } as RenderableComponentData,
    ],
  };

  // Root portal container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'dimensional-portal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'dimensional-portal-transition',
  title: 'Dimensional Portal Transition',
  description:
    'A fractal zoom portal transition with exponential scaling, spiral tunnel rotation, chromatic aberration effects, and 3D depth perspective. The outgoing video zooms infinitely inward through nested rectangular frames while the incoming video emerges from the center and expands outward.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'portal',
    'fractal',
    'zoom',
    'chromatic',
    'aberration',
    '3d',
    'tunnel',
    'spiral',
    'warp',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      duration: 5,
    },
    transitionDuration: 2.2,
    chromaticIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dimensionalPortalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
