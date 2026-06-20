/**
 * Vertical Paint Smear Wipe Transition Preset
 *
 * Creates a vertical paint smear wipe transition where videos blend through multiple parallel
 * brush strokes that cascade down the screen like dripping paint. Features 7 vertical brush
 * stroke columns that reveal the incoming video with staggered timing, each column having a
 * unique brush texture and slightly different animation speed. The outgoing video dissolves
 * through these paint drips with a wet paint blending effect.
 *
 * Features:
 * - **7 Vertical Brush Columns**: Each column has unique brush texture and animation speed
 * - **Staggered Timing**: Columns animate with delays from 0ms to 400ms for cascading effect
 * - **Wet Paint Blending**: Outgoing video uses multiply blend mode, incoming uses screen
 * - **Progressive Blur**: Outgoing video blurs from 0px to 4px, incoming from 4px to 0px
 * - **Natural Paint Flow**: Each column has subtle movement variation for realistic dripping
 * - **2-Second Overlap**: Videos blend during transition with opacity and blur changes
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding painterly effects to video sequences
 * - Building creative video montages with organic transitions
 * - Creating smooth visual storytelling with paint drip aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the transition overlap in seconds (paint drip effect)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate base layout duration (sum of videos minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;
  const incomingStart = video1.duration - overlapDuration;
  const incomingDuration = video2.duration + overlapDuration;

  // Mask column configuration (7 columns)
  const maskColumns = [
    {
      id: 'mask-column-0',
      left: '0%',
      delay: 0,
      duration: 1.8,
      gradient: 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(50,50,50,0.7) 50%, rgba(30,30,30,0.9) 100%)',
    },
    {
      id: 'mask-column-1',
      left: '14.28%',
      delay: 0.057,
      duration: 2.0,
      gradient: 'linear-gradient(180deg, rgba(40,35,30,0.85) 0%, rgba(60,55,50,0.65) 50%, rgba(40,35,30,0.85) 100%)',
    },
    {
      id: 'mask-column-2',
      left: '28.56%',
      delay: 0.114,
      duration: 1.9,
      gradient: 'linear-gradient(180deg, rgba(35,30,35,0.88) 0%, rgba(55,50,55,0.68) 50%, rgba(35,30,35,0.88) 100%)',
    },
    {
      id: 'mask-column-3',
      left: '42.84%',
      delay: 0.171,
      duration: 2.2,
      gradient: 'linear-gradient(180deg, rgba(25,30,35,0.92) 0%, rgba(45,50,55,0.72) 50%, rgba(25,30,35,0.92) 100%)',
    },
    {
      id: 'mask-column-4',
      left: '57.12%',
      delay: 0.228,
      duration: 2.1,
      gradient: 'linear-gradient(180deg, rgba(30,25,30,0.87) 0%, rgba(50,45,50,0.67) 50%, rgba(30,25,30,0.87) 100%)',
    },
    {
      id: 'mask-column-5',
      left: '71.4%',
      delay: 0.285,
      duration: 1.95,
      gradient: 'linear-gradient(180deg, rgba(35,35,30,0.86) 0%, rgba(55,55,50,0.66) 50%, rgba(35,35,30,0.86) 100%)',
    },
    {
      id: 'mask-column-6',
      left: '85.68%',
      delay: 0.342,
      duration: 2.05,
      gradient: 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(50,50,50,0.7) 50%, rgba(30,30,30,0.9) 100%)',
    },
  ];

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // 1. Outgoing Video
  childrenData.push({
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Blur effect during overlap (0px to 4px)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Incoming Video
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Blur effect during overlap (4px to 0px)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(4px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Opacity fade-in during overlap
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 3. Mask Columns (7 vertical paint strokes)
  maskColumns.forEach((column) => {
    childrenData.push({
      id: column.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 h-full',
          style: {
            width: '14.28%',
            left: column.left,
            background: column.gradient,
            borderRadius: '2px',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart, // Start with incoming video
          duration: overlapDuration, // Duration of transition
        },
      },
      effects: [
        // Paint drip animation (translateY from -100% to 100%)
        {
          id: `${column.id}-drip-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: column.delay, // Staggered delay
            duration: column.duration, // Varying duration for natural flow
            mode: 'provider',
            targetIds: [column.id],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100%', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paint-smear-wipe-root',
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vertical-paint-smear-wipe-transition',
  title: 'Vertical Paint Smear Wipe Transition',
  description:
    'A creative transition effect where videos blend through 7 parallel vertical brush stroke columns that cascade down the screen like dripping paint. Features staggered timing across columns, unique brush textures per column, wet paint blending effects with mix-blend-modes (multiply/screen), and progressive blur transitions during a 2-second overlap period. Each column animates at slightly different speeds to simulate natural paint flow.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paint', 'wipe', 'brush', 'artistic', 'creative', 'drip', 'blend-mode'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const verticalPaintSmearWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
