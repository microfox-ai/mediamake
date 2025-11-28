/**
 * Lens Flare Iris Transition Preset
 *
 * This preset creates a cinematic lens flare iris transition that mimics a camera iris opening
 * with light artifacts. The effect features multiple concentric flare rings that expand from
 * the center, chromatic aberration on edges, and horizontal anamorphic streaks.
 *
 * Features:
 * - **Circular Iris Reveal**: Outgoing media irises out while incoming media irises in
 * - **Concentric Flare Rings**: 3-4 layered circular flares with different colors and blend modes
 * - **Chromatic Aberration**: RGB channel splits on circle edges using box shadows
 * - **Anamorphic Streaks**: Horizontal light streaks that flash during transition peak
 * - **Screen Blend Mode**: All flares use screen blending for authentic light artifacts
 * - **Smooth Animations**: Eased scale and opacity transitions for organic feel
 *
 * Use cases:
 * - Cinematic scene transitions with optical effects
 * - Camera-inspired media reveals
 * - High-energy video transitions with light artifacts
 * - Stylized content transitions with lens flare aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  incomingMedia: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.9)
    .describe('Duration of transition overlap in seconds'),
  flareIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for flare effects'),
  streakIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for anamorphic streaks'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    transitionDuration,
    flareIntensity = 1,
    streakIntensity = 1,
  } = params;

  // Calculate base layout duration
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs for media
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Transition timing
  const transitionStart = outgoingMedia.duration - transitionDuration;
  const transitionPeak = transitionStart + transitionDuration / 2;

  // Flare colors with chromatic aberration
  const flareColors = [
    { color: 'rgba(96, 165, 250, 0.3)', blur: 40, delay: 0 }, // Blue
    { color: 'rgba(192, 132, 252, 0.25)', blur: 30, delay: 0.1 }, // Purple
    { color: 'rgba(252, 211, 77, 0.4)', blur: 50, delay: 0.2 }, // Yellow
    { color: 'rgba(147, 197, 253, 0.3)', blur: 20, delay: 0.15 }, // Light blue
  ];

  // Build flare ring components
  const flareRings = flareColors.map((flare, index) => {
    const flareId = `flare-ring-${index}`;
    const adjustedOpacity = flare.color.match(/[\d.]+\)$/)?.[0]
      ? parseFloat(flare.color.match(/[\d.]+\)$/)?.[0].replace(')', '')) *
        flareIntensity
      : 0.3 * flareIntensity;

    return {
      id: flareId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute rounded-full',
        style: {
          top: '50%',
          left: '50%',
          width: '80%',
          height: '80%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: flare.color.replace(/[\d.]+\)$/, '1)'),
          opacity: 0,
          filter: `blur(${flare.blur}px)`,
          boxShadow: `0 0 ${flare.blur * 2}px ${flare.blur}px ${flare.color}, inset 0 0 ${flare.blur * 1.5}px ${flare.blur / 2}px ${flare.color}`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: `${flareId}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionStart + flare.delay,
            duration: transitionDuration - flare.delay,
            mode: 'provider',
            targetIds: [flareId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: adjustedOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Build anamorphic streaks
  const streaks = [
    {
      id: 'streak-1',
      height: '2px',
      color: 'rgba(147, 197, 253, 0.6)',
      offset: 0,
      delay: 0,
    },
    {
      id: 'streak-2',
      height: '1px',
      color: 'rgba(192, 132, 252, 0.5)',
      offset: -10,
      delay: 0.05,
    },
    {
      id: 'streak-3',
      height: '1px',
      color: 'rgba(96, 165, 250, 0.4)',
      offset: 10,
      delay: 0.1,
    },
  ];

  const streakComponents = streaks.map((streak) => {
    const adjustedOpacity = parseFloat(
      streak.color.match(/[\d.]+\)$/)?.[0].replace(')', '') || '0.5',
    );
    const maxOpacity = adjustedOpacity * streakIntensity;

    return {
      id: streak.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-full',
        style: {
          height: streak.height,
          background: `linear-gradient(to right, transparent 0%, ${streak.color} 50%, transparent 100%)`,
          top: `calc(50% + ${streak.offset}px)`,
          transform: 'translateY(-50%)',
          opacity: 0,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: `${streak.id}-flash`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionPeak - 0.15 + streak.delay,
            duration: 0.3,
            mode: 'provider',
            targetIds: [streak.id],
            ranges: [
              { key: 'scaleX', val: 0.5, prog: 0 },
              { key: 'scaleX', val: 1.5, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: maxOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Build childrenData array
  const childrenData: RenderableComponentData[] = [
    // Outgoing media with iris out
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath: 'circle(50% at 50% 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-iris-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'clipPath', val: 'circle(50% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media with iris in
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath: 'circle(0% at 50% 50%)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingMedia.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-iris-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(50% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flare layer container
    {
      id: 'flare-layer-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      childrenData: flareRings,
    } as RenderableComponentData,

    // Anamorphic streak container
    {
      id: 'anamorphic-streak-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      childrenData: streakComponents,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'lens-flare-iris-transition-container',
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
        duration: baseLayoutDuration,
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
  id: 'lens-flare-iris-transition',
  title: 'Lens Flare Iris Transition',
  description:
    'Circular optical flare transition with expanding concentric rings, chromatic aberration, and anamorphic streaks that mimic a camera iris opening with light artifacts. Features multiple layered flare elements with blend modes, clip-path animations for media reveal, and horizontal streaks during peak transition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lens-flare',
    'iris',
    'optical',
    'cinematic',
    'light-artifacts',
    'anamorphic',
    'chromatic-aberration',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.9,
    flareIntensity: 1,
    streakIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lensFlareIrisTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
