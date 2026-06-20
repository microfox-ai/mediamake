/**
 * Marker Streak Transition Preset
 *
 * Bold, gestural marker strokes swipe across the screen in multiple passes to transition
 * between two videos. Each stroke feels like a confident, quick swipe with a broad marker,
 * leaving streaky trails with varying opacity. Strokes move in different directions
 * (horizontal, vertical, diagonal) creating a dynamic crosshatch effect during the transition.
 * The incoming video is revealed through the gaps between strokes, while the outgoing video
 * fades behind them. Features subtle ink bleed effects at stroke edges for authenticity.
 *
 * Features:
 * - **Bold marker strokes**: 6-8 broad gestural strokes (20-40px width)
 * - **Multi-directional movement**: Horizontal, vertical, and diagonal swipes
 * - **Crosshatch effect**: Multiple strokes create dynamic layered effect
 * - **Ink bleed edges**: SVG feGaussianBlur filter for authentic marker feel
 * - **Streaky trails**: Gradient opacity along stroke length
 * - **Staggered timing**: 0.1s delays between strokes for sequential reveal
 * - **Configurable overlap**: Adjustable transition duration (default 0.9s)
 *
 * Use cases:
 * - Creating energetic transitions between video clips
 * - Adding artistic marker-style transitions
 * - Building dynamic crosshatch reveal effects
 * - Transitioning between scenes with bold visual style
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2.0)
    .default(0.9)
    .describe('Duration of transition overlap in seconds'),
  strokeColor: z
    .string()
    .default('#1a1a1a')
    .describe('Color of marker strokes (hex or rgba)'),
  strokeCount: z
    .number()
    .int()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of marker strokes (4-12)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, strokeColor, strokeCount } =
    params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate transition start time
  const transitionStart = video1.duration - transitionDuration;

  // Helper: Generate SVG marker stroke with gradient and blur
  const createStrokeSVG = (
    id: string,
    direction: 'horizontal' | 'vertical' | 'diagonal',
    width: number,
    opacity: number,
  ): string => {
    const gradientId = `gradient-${id}`;
    const filterId = `blur-${id}`;

    let x1 = '0%',
      y1 = '0%',
      x2 = '100%',
      y2 = '0%';

    if (direction === 'vertical') {
      x1 = '0%';
      y1 = '0%';
      x2 = '0%';
      y2 = '100%';
    } else if (direction === 'diagonal') {
      x1 = '0%';
      y1 = '0%';
      x2 = '100%';
      y2 = '100%';
    }

    return `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; pointer-events: none;">
        <defs>
          <linearGradient id="${gradientId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0" />
            <stop offset="20%" stop-color="${strokeColor}" stop-opacity="${opacity * 0.6}" />
            <stop offset="50%" stop-color="${strokeColor}" stop-opacity="${opacity}" />
            <stop offset="80%" stop-color="${strokeColor}" stop-opacity="${opacity * 0.6}" />
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0" />
          </linearGradient>
          <filter id="${filterId}">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#${gradientId})" filter="url(#${filterId})" />
      </svg>
    `;
  };

  // Stroke configurations
  const strokeConfigs = [
    { direction: 'horizontal' as const, translateKey: 'translateX' as const, from: -120, to: 120, speed: 0.4, delay: 0, width: 35, opacity: 0.85 },
    { direction: 'vertical' as const, translateKey: 'translateY' as const, from: -120, to: 120, speed: 0.5, delay: 0.1, width: 30, opacity: 0.8 },
    { direction: 'diagonal' as const, translateKey: 'translateX' as const, translateKey2: 'translateY' as const, fromX: 120, toX: -120, fromY: -120, toY: 120, speed: 0.45, delay: 0.2, width: 40, opacity: 0.75 },
    { direction: 'horizontal' as const, translateKey: 'translateX' as const, from: 120, to: -120, speed: 0.35, delay: 0.3, width: 25, opacity: 0.9 },
    { direction: 'vertical' as const, translateKey: 'translateY' as const, from: 120, to: -120, speed: 0.55, delay: 0.35, width: 38, opacity: 0.85 },
    { direction: 'diagonal' as const, translateKey: 'translateX' as const, translateKey2: 'translateY' as const, fromX: -120, toX: 120, fromY: 120, toY: -120, speed: 0.5, delay: 0.4, width: 32, opacity: 0.8 },
    { direction: 'horizontal' as const, translateKey: 'translateX' as const, from: -120, to: 120, speed: 0.3, delay: 0.5, width: 28, opacity: 0.7 },
    { direction: 'vertical' as const, translateKey: 'translateY' as const, from: -120, to: 120, speed: 0.6, delay: 0.55, width: 36, opacity: 0.9 },
  ];

  // Select strokes based on strokeCount
  const selectedStrokes = strokeConfigs.slice(0, strokeCount);

  // Create stroke components
  const strokeComponents: RenderableComponentData[] = selectedStrokes.map(
    (config, index) => {
      const strokeId = `stroke-${index + 1}`;

      const ranges: Array<{ key: string; val: any; prog: number }> = [];

      if (config.direction === 'diagonal' && config.translateKey2) {
        // Diagonal movement
        ranges.push(
          { key: config.translateKey, val: config.fromX, prog: 0 },
          { key: config.translateKey, val: config.toX, prog: 1 },
          { key: config.translateKey2, val: config.fromY, prog: 0 },
          { key: config.translateKey2, val: config.toY, prog: 1 },
        );
      } else {
        // Horizontal or vertical movement
        ranges.push(
          { key: config.translateKey, val: config.from, prog: 0 },
          { key: config.translateKey, val: config.to, prog: 1 },
        );
      }

      return {
        id: strokeId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: createStrokeSVG(
            strokeId,
            config.direction,
            config.width,
            config.opacity,
          ),
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'multiply',
            opacity: config.opacity,
          },
        },
        context: {
          timing: {
            start: transitionStart + config.delay,
            duration: transitionDuration - config.delay,
          },
        },
        effects: [
          {
            id: `${strokeId}-swipe`,
            componentId: 'generic',
            data: {
              type: config.speed < 0.4 ? 'ease-out' : 'ease-in-out',
              start: 0,
              duration: config.speed,
              mode: 'provider',
              targetIds: [strokeId],
              ranges,
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create childrenData
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: 2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Marker strokes
    ...strokeComponents,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'marker-streak-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'marker-streak-transition',
  title: 'Marker Streak Transition',
  description:
    'Bold, gestural marker strokes swipe across the screen in multiple passes to transition between videos. Creates a dynamic crosshatch effect with streaky trails and ink bleed edges.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'marker', 'stroke', 'crosshatch', 'artistic', 'bold', 'gestural'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.9,
    strokeColor: '#1a1a1a',
    strokeCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const markerStreakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};