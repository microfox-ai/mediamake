/**
 * Vintage TV Channel Change Transition Preset
 *
 * This preset simulates the nostalgic experience of channel surfing on an old analog TV.
 * It creates a transition between two videos with authentic CRT television artifacts including:
 * - Flickering static snow during channel changes
 * - Horizontal hold problems causing the image to roll
 * - RGB color separation and chromatic aberration
 * - Ghosting effects with screen blend modes
 * - Scanline overlay for authentic CRT appearance
 * - CRT vignette and brightness/contrast adjustments
 *
 * Features:
 * - 2.5-second overlap transition period
 * - Static noise burst at transition midpoint
 * - Continuous horizontal rolling throughout
 * - RGB channel separation during channel change
 * - Ghosting with offset duplicate layers
 * - Scanline overlay and CRT color grading
 *
 * Use cases:
 * - Creating nostalgic late-night channel surfing aesthetics
 * - Vintage TV show introductions or transitions
 * - Retro-styled video content
 * - Music videos with analog VHS/TV aesthetics
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
    startFrom: z.number().optional().describe('Start time of the first video (seconds)'),
    endAt: z.number().optional().describe('End time of the first video (seconds)'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    startFrom: z.number().optional().describe('Start time of the second video (seconds)'),
    endAt: z.number().optional().describe('End time of the second video (seconds)'),
  }).describe('Second video configuration'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of the overlap transition in seconds'),
  staticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of static noise (0-1)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Amount of RGB channel separation in pixels'),
  rollSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed multiplier for horizontal rolling effect'),
  ghostingOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of ghosting effect (0-1)'),
  ghostingOffset: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Horizontal offset of ghosting in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    staticIntensity,
    rgbSeparation,
    rollSpeed,
    ghostingOpacity,
    ghostingOffset,
  } = params;

  // Calculate video durations (default to 5 seconds if not specified)
  const video1Duration = video1.endAt
    ? video1.endAt - (video1.startFrom || 0)
    : 5;
  const video2Duration = video2.endAt
    ? video2.endAt - (video2.startFrom || 0)
    : 5;

  // Total duration accounting for overlap
  const totalDuration = video1Duration + video2Duration - transitionDuration;

  // Transition midpoint (when static is most intense)
  const transitionMidpoint = video1Duration - transitionDuration / 2;

  // Helper function to create rolling animation effect
  const createRollingEffect = (targetId: string, startTime: number, isTransitioning: boolean) => {
    const baseSpeed = 8; // Base roll speed in seconds
    const transitionSpeed = baseSpeed / rollSpeed; // Faster during transition
    
    return {
      id: `rolling-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: startTime,
        duration: video1Duration + video2Duration, // Long duration for continuous effect
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: '0%', prog: 0 },
          { key: 'translateY', val: '100%', prog: 0.5 },
          { key: 'translateY', val: '0%', prog: 1 },
        ],
      },
    };
  };

  // Helper function to create RGB separation effects
  const createRGBEffects = (videoId: string, videoIndex: number) => {
    const startTime = videoIndex === 1 ? transitionMidpoint - 0.1 : 0;
    const duration = 0.2; // Short burst during channel change

    return [
      // Red channel
      {
        id: `rgb-red-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: startTime,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [`${videoId}-rgb-red`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Green channel
      {
        id: `rgb-green-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: startTime,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [`${videoId}-rgb-green`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blue channel
      {
        id: `rgb-blue-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: startTime,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [`${videoId}-rgb-blue`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Video 1 (outgoing) with all effects
  const video1Container: RenderableComponentData = {
    id: 'video1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: 'contrast(110%) brightness(95%) saturate(85%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1Duration,
      },
    },
    effects: [
      // Fade out during transition
      {
        id: 'video1-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-in' as const,
          start: video1Duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['video1-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Primary video
      {
        id: 'video1-primary',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom || 0,
          endAt: video1.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
        effects: [createRollingEffect('video1-primary', 0, false)],
      } as RenderableComponentData,
      // Ghost layer
      {
        id: 'video1-ghost',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom || 0,
          endAt: video1.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: ghostingOpacity,
            transform: `translateX(${ghostingOffset}px)`,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Red
      {
        id: 'video1-rgb-red',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom || 0,
          endAt: video1.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: `translateX(-${rgbSeparation}px)`,
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(-60deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Green
      {
        id: 'video1-rgb-green',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom || 0,
          endAt: video1.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: 'translateX(0px)',
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(60deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Blue
      {
        id: 'video1-rgb-blue',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom || 0,
          endAt: video1.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: `translateX(${rgbSeparation}px)`,
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(180deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Add RGB effects to video1
  video1Container.effects = [
    ...(video1Container.effects || []),
    ...createRGBEffects('video1', 1),
  ];

  // Video 2 (incoming) with all effects
  const video2Container: RenderableComponentData = {
    id: 'video2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: 'contrast(110%) brightness(95%) saturate(85%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: video1Duration - transitionDuration,
        duration: video2Duration + transitionDuration,
      },
    },
    effects: [
      // Fade in during transition
      {
        id: 'video2-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['video2-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Primary video
      {
        id: 'video2-primary',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom || 0,
          endAt: video2.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration + transitionDuration,
          },
        },
        effects: [createRollingEffect('video2-primary', 0, false)],
      } as RenderableComponentData,
      // Ghost layer
      {
        id: 'video2-ghost',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom || 0,
          endAt: video2.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: ghostingOpacity,
            transform: `translateX(${ghostingOffset}px)`,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Red
      {
        id: 'video2-rgb-red',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom || 0,
          endAt: video2.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: `translateX(-${rgbSeparation}px)`,
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(-60deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Green
      {
        id: 'video2-rgb-green',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom || 0,
          endAt: video2.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: 'translateX(0px)',
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(60deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // RGB separation - Blue
      {
        id: 'video2-rgb-blue',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom || 0,
          endAt: video2.endAt,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            opacity: 0,
            transform: `translateX(${rgbSeparation}px)`,
            filter: 'brightness(1) contrast(1) saturate(0) sepia(1) hue-rotate(180deg) saturate(5)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Add RGB effects to video2
  video2Container.effects = [
    ...(video2Container.effects || []),
    ...createRGBEffects('video2', 2),
  ];

  // Static noise layer
  const staticLayer: RenderableComponentData = {
    id: 'static-noise-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noise)%27 opacity=%270.8%27/%3E%3C/svg%3E'); background-size: 200px 200px; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        opacity: 0,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Static burst at transition midpoint
      {
        id: 'static-burst',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: transitionMidpoint - 0.5,
          duration: 1,
          mode: 'provider' as const,
          targetIds: ['static-noise-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: staticIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // CRT vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'crt-vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container with scanline overlay
  const rootContainer: RenderableComponentData = {
    id: 'vintage-tv-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      video1Container,
      video2Container,
      staticLayer,
      vignetteOverlay,
    ],
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
  id: 'vintage-tv-channel-transition',
  title: 'Vintage TV Channel Change Transition',
  description: 'Simulates analog TV channel-change effects with flickering static, horizontal rolling bars, RGB separation, ghosting, and CRT characteristics. Creates a nostalgic late-night channel surfing aesthetic with unstable signal artifacts, horizontal hold problems, and color bleeding effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'tv', 'analog', 'crt', 'retro', 'static', 'glitch', 'rgb-separation', 'nostalgic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      endAt: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      endAt: 5,
    },
    transitionDuration: 2.5,
    staticIntensity: 0.8,
    rgbSeparation: 1,
    rollSpeed: 2,
    ghostingOpacity: 0.3,
    ghostingOffset: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageTvChannelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
