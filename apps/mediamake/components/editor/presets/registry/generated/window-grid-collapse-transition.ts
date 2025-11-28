/**
 * Window Grid Collapse Transition Preset
 *
 * A complex 3x3 grid transition where the outgoing video breaks into 9 window pieces
 * that collapse in a spiral pattern (center outward) with scale, rotation, and fade effects,
 * while the incoming video assembles from scattered pieces flying in with reverse spiral
 * timing (corners inward to center).
 *
 * Features:
 * - **3x3 Grid Breakdown**: Outgoing video splits into 9 independent pieces
 * - **Spiral Pattern Collapse**: Center piece animates first, then adjacent, then corners
 * - **Reverse Spiral Assembly**: Incoming video pieces fly in from corners to center
 * - **Independent Timing**: Each piece has staggered animation with 0.1s delays
 * - **Bounce Effect**: Cubic-bezier(0.68, -0.55, 0.265, 1.55) easing for landing
 * - **Dynamic Movement**: Scale, rotation, and translation on each piece
 * - **2.5s Overlap**: Complex choreography period for transition
 *
 * Use cases:
 * - Creative video transitions with grid breakdown effects
 * - Dynamic scene changes with scattered piece animations
 * - Complex multi-piece transitions for engaging content
 * - Choreographed video transitions with independent timing
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
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video that breaks into grid pieces'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video that assembles from scattered pieces'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap period in seconds'),
  gridSize: z
    .number()
    .default(3)
    .describe('Grid size (3 = 3x3 grid, always use 3 for this preset)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each piece animation in seconds'),
});

type PresetParams = z.infer&lt;typeof presetParams&gt;;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput =&gt; {
  const { video1, video2, overlapDuration, staggerDelay } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Define spiral order for 3x3 grid (center first, then adjacent, then corners)
  // Grid positions (row, col): 0=top/left, 1=middle, 2=bottom/right
  const spiralOrder = [
    { row: 1, col: 1, delay: 0 }, // Center (index 4)
    { row: 0, col: 1, delay: 1 }, // Top middle (index 1)
    { row: 1, col: 2, delay: 1 }, // Middle right (index 5)
    { row: 2, col: 1, delay: 1 }, // Bottom middle (index 7)
    { row: 1, col: 0, delay: 1 }, // Middle left (index 3)
    { row: 0, col: 0, delay: 2 }, // Top left (index 0)
    { row: 0, col: 2, delay: 2 }, // Top right (index 2)
    { row: 2, col: 2, delay: 2 }, // Bottom right (index 8)
    { row: 2, col: 0, delay: 2 }, // Bottom left (index 6)
  ];

  // Helper: Generate random value between min and max
  const randomBetween = (min: number, max: number): number =&gt; {
    return min + Math.random() * (max - min);
  };

  // Helper: Get grid position percentages
  const getGridPosition = (row: number, col: number) =&gt; {
    const positions = ['0%', '33.33%', '66.66%'];
    return {
      top: positions[row],
      left: positions[col],
    };
  };

  // Create outgoing video grid pieces
  const outgoingPieces = spiralOrder.map((piece, index) =&gt; {
    const { row, col, delay } = piece;
    const { top, left } = getGridPosition(row, col);
    const pieceId = `out-piece-${row}-${col}`;

    // Collapse effect starts at (video1.duration - overlapDuration) + stagger
    const collapseStart = video1.duration - overlapDuration + delay * staggerDelay;
    const collapseDuration = overlapDuration - delay * staggerDelay;

    // Random rotation for dynamic energy
    const randomRotation = randomBetween(-5, 5);

    return {
      id: pieceId,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        srcDuration: video1.duration,
        startFrom: 0,
        fit: 'cover' as const,
        containerClassName: 'absolute w-1/3 h-1/3',
        style: {
          top,
          left,
          clipPath: `inset(${row * 33.33}% ${(2 - col) * 33.33}% ${(2 - row) * 33.33}% ${col * 33.33}%)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: `collapse-${pieceId}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: collapseStart,
            duration: collapseDuration,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: randomRotation, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create incoming video grid pieces (reverse spiral: corners first, then adjacent, then center)
  const reverseSpiralOrder = [...spiralOrder].reverse();

  const incomingPieces = reverseSpiralOrder.map((piece, index) =&gt; {
    const { row, col } = piece;
    const { top, left } = getGridPosition(row, col);
    const pieceId = `in-piece-${row}-${col}`;

    // Assembly starts at beginning of incoming video timeline
    // Reverse delay: corners = 0, adjacent = 0.1s, center = 0.2s
    const reverseDelay = reverseSpiralOrder.length - 1 - index;
    const assemblyStart = reverseDelay * staggerDelay;
    const assemblyDuration = overlapDuration - assemblyStart;

    // Random initial offset for scattered pieces
    const randomX = randomBetween(-200, 200);
    const randomY = randomBetween(-200, 200);
    const randomRotation = randomBetween(-5, 5);

    return {
      id: pieceId,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        srcDuration: video2.duration,
        startFrom: 0,
        fit: 'cover' as const,
        containerClassName: 'absolute w-1/3 h-1/3',
        style: {
          top,
          left,
          clipPath: `inset(${row * 33.33}% ${(2 - col) * 33.33}% ${(2 - row) * 33.33}% ${col * 33.33}%)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video2.duration,
        },
      },
      effects: [
        {
          id: `assembly-${pieceId}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: assemblyStart,
            duration: assemblyDuration,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'translateX', val: `${randomX}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: `${randomY}px`, prog: 0 },
              { key: 'translateY', val: '0px', prog: 1 },
              { key: 'rotate', val: randomRotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing grid container (shows from 0 to video1.duration)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: outgoingPieces,
  };

  // Incoming grid container (shows from video1.duration - overlapDuration)
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: incomingPieces,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'window-grid-collapse-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
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
  id: 'window-grid-collapse-transition',
  title: 'Window Grid Collapse Transition',
  description:
    'A complex 3x3 grid transition where the outgoing video breaks into 9 window pieces that collapse in a spiral pattern (center outward) with scale, rotation, and fade effects, while the incoming video assembles from scattered pieces flying in with reverse spiral timing (corners inward to center). Features bounce easing using cubic-bezier(0.68, -0.55, 0.265, 1.55) and 2.5s overlap period for the choreographed animation sequence.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'grid', 'collapse', 'spiral', 'video', 'complex'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 2.5,
    gridSize: 3,
    staggerDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const windowGridCollapseTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};