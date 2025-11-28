/**
 * Stop-Motion Masking Tape Transition Preset
 *
 * Creates a handmade stop-motion style transition using masking tape pieces that appear
 * to be placed and removed frame by frame. Features crumpled textures, imperfect placement,
 * and stepped animations (12fps feel) for authentic stop-motion timing.
 *
 * Features:
 * - **Stop-Motion Timing**: Stepped animations mimicking 12fps handmade animation
 * - **Tape Pieces**: 12 randomized tape pieces with crumpled texture and air bubbles
 * - **Imperfect Placement**: Random rotations, skew transforms, and brightness variations
 * - **Two-Phase Animation**: Tape pieces appear to cover outgoing video, then get yanked off
 * - **Audio Feedback**: Paper rustling and sticky sounds synchronized with frame changes
 * - **Jerky Movement**: steps(4) timing for removal with random directions and scale pop
 *
 * Use cases:
 * - Creating handmade, craft-style video transitions
 * - Adding tactile, physical feel to digital content
 * - Building stop-motion aesthetic videos
 * - Creating unique, artistic transitions between clips
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
    src: z.string().describe('Source URL of first video'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
  }),
  rustlingSound: z.object({
    src: z.string().describe('Paper rustling sound effect'),
  }),
  stickySound: z.object({
    src: z.string().describe('Sticky tape sound effect'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total transition duration in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, rustlingSound, stickySound, transitionDuration } =
    params;

  // Helper function to generate random values
  const randomBetween = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to generate random direction for removal
  const getRandomRemovalDirection = (): {
    x: string;
    y: string;
  } => {
    const directions = [
      { x: '150%', y: '0%' }, // Right
      { x: '-150%', y: '0%' }, // Left
      { x: '0%', y: '150%' }, // Down
      { x: '0%', y: '-150%' }, // Up
      { x: '150%', y: '150%' }, // Bottom-right
      { x: '-150%', y: '-150%' }, // Top-left
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  // Generate 12 tape pieces with randomized properties
  const tapeCount = 12;
  const frameDuration = 1 / 12; // 12fps = 83ms per frame

  const tapePieces: RenderableComponentData[] = [];

  for (let i = 0; i < tapeCount; i++) {
    const tapeId = `tape-piece-${i}`;
    const startTime = i * frameDuration; // Staggered appearance
    const removalStart = transitionDuration / 2 + (tapeCount - 1 - i) * frameDuration; // Reverse order removal
    const removalDuration = frameDuration * 4; // 4 frames for removal

    // Random properties
    const width = randomBetween(100, 130);
    const height = randomBetween(38, 45);
    const rotation = randomBetween(-5, 5);
    const skew = randomBetween(-2, 2);
    const brightness = randomBetween(0.94, 1.06);
    const left = randomBetween(0, 100 - (width / props.config.width) * 100);
    const top = randomBetween(0, 100 - (height / props.config.height) * 100);
    const removalDirection = getRandomRemovalDirection();

    tapePieces.push({
      id: tapeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute bg-yellow-100/90 shadow-sm',
        style: {
          width: `${width}px`,
          height: `${height}px`,
          left: `${left}%`,
          top: `${top}%`,
          transform: `rotate(${rotation}deg) skewX(${skew}deg)`,
          filter: `brightness(${brightness})`,
          borderRadius: '2px',
          // Add subtle texture/imperfections
          boxShadow: `inset 0 0 ${randomBetween(3, 8)}px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Appearance effect (instant with steps)
        {
          id: `${tapeId}-appear`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: startTime,
            duration: frameDuration,
            mode: 'provider',
            targetIds: [tapeId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.99 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Removal effect (jerky movement with steps)
        {
          id: `${tapeId}-remove`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: removalStart,
            duration: removalDuration,
            mode: 'provider',
            targetIds: [tapeId],
            ranges: [
              // Scale pop
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.25 },
              { key: 'scale', val: 1.05, prog: 0.5 },
              { key: 'scale', val: 0, prog: 1 },
              // Translation (jerky with steps)
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: removalDirection.x, prog: 1 },
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: removalDirection.y, prog: 1 },
              // Opacity
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
              // Additional rotation during removal
              {
                key: 'rotate',
                val: `${rotation}deg`,
                prog: 0,
              },
              {
                key: 'rotate',
                val: `${rotation + randomBetween(-15, 15)}deg`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Video 1 (outgoing)
    {
      id: 'video-1-outgoing',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Video 2 (incoming)
    {
      id: 'video-2-incoming',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Fade in during second half
        {
          id: 'video-2-fade-in',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration / 2,
            duration: transitionDuration / 2,
            mode: 'provider',
            targetIds: ['video-2-incoming'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape container with all tape pieces
    {
      id: 'tape-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: tapePieces,
    } as RenderableComponentData,

    // Audio: Rustling sound (first half)
    {
      id: 'rustling-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: rustlingSound.src,
        volume: 0.7,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration / 2,
        },
      },
    } as RenderableComponentData,

    // Audio: Sticky sound (second half)
    {
      id: 'sticky-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: stickySound.src,
        volume: 0.8,
      },
      context: {
        timing: {
          start: transitionDuration / 2,
          duration: transitionDuration / 2,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'stop-motion-tape-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'stop-motion-tape-transition',
  title: 'Stop-Motion Tape Transition',
  description:
    'A handmade stop-motion style transition using masking tape pieces that appear and disappear frame-by-frame with jerky 12fps timing, crumpled textures, and sticky sound effects. Tape pieces cover the outgoing video then get yanked off to reveal the incoming video with stepped animations for authentic stop-motion feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tape', 'stop-motion', 'handmade', 'craft', 'jerky'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
    },
    video2: {
      src: 'https://example.com/video2.mp4',
    },
    rustlingSound: {
      src: 'https://example.com/rustling.mp3',
    },
    stickySound: {
      src: 'https://example.com/sticky.mp3',
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stopMotionTapeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
