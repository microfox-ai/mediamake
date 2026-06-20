/**
 * Lens Flare Glass Sweep Transition Preset
 *
 * This preset creates a cinematic lens flare transition where a bright refractive sweep moves across
 * the frame, heavily distorting and blurring both videos at the sweep point while revealing the new content.
 *
 * Features:
 * - **Primary Bright Band**: Extreme blur (3px) with spectrum gradient, screen blend mode
 * - **Multiple Flare Elements**: 5 optical artifacts (circular/hexagonal) at various positions
 * - **Anamorphic Characteristics**: Horizontal stretch (scaleX: 2) on all flare elements
 * - **Dynamic Video Effects**: Outgoing video blurs (0-30px) and desaturates (100%-20%) as sweep passes
 * - **Incoming Video Reveal**: Clip-path follows sweep, blur reduces (25px-0px), saturation increases (0%-100%)
 * - **Lens Dirt Overlay**: Subtle texture (10% opacity) reveals during bright sweep
 * - **Smooth Animation**: 1.9s overlap with ease-in-out timing
 *
 * Technical Implementation:
 * - BaseLayout container with 1.9s overlap duration
 * - Sweep container: absolute positioned div, width 300px
 * - Animation: translateX from -300px to calc(100% + 300px)
 * - Outgoing video: dynamic blur/saturation based on sweep progress
 * - Incoming video: clip-path reveals content, blur/saturation animate in
 * - All effects use provider mode with targetIds for proper rendering
 *
 * Use Cases:
 * - Professional video transitions with optical realism
 * - Cinematic content reveals
 * - High-impact scene changes
 * - Music video transitions
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
    duration: z.number().describe('Duration of first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.9)
    .describe('Duration of the transition overlap in seconds'),
  lensDirtTexture: z
    .string()
    .optional()
    .describe('Optional lens dirt overlay texture image URL'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, lensDirtTexture } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const sweepStartTime = video1.duration - overlapDuration;

  // Generate unique IDs
  const outgoingVideoId = 'outgoing-video';
  const incomingVideoId = 'incoming-video';
  const sweepContainerId = 'sweep-container';
  const lensDirtOverlayId = 'lens-dirt-overlay';

  // Outgoing video: blur and desaturate as sweep passes
  const outgoingVideoEffects: any[] = [
    {
      id: 'outgoing-blur-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: sweepStartTime,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [outgoingVideoId],
        ranges: [
          { key: 'filter', val: 'blur(0px) saturate(100%)', prog: 0 },
          {
            key: 'filter',
            val: 'blur(30px) saturate(20%)',
            prog: 1,
          },
        ],
      },
    },
  ];

  // Incoming video: reveal with clip-path, reduce blur, increase saturation
  const incomingVideoEffects: any[] = [
    {
      id: 'incoming-reveal-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0, // Relative to incoming video start
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [incomingVideoId],
        ranges: [
          {
            key: 'clipPath',
            val: 'inset(0 100% 0 0)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'inset(0 0% 0 0)',
            prog: 1,
          },
          {
            key: 'filter',
            val: 'blur(25px) saturate(0%)',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'blur(0px) saturate(100%)',
            prog: 1,
          },
        ],
      },
    },
  ];

  // Sweep container animation: translateX from left to right
  const sweepEffects: any[] = [
    {
      id: 'sweep-animation',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: sweepStartTime,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [sweepContainerId],
        ranges: [
          {
            key: 'translateX',
            val: '-300px',
            prog: 0,
          },
          {
            key: 'translateX',
            val: 'calc(100vw + 300px)',
            prog: 1,
          },
        ],
      },
    },
  ];

  // Lens dirt overlay: fade in during sweep center, fade out
  const lensDirtEffects: any[] = lensDirtTexture
    ? [
        {
          id: 'lens-dirt-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: sweepStartTime,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [lensDirtOverlayId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ]
    : [];

  // Flare element animations: fade in/out during sweep
  const flareElementIds = [
    'flare-element-1',
    'flare-element-2',
    'flare-element-3',
    'flare-element-4',
    'flare-element-5',
  ];

  const flareEffects = flareElementIds.map((flareId, index) => {
    const delay = (index * 0.1) / overlapDuration; // Stagger slightly
    return {
      id: `${flareId}-fade`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: sweepStartTime,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [flareId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: [0.7, 0.5, 0.6, 0.4, 0.5][index], prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  });

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: outgoingVideoEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: sweepStartTime,
          duration: video2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
          effects: incomingVideoEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Sweep container with flare elements
    {
      id: sweepContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: 0,
            left: 0,
            width: '300px',
            height: '100%',
            zIndex: 10,
            pointerEvents: 'none',
            transform: 'translateX(-300px)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: sweepEffects.concat(flareEffects),
      childrenData: [
        // Main flare band
        {
          id: 'main-flare-band',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 10%, rgba(255,200,100,0.3) 20%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 55%, rgba(100,200,255,0.3) 80%, rgba(255,255,255,0.1) 90%, transparent 100%)',
              filter: 'blur(3px)',
              mixBlendMode: 'screen',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,

        // Flare element 1: Orange circular flare
        {
          id: 'flare-element-1',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              top: '20%',
              left: '-80px',
              width: '60px',
              height: '60px',
              background:
                'radial-gradient(circle, rgba(255,100,50,0.8) 0%, rgba(255,100,50,0) 70%)',
              transform: 'scaleX(2)',
              mixBlendMode: 'screen',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,

        // Flare element 2: Blue hexagonal flare
        {
          id: 'flare-element-2',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              top: '40%',
              left: '-120px',
              width: '40px',
              height: '40px',
              background:
                'conic-gradient(from 0deg, rgba(50,200,255,0.6) 0deg, transparent 60deg, rgba(50,200,255,0.6) 60deg, transparent 120deg, rgba(50,200,255,0.6) 120deg, transparent 180deg, rgba(50,200,255,0.6) 180deg, transparent 240deg, rgba(50,200,255,0.6) 240deg, transparent 300deg, rgba(50,200,255,0.6) 300deg, transparent 360deg)',
              transform: 'scaleX(2)',
              mixBlendMode: 'screen',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,

        // Flare element 3: Pink circular flare
        {
          id: 'flare-element-3',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              top: '60%',
              left: '320px',
              width: '80px',
              height: '80px',
              background:
                'radial-gradient(circle, rgba(255,50,150,0.7) 0%, rgba(255,50,150,0) 70%)',
              transform: 'scaleX(2)',
              mixBlendMode: 'screen',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,

        // Flare element 4: Green hexagonal flare
        {
          id: 'flare-element-4',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              top: '30%',
              left: '380px',
              width: '30px',
              height: '30px',
              background:
                'conic-gradient(from 30deg, rgba(100,255,100,0.5) 0deg, transparent 60deg, rgba(100,255,100,0.5) 60deg, transparent 120deg, rgba(100,255,100,0.5) 120deg, transparent 180deg, rgba(100,255,100,0.5) 180deg, transparent 240deg, rgba(100,255,100,0.5) 240deg, transparent 300deg, rgba(100,255,100,0.5) 300deg, transparent 360deg)',
              transform: 'scaleX(2)',
              mixBlendMode: 'screen',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,

        // Flare element 5: Yellow circular flare
        {
          id: 'flare-element-5',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            style: {
              position: 'absolute',
              top: '75%',
              left: '-60px',
              width: '50px',
              height: '50px',
              background:
                'radial-gradient(circle, rgba(255,255,100,0.6) 0%, rgba(255,255,100,0) 70%)',
              transform: 'scaleX(2)',
              mixBlendMode: 'screen',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // Lens dirt overlay (optional)
    ...(lensDirtTexture
      ? [
          {
            id: lensDirtOverlayId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: lensDirtTexture,
              className: 'w-full h-full object-cover',
              style: {
                position: 'absolute',
                inset: 0,
                mixBlendMode: 'screen',
                opacity: 0,
                zIndex: 15,
                pointerEvents: 'none',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: lensDirtEffects,
          } as RenderableComponentData,
        ]
      : []),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'lens-flare-glass-sweep-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'lens-flare-glass-sweep-transition',
  title: 'Lens Flare Glass Sweep Transition',
  description:
    'A cinematic lens flare transition featuring a bright refractive sweep moving across the frame. The sweep includes a primary bright band with blur, secondary rainbow refractions, and hexagonal lens flare artifacts with anamorphic horizontal stretch. The outgoing video becomes increasingly blurred and desaturated as the sweep passes, while the incoming video emerges sharp and vibrant. Includes optional lens dirt overlay that reveals during peak brightness.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lens-flare',
    'cinematic',
    'video',
    'optical',
    'anamorphic',
    'refraction',
    'sweep',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 1.9,
    lensDirtTexture: 'https://example.com/lens-dirt.png',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lensFlareGlassSweepTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
