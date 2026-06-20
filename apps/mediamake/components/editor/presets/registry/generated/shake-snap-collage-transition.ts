/**
 * Shake & Snap Video Collage Transition Preset
 *
 * This preset creates a dynamic 4-panel video collage with energetic handheld camera shake transitions.
 * Each transition features shake-out animations on outgoing panels with random translate values (±10px),
 * snap-to-focus spring easing on incoming panels, camera flash effects at transition midpoints,
 * and chromatic aberration RGB channel splits for realistic camera distortion.
 *
 * Features:
 * - **4-Panel Quadrant Layout**: Displays videos in top-left, top-right, bottom-left, bottom-right positions
 * - **Shake-Out Transitions**: Outgoing panels shake with random translateX/Y values while fading out
 * - **Snap-In Transitions**: Incoming panels shake then snap into perfect alignment with spring easing
 * - **Camera Flash Effect**: White overlay peaks at 50% transition progress (0.8 opacity max)
 * - **Chromatic Aberration**: RGB channel splits during shake for realistic camera distortion
 * - **Timing**: 0.4s transitions between 3.5s video displays
 *
 * Use cases:
 * - Creating energetic video montages with camera-shake aesthetics
 * - Building dynamic multi-panel video presentations
 * - Adding cinematic handheld camera effects to video collages
 * - Creating high-energy content for social media
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.string().describe('Source URL for first video (top-left quadrant)'),
  video2: z.string().describe('Source URL for second video (top-right quadrant)'),
  video3: z.string().describe('Source URL for third video (bottom-left quadrant)'),
  video4: z.string().describe('Source URL for fourth video (bottom-right quadrant)'),
  videoDuration: z
    .number()
    .default(3.5)
    .describe('Duration each video displays before transition (seconds)'),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of shake transition between videos (seconds)'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Peak opacity of camera flash effect (0-1)'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Chromatic aberration offset in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (params: PresetParams, props: PresetPassedProps): PresetOutput => {
  const {
    video1,
    video2,
    video3,
    video4,
    videoDuration,
    transitionDuration,
    flashIntensity,
    chromaticIntensity,
  } = params;

  // Calculate total duration: (4 videos * duration) - (3 transitions * duration)
  const totalDuration = videoDuration * 4 - transitionDuration * 3;

  // Transition timing points (relative to root container)
  const transition1Start = videoDuration - transitionDuration;
  const transition2Start = videoDuration * 2 - transitionDuration * 2;
  const transition3Start = videoDuration * 3 - transitionDuration * 3;

  // Helper: Create shake effect ranges for outgoing panel
  const createShakeOutRanges = () => {
    return [
      // translateX shake sequence with random values
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 10, prog: 0.1 },
      { key: 'translateX', val: -8, prog: 0.2 },
      { key: 'translateX', val: 7, prog: 0.3 },
      { key: 'translateX', val: -10, prog: 0.4 },
      { key: 'translateX', val: 5, prog: 0.5 },
      { key: 'translateX', val: -6, prog: 0.6 },
      { key: 'translateX', val: 8, prog: 0.7 },
      { key: 'translateX', val: -4, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
      // translateY shake sequence
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -7, prog: 0.15 },
      { key: 'translateY', val: 9, prog: 0.3 },
      { key: 'translateY', val: -5, prog: 0.45 },
      { key: 'translateY', val: 6, prog: 0.6 },
      { key: 'translateY', val: -8, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
      // Fade out
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  };

  // Helper: Create shake-in and snap effect ranges for incoming panel
  const createShakeInRanges = () => {
    return [
      // translateX shake then snap
      { key: 'translateX', val: -10, prog: 0 },
      { key: 'translateX', val: 8, prog: 0.2 },
      { key: 'translateX', val: -5, prog: 0.4 },
      { key: 'translateX', val: 3, prog: 0.6 },
      { key: 'translateX', val: 0, prog: 1 },
      // translateY shake then snap
      { key: 'translateY', val: 7, prog: 0 },
      { key: 'translateY', val: -6, prog: 0.25 },
      { key: 'translateY', val: 4, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
      // Fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ];
  };

  // Helper: Create flash effect for transition
  const createFlashEffect = (start: number) => {
    return {
      id: `flash-${start}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['flash-overlay'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: flashIntensity, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create chromatic aberration effects
  const createChromaticEffects = (start: number, layerId: string, offset: number) => {
    return {
      id: `chromatic-${layerId}-${start}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.8 },
          { key: 'opacity', val: 0, prog: 1 },
          ...(offset !== 0
            ? [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: offset * chromaticIntensity, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
              ]
            : []),
        ],
      },
    };
  };

  const childrenData: RenderableComponentData[] = [
    // Quadrant 1: Top-left (video1)
    {
      id: 'quadrant-top-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 left-0 w-1/2 h-1/2 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: videoDuration,
        },
      },
      effects: [
        {
          id: 'shake-out-q1',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transition1Start,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-top-left'],
            ranges: createShakeOutRanges(),
          },
        },
      ],
      childrenData: [
        {
          id: 'video-q1',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: videoDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Quadrant 2: Top-right (video2)
    {
      id: 'quadrant-top-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 right-0 w-1/2 h-1/2 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: transition1Start,
          duration: videoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'shake-in-q2',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-top-right'],
            ranges: createShakeInRanges(),
          },
        },
        {
          id: 'shake-out-q2',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: videoDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-top-right'],
            ranges: createShakeOutRanges(),
          },
        },
      ],
      childrenData: [
        {
          id: 'video-q2',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: videoDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Quadrant 3: Bottom-left (video3)
    {
      id: 'quadrant-bottom-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 left-0 w-1/2 h-1/2 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: transition2Start,
          duration: videoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'shake-in-q3',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-bottom-left'],
            ranges: createShakeInRanges(),
          },
        },
        {
          id: 'shake-out-q3',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: videoDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-bottom-left'],
            ranges: createShakeOutRanges(),
          },
        },
      ],
      childrenData: [
        {
          id: 'video-q3',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video3,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: videoDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Quadrant 4: Bottom-right (video4)
    {
      id: 'quadrant-bottom-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 right-0 w-1/2 h-1/2 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: transition3Start,
          duration: videoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'shake-in-q4',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['quadrant-bottom-right'],
            ranges: createShakeInRanges(),
          },
        },
      ],
      childrenData: [
        {
          id: 'video-q4',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video4,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: videoDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Flash overlay
    {
      id: 'flash-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'white',
            zIndex: 100,
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
        createFlashEffect(transition1Start),
        createFlashEffect(transition2Start),
        createFlashEffect(transition3Start),
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Chromatic aberration - Red channel
    {
      id: 'chromatic-r-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(255,0,0,0.15)',
            mixBlendMode: 'screen',
            zIndex: 90,
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
        createChromaticEffects(transition1Start, 'chromatic-r-layer', -1),
        createChromaticEffects(transition2Start, 'chromatic-r-layer', -1),
        createChromaticEffects(transition3Start, 'chromatic-r-layer', -1),
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Chromatic aberration - Green channel
    {
      id: 'chromatic-g-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0,255,0,0.1)',
            mixBlendMode: 'screen',
            zIndex: 91,
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
        createChromaticEffects(transition1Start, 'chromatic-g-layer', 0),
        createChromaticEffects(transition2Start, 'chromatic-g-layer', 0),
        createChromaticEffects(transition3Start, 'chromatic-g-layer', 0),
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Chromatic aberration - Blue channel
    {
      id: 'chromatic-b-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0,0,255,0.15)',
            mixBlendMode: 'screen',
            zIndex: 92,
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
        createChromaticEffects(transition1Start, 'chromatic-b-layer', 1),
        createChromaticEffects(transition2Start, 'chromatic-b-layer', 1),
        createChromaticEffects(transition3Start, 'chromatic-b-layer', 1),
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'shake-snap-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-zinc-900',
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
  id: 'shake-snap-collage-transition',
  title: 'Shake & Snap Video Collage Transition',
  description:
    'A dynamic 4-panel video collage preset with energetic handheld camera shake transitions. Features shake-out animation on outgoing panels with random translate values (±10px), snap-to-focus spring easing on incoming panels, camera flash effect at transition midpoint, and chromatic aberration RGB channel splits for realistic camera distortion. Ideal for energetic montages, sports highlights, and dynamic content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', 'collage', 'transition', 'shake', 'camera', 'chromatic', 'energetic'],
  defaultInputParams: {
    video1: 'https://example.com/video1.mp4',
    video2: 'https://example.com/video2.mp4',
    video3: 'https://example.com/video3.mp4',
    video4: 'https://example.com/video4.mp4',
    videoDuration: 3.5,
    transitionDuration: 0.4,
    flashIntensity: 0.8,
    chromaticIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shakeSnapCollageTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
