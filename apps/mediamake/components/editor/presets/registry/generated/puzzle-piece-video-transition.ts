/**
 * Puzzle Piece Slide-In Transition Preset
 *
 * This preset creates a dynamic puzzle piece transition where the incoming video
 * slides in as interlocking puzzle pieces from different directions while the
 * outgoing video breaks apart into puzzle pieces that slide out in opposite directions.
 *
 * Features:
 * - **4-6 Puzzle Piece Segments**: Independently moving puzzle pieces with staggered timing
 * - **3D Rotation Effect**: Subtle rotateY animation during slide transitions
 * - **1.5 Second Overlap**: Both videos visible during transition period
 * - **Bounce Easing**: Incoming pieces lock into place with spring physics
 * - **Shadow Effects**: Drop shadow for depth perception
 * - **Clip-Path Shapes**: Custom polygon shapes for interlocking puzzle appearance
 * - **Transform Animations**: translateX, translateY, and rotateY for 3D puzzle effect
 *
 * Use cases:
 * - Creating engaging transitions between video segments
 * - Building dynamic video montages with puzzle-like reveals
 * - Adding visual interest to video presentations
 * - Implementing creative scene transitions with depth
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
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

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    video1.duration + video2.duration - overlapDuration;

  // Helper: Create puzzle piece clip-path polygons
  const createClipPaths = () => {
    return {
      piece1: 'polygon(0 0, 100% 0, 100% 85%, 80% 100%, 0 100%)', // Top-left with tab
      piece2: 'polygon(0 0, 100% 0, 100% 100%, 20% 100%, 0 85%)', // Top-right with notch
      piece3: 'polygon(0 15%, 80% 0, 100% 0, 100% 85%, 80% 100%, 0 100%)', // Mid-left
      piece4: 'polygon(0 0, 20% 0, 0 15%, 0 100%, 20% 100%, 100% 85%, 100% 0)', // Mid-right
      piece5: 'polygon(0 0, 80% 0, 100% 15%, 100% 100%, 0 100%)', // Bottom-left
      piece6: 'polygon(0 15%, 20% 0, 100% 0, 100% 100%, 0 100%)', // Bottom-right
    };
  };

  const clipPaths = createClipPaths();

  // Outgoing video pieces configuration
  const outgoingPieces = [
    {
      id: 'outgoing-piece-1',
      className: 'absolute top-0 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece1,
      translateKey: 'translateX',
      translateValue: -150,
      rotateValue: 15,
      startDelay: 0,
      duration: 1.5,
    },
    {
      id: 'outgoing-piece-2',
      className: 'absolute top-0 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece2,
      translateKey: 'translateX',
      translateValue: 150,
      rotateValue: -15,
      startDelay: 0.1,
      duration: 1.4,
    },
    {
      id: 'outgoing-piece-3',
      className: 'absolute top-1/3 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece3,
      translateKey: 'translateX',
      translateValue: -150,
      rotateValue: 12,
      startDelay: 0.2,
      duration: 1.3,
    },
    {
      id: 'outgoing-piece-4',
      className: 'absolute top-1/3 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece4,
      translateKey: 'translateX',
      translateValue: 150,
      rotateValue: -12,
      startDelay: 0.15,
      duration: 1.35,
    },
    {
      id: 'outgoing-piece-5',
      className: 'absolute bottom-0 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece5,
      translateKey: 'translateY',
      translateValue: 150,
      rotateValue: 10,
      startDelay: 0.25,
      duration: 1.25,
    },
    {
      id: 'outgoing-piece-6',
      className: 'absolute bottom-0 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece6,
      translateKey: 'translateY',
      translateValue: 150,
      rotateValue: -10,
      startDelay: 0.3,
      duration: 1.2,
    },
  ];

  // Incoming video pieces configuration (opposite directions)
  const incomingPieces = [
    {
      id: 'incoming-piece-1',
      className: 'absolute top-0 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece1,
      translateKey: 'translateX',
      translateFromValue: -150,
      rotateFromValue: -15,
      startDelay: 0,
      duration: 1.5,
    },
    {
      id: 'incoming-piece-2',
      className: 'absolute top-0 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece2,
      translateKey: 'translateX',
      translateFromValue: 150,
      rotateFromValue: 15,
      startDelay: 0.1,
      duration: 1.4,
    },
    {
      id: 'incoming-piece-3',
      className: 'absolute top-1/3 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece3,
      translateKey: 'translateX',
      translateFromValue: -150,
      rotateFromValue: -12,
      startDelay: 0.2,
      duration: 1.3,
    },
    {
      id: 'incoming-piece-4',
      className: 'absolute top-1/3 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece4,
      translateKey: 'translateX',
      translateFromValue: 150,
      rotateFromValue: 12,
      startDelay: 0.15,
      duration: 1.35,
    },
    {
      id: 'incoming-piece-5',
      className: 'absolute bottom-0 left-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece5,
      translateKey: 'translateY',
      translateFromValue: 150,
      rotateFromValue: -10,
      startDelay: 0.25,
      duration: 1.25,
    },
    {
      id: 'incoming-piece-6',
      className: 'absolute bottom-0 right-0 w-1/2 h-1/3',
      clipPath: clipPaths.piece6,
      translateKey: 'translateY',
      translateFromValue: 150,
      rotateFromValue: 10,
      startDelay: 0.3,
      duration: 1.2,
    },
  ];

  // Build outgoing video pieces
  const outgoingChildren: RenderableComponentData[] = outgoingPieces.map(
    (piece) => ({
      id: piece.id,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        startFrom: video1.duration - overlapDuration,
        endAt: video1.duration,
        className: piece.className,
        style: {
          clipPath: piece.clipPath,
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${piece.id}-slide-effect`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [piece.id],
            type: 'ease-in',
            start: piece.startDelay,
            duration: piece.duration,
            ranges: [
              { key: piece.translateKey, val: 0, prog: 0 },
              { key: piece.translateKey, val: piece.translateValue, prog: 1 },
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: piece.rotateValue, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Build incoming video pieces
  const incomingChildren: RenderableComponentData[] = incomingPieces.map(
    (piece) => ({
      id: piece.id,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        startFrom: 0,
        endAt: overlapDuration,
        className: piece.className,
        style: {
          clipPath: piece.clipPath,
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${piece.id}-slide-effect`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [piece.id],
            type: 'spring',
            start: piece.startDelay,
            duration: piece.duration,
            ranges: [
              {
                key: piece.translateKey,
                val: piece.translateFromValue,
                prog: 0,
              },
              { key: piece.translateKey, val: 0, prog: 1 },
              { key: 'rotateY', val: piece.rotateFromValue, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Outgoing container (z-0)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: outgoingChildren,
  };

  // Incoming container (z-10)
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: incomingChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'puzzle-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'puzzle-piece-video-transition',
  title: 'Puzzle Piece Video Transition',
  description:
    'A dynamic transition preset where incoming video slides in as interlocking puzzle pieces from different directions while outgoing video breaks apart into puzzle pieces sliding out. Features 3D rotation effects, staggered timing, shadows for depth, and bounce easing on incoming pieces during a 1.5 second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'puzzle', 'video', '3d', 'slide', 'dynamic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const puzzlePieceVideoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
