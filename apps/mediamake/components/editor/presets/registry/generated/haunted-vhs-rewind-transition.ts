/**
 * Haunted VHS Rewind Transition Preset
 *
 * This preset simulates a cursed videotape rewinding through horrific scenes with:
 * - Horizontal strips moving at different speeds with temporal displacement
 * - Tracking errors where the image splits and rolls vertically
 * - Variable rewind speeds (ultra-fast patterns, sudden stops on disturbing frames)
 * - Magnetic tape damage effects (color bleeding, signal degradation, blue screen)
 * - Erratic backward-counting timestamp overlay
 *
 * The transition progresses through five phases:
 * 1. Tape engagement (0-10%): Initial slow movement, minimal distortion
 * 2. Accelerating rewind (10-50%): Increasing strip speeds, glimpses of horror
 * 3. Maximum chaos (50-70%): Fastest speeds, intense distortion, signal loss
 * 4. Sudden stops (70-85%): Intermittent freezes on frightening frames
 * 5. Ejection/play (85-100%): Strips realign, distortion clears
 *
 * Use cases:
 * - Found footage horror transitions
 * - VHS aesthetic video effects
 * - Cursed tape simulation sequences
 * - Retro horror video overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSrc: z.string().describe('Source video URL or local path'),
  totalDuration: z
    .number()
    .default(10)
    .describe('Total duration of the transition in seconds'),
  timestampText: z
    .string()
    .default('23:59:59')
    .describe('Initial timestamp text (counts backward erratically)'),
  strip0StartOffset: z
    .number()
    .default(0)
    .describe('Start offset for strip 0 in seconds'),
  strip1StartOffset: z
    .number()
    .default(2)
    .describe('Start offset for strip 1 in seconds'),
  strip2StartOffset: z
    .number()
    .default(4)
    .describe('Start offset for strip 2 in seconds'),
  strip3StartOffset: z
    .number()
    .default(1)
    .describe('Start offset for strip 3 in seconds'),
  strip4StartOffset: z
    .number()
    .default(5)
    .describe('Start offset for strip 4 in seconds'),
  strip5StartOffset: z
    .number()
    .default(3)
    .describe('Start offset for strip 5 in seconds'),
  strip6StartOffset: z
    .number()
    .default(6)
    .describe('Start offset for strip 6 in seconds'),
  strip7StartOffset: z
    .number()
    .default(1.5)
    .describe('Start offset for strip 7 in seconds'),
  strip8StartOffset: z
    .number()
    .default(4.5)
    .describe('Start offset for strip 8 in seconds'),
  strip9StartOffset: z
    .number()
    .default(2.5)
    .describe('Start offset for strip 9 in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    totalDuration,
    timestampText,
    strip0StartOffset,
    strip1StartOffset,
    strip2StartOffset,
    strip3StartOffset,
    strip4StartOffset,
    strip5StartOffset,
    strip6StartOffset,
    strip7StartOffset,
    strip8StartOffset,
    strip9StartOffset,
  } = params;

  // Phase durations (as percentages of total duration)
  const phase1End = totalDuration * 0.1; // 10%
  const phase2End = totalDuration * 0.5; // 50%
  const phase3End = totalDuration * 0.7; // 70%
  const phase4End = totalDuration * 0.85; // 85%

  // Strip configuration with different speeds and offsets
  const stripConfigs = [
    { id: 'strip-0', playbackRate: 1.5, startOffset: strip0StartOffset },
    { id: 'strip-1', playbackRate: 0.75, startOffset: strip1StartOffset },
    { id: 'strip-2', playbackRate: 2, startOffset: strip2StartOffset },
    { id: 'strip-3', playbackRate: 0.5, startOffset: strip3StartOffset },
    { id: 'strip-4', playbackRate: 3, startOffset: strip4StartOffset },
    { id: 'strip-5', playbackRate: 1, startOffset: strip5StartOffset },
    { id: 'strip-6', playbackRate: 2.5, startOffset: strip6StartOffset },
    { id: 'strip-7', playbackRate: 0.25, startOffset: strip7StartOffset },
    { id: 'strip-8', playbackRate: 1.75, startOffset: strip8StartOffset },
    { id: 'strip-9', playbackRate: 4, startOffset: strip9StartOffset },
  ];

  // Create video strips
  const stripChildren: RenderableComponentData[] = stripConfigs.map(
    (config, index) => {
      const stripId = `strip-${index}`;
      const videoId = `strip-${index}-video`;

      // Create horizontal movement effects for each strip
      const stripEffects: any[] = [
        // Phase 1: Tape engagement (slow movement)
        {
          id: `${stripId}-phase1-translate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: phase1End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: index % 2 === 0 ? '-10%' : '10%', prog: 1 },
            ],
          },
        },
        // Phase 2: Accelerating rewind
        {
          id: `${stripId}-phase2-translate`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: phase1End,
            duration: phase2End - phase1End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: index % 2 === 0 ? '-10%' : '10%', prog: 0 },
              { key: 'translateX', val: index % 2 === 0 ? '-80%' : '80%', prog: 1 },
            ],
          },
        },
        // Phase 3: Maximum chaos (ultra-fast)
        {
          id: `${stripId}-phase3-translate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: index % 2 === 0 ? '-80%' : '80%', prog: 0 },
              { key: 'translateX', val: index % 2 === 0 ? '-200%' : '200%', prog: 0.5 },
              { key: 'translateX', val: index % 2 === 0 ? '0%' : '0%', prog: 1 },
            ],
          },
        },
        // Tracking errors (skew)
        {
          id: `${stripId}-tracking-skew`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'skewY', val: '0deg', prog: 0 },
              { key: 'skewY', val: index % 3 === 0 ? '5deg' : '-5deg', prog: 0.25 },
              { key: 'skewY', val: '0deg', prog: 0.5 },
              { key: 'skewY', val: index % 3 === 0 ? '-5deg' : '5deg', prog: 0.75 },
              { key: 'skewY', val: '0deg', prog: 1 },
            ],
          },
        },
        // Opacity flicker (signal degradation)
        {
          id: `${stripId}-opacity-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.1 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.4, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: 0.6, prog: 0.7 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0.7, prog: 0.9 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur (signal degradation)
        {
          id: `${stripId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(3px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Color distortion (hue-rotate + saturate)
        {
          id: `${stripId}-color-distort`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 0 },
              { key: 'filter', val: `hue-rotate(${index * 30}deg) saturate(2)`, prog: 0.5 },
              { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 1 },
            ],
          },
        },
        // Phase 4: Sudden stops (hold frames)
        {
          id: `${stripId}-phase4-freeze`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase3End,
            duration: phase4End - phase3End,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 0.4 },
              { key: 'translateX', val: index % 2 === 0 ? '-20%' : '20%', prog: 0.5 },
              { key: 'translateX', val: index % 2 === 0 ? '-20%' : '20%', prog: 0.9 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
      ];

      return {
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              height: 'calc(100% / 10)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: stripEffects,
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: videoSrc,
              playbackRate: config.playbackRate,
              startFrom: config.startOffset,
              fit: 'cover',
              muted: true,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Container for all strips
  const stripsContainer: RenderableComponentData = {
    id: 'strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col divide-y divide-gray-800',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Vertical roll effect (entire container)
      {
        id: 'container-vertical-roll',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: ['strips-container'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '10%', prog: 0.25 },
            { key: 'translateY', val: '-10%', prog: 0.5 },
            { key: 'translateY', val: '5%', prog: 0.75 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: stripChildren,
  };

  // Tracking error overlays
  const trackingErrorOverlay: RenderableComponentData = {
    id: 'tracking-error-overlay',
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
        duration: totalDuration,
      },
    },
    effects: [
      // Animate tracking bars
      {
        id: 'tracking-bar-1-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: ['tracking-error-bar-1'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '200%', prog: 0.5 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
      {
        id: 'tracking-bar-2-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: ['tracking-error-bar-2'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-200%', prog: 0.5 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'tracking-error-bar-1',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '8px',
              top: '30%',
              backgroundColor: 'rgba(255,255,255,0.3)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
      {
        id: 'tracking-error-bar-2',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '12px',
              top: '65%',
              backgroundColor: 'rgba(255,255,255,0.2)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
  };

  // Scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Signal loss overlay (blue screen)
  const signalLossOverlay: RenderableComponentData = {
    id: 'signal-loss-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundColor: '#0000ff',
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
      // Signal loss during chaos phase
      {
        id: 'signal-loss-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: ['signal-loss-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.4 },
            { key: 'opacity', val: 0.9, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Timestamp overlay
  const timestampOverlay: RenderableComponentData = {
    id: 'timestamp-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-4 right-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Timestamp flicker
      {
        id: 'timestamp-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: ['timestamp-text'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.2, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'timestamp-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: timestampText,
          style: {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            textShadow:
              '2px 2px 4px rgba(255,0,0,0.8), -2px -2px 4px rgba(0,255,255,0.8)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '4px 8px',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-rewind-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      stripsContainer,
      trackingErrorOverlay,
      scanLinesOverlay,
      signalLossOverlay,
      timestampOverlay,
    ],
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
  id: 'haunted-vhs-rewind-transition',
  title: 'Haunted VHS Rewind Transition',
  description:
    'A horror-themed VHS rewind transition that simulates a cursed videotape rewinding through horrific scenes. Features horizontal strips moving at different speeds with temporal displacement, tracking errors with vertical roll, variable rewind speeds, magnetic tape damage effects including color bleeding and signal degradation, and an erratically counting backward timestamp overlay. The transition progresses through five phases: tape engagement, accelerating rewind with horror glimpses, maximum distortion chaos, sudden stops on frightening frames, and final ejection/play.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vhs',
    'horror',
    'rewind',
    'glitch',
    'retro',
    'found-footage',
    'cursed-tape',
    'tracking-error',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    totalDuration: 10,
    timestampText: '23:59:59',
    strip0StartOffset: 0,
    strip1StartOffset: 2,
    strip2StartOffset: 4,
    strip3StartOffset: 1,
    strip4StartOffset: 5,
    strip5StartOffset: 3,
    strip6StartOffset: 6,
    strip7StartOffset: 1.5,
    strip8StartOffset: 4.5,
    strip9StartOffset: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hauntedVhsRewindTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
