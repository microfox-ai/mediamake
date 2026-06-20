/**
 * Glitch Datamosh Grid Transition Preset
 *
 * A glitch-style datamosh transition preset that displays a 3x2 grid of videos with progressive
 * digital corruption effects including RGB channel splits, frame holds, pixelation, posterization,
 * and strobing. At peak corruption (1.5s), the entire grid appears completely corrupted before
 * resolving into a new set of videos. Features seed-based randomization for unique glitch patterns per cell.
 *
 * Technical Features:
 * - 3x2 grid of video cells with individual glitch intensities
 * - RGB channel split effects using mix-blend-mode
 * - Horizontal displacement with step timing functions
 * - Contrast and saturation cycling
 * - Pixelation using CSS image-rendering
 * - Scan lines overlay with repeating-linear-gradient
 * - Digital noise overlay
 * - Strobe effect at peak corruption
 * - Seed-based randomization for unique transitions
 *
 * Use cases:
 * - Tech/cyber aesthetic transitions
 * - Music video effects
 * - Glitch art compositions
 * - Digital corruption simulations
 * - Modern video edits
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        startFrom: z.number().optional().describe('Start time in video'),
        endAt: z.number().optional().describe('End time in video'),
      }),
    )
    .length(6)
    .describe('Array of 6 videos for the 3x2 grid'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the transition in seconds'),
  peakCorruptionTime: z
    .number()
    .default(1.5)
    .describe('Time when corruption reaches maximum intensity'),
  randomSeed: z
    .number()
    .default(42)
    .describe('Random seed for glitch pattern generation'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall glitch effect intensity multiplier'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    duration,
    peakCorruptionTime,
    randomSeed,
    glitchIntensity,
  } = params;

  // Seeded random number generator
  const seededRandom = (seed: number) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Generate random multipliers for each cell
  const cellMultipliers = videos.map((_, index) => {
    const rand = seededRandom(randomSeed + index);
    return 0.5 + rand * 1.0; // 0.5 to 1.5 range
  });

  // Create video grid cells
  const videoGridChildren: RenderableComponentData[] = videos.map(
    (video, index) => {
      const cellId = `video-cell-${index}`;
      const multiplier = cellMultipliers[index] * glitchIntensity;

      return {
        id: cellId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          muted: true,
          loop: true,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          startFrom: video.startFrom,
          endAt: video.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          // Contrast cycling
          {
            id: `contrast-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'contrast', val: 1, prog: 0 },
                { key: 'contrast', val: 1 + 2 * multiplier, prog: 0.5 },
                { key: 'contrast', val: 1, prog: 1 },
              ],
            },
          },
          // Saturation cycling
          {
            id: `saturate-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'saturate', val: 1, prog: 0 },
                { key: 'saturate', val: 0, prog: 0.4 },
                { key: 'saturate', val: 1.5, prog: 0.5 },
                { key: 'saturate', val: 1, prog: 1 },
              ],
            },
          },
          // Horizontal displacement with step timing
          {
            id: `displacement-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'translateX', val: '0px', prog: 0 },
                {
                  key: 'translateX',
                  val: `${-20 * multiplier * seededRandom(randomSeed + index * 2)}px`,
                  prog: 0.1,
                },
                {
                  key: 'translateX',
                  val: `${20 * multiplier * seededRandom(randomSeed + index * 3)}px`,
                  prog: 0.2,
                },
                {
                  key: 'translateX',
                  val: `${-15 * multiplier * seededRandom(randomSeed + index * 4)}px`,
                  prog: 0.3,
                },
                {
                  key: 'translateX',
                  val: `${10 * multiplier * seededRandom(randomSeed + index * 5)}px`,
                  prog: 0.4,
                },
                {
                  key: 'translateX',
                  val: `${-25 * multiplier * seededRandom(randomSeed + index * 6)}px`,
                  prog: 0.5,
                },
                {
                  key: 'translateX',
                  val: `${15 * multiplier * seededRandom(randomSeed + index * 7)}px`,
                  prog: 0.6,
                },
                {
                  key: 'translateX',
                  val: `${-10 * multiplier * seededRandom(randomSeed + index * 8)}px`,
                  prog: 0.7,
                },
                { key: 'translateX', val: '0px', prog: 1 },
              ],
            },
          },
          // Pixelation effect (simulated with scale)
          {
            id: `pixelation-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.95 - 0.05 * multiplier, prog: 0.45 },
                { key: 'scale', val: 0.9 - 0.1 * multiplier, prog: 0.5 },
                { key: 'scale', val: 0.95 - 0.05 * multiplier, prog: 0.55 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create RGB split layers
  const rgbSplitLayers: RenderableComponentData[] = [
    // Red channel
    {
      id: 'rgb-split-red',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
            filter: 'contrast(2)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'red-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-red'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'red-displacement-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-red'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '-8px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
      childrenData: videos.map((video, index) => ({
        id: `red-video-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          muted: true,
          loop: true,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            filter: 'sepia(1) saturate(10) hue-rotate(-50deg)',
          },
          startFrom: video.startFrom,
          endAt: video.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      })),
    } as RenderableComponentData,
    // Green channel
    {
      id: 'rgb-split-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
            filter: 'contrast(2)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'green-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-green'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.4 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'green-displacement-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-green'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '4px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
      childrenData: videos.map((video, index) => ({
        id: `green-video-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          muted: true,
          loop: true,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            filter: 'sepia(1) saturate(10) hue-rotate(70deg)',
          },
          startFrom: video.startFrom,
          endAt: video.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      })),
    } as RenderableComponentData,
    // Blue channel
    {
      id: 'rgb-split-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
            filter: 'contrast(2)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'blue-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-blue'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.4 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'blue-displacement-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['rgb-split-blue'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '12px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
      childrenData: videos.map((video, index) => ({
        id: `blue-video-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          muted: true,
          loop: true,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            filter: 'sepia(1) saturate(10) hue-rotate(180deg)',
          },
          startFrom: video.startFrom,
          endAt: video.endAt,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      })),
    } as RenderableComponentData,
  ];

  // Scan lines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.1) 1px, transparent 2px); pointer-events: none;"></div>',
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'scanlines-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['scanlines-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Digital noise overlay
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 50% / 2px 2px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'noise-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData;

  // Video grid container
  const videoGridContainer: RenderableComponentData = {
    id: 'video-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Strobe effect at peak corruption
      {
        id: 'strobe-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: peakCorruptionTime - 0.1,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['video-grid-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.16 },
            { key: 'opacity', val: 1, prog: 0.33 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.66 },
            { key: 'opacity', val: 1, prog: 0.83 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: videoGridChildren,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-datamosh-grid-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      videoGridContainer,
      ...rgbSplitLayers,
      scanlinesOverlay,
      noiseOverlay,
    ],
  } as RenderableComponentData;

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
  id: 'glitch-datamosh-grid-transition',
  title: 'Glitch Datamosh Grid Transition',
  description:
    'A glitch-style datamosh transition preset that displays a 3x2 grid of videos with progressive digital corruption effects including RGB channel splits, frame holds, pixelation, posterization, and strobing. At peak corruption (1.5s), the entire grid appears completely corrupted before resolving into a new set of videos. Features seed-based randomization for unique glitch patterns per cell.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'datamosh',
    'grid',
    'transition',
    'corruption',
    'rgb-split',
    'digital',
    'tech',
    'video',
  ],
  defaultInputParams: {
    videos: [
      { src: 'https://example.com/video1.mp4' },
      { src: 'https://example.com/video2.mp4' },
      { src: 'https://example.com/video3.mp4' },
      { src: 'https://example.com/video4.mp4' },
      { src: 'https://example.com/video5.mp4' },
      { src: 'https://example.com/video6.mp4' },
    ],
    duration: 3,
    peakCorruptionTime: 1.5,
    randomSeed: 42,
    glitchIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchDatamoshGridTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
