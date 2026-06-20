/**
 * Puzzle Reveal Transition Preset
 *
 * Creates a dynamic puzzle reveal transition where the incoming video is revealed through
 * animated puzzle piece cutouts that grow from the center outward. The effect creates a
 * 3x3 grid of puzzle pieces that appear in a ripple pattern:
 * - Center piece appears first and grows from 80% to 100% scale
 * - Adjacent pieces (top, left, right, bottom) appear next with 200ms stagger
 * - Corner pieces appear last with another 200ms stagger
 * 
 * Features:
 * - 2 second overlap between outgoing and incoming videos
 * - Sequential piece animations with 200ms stagger
 * - Center-to-edge ripple effect
 * - Subtle glow effect on piece edges using box-shadow
 * - Light blur on outgoing video during transition (0px to 4px)
 * - Outgoing video remains static underneath
 * - Incoming video pieces build on top with z-index: 20
 *
 * Use cases:
 * - Dynamic video transitions with puzzle-like reveals
 * - Creative scene changes with geometric patterns
 * - Building suspense through progressive reveals
 * - Modern, eye-catching video editing effects
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(2).describe('Duration of the transition overlap in seconds (default: 2s)'),
  pieceStagger: z.number().default(0.2).describe('Time stagger between piece animations in seconds (default: 200ms)'),
  glowIntensity: z.number().default(20).describe('Intensity of the glow effect on piece edges in pixels (default: 20px)'),
  blurAmount: z.number().default(4).describe('Maximum blur amount on outgoing video during transition in pixels (default: 4px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, pieceStagger, glowIntensity, blurAmount } = params;

  // Calculate total duration (sum of both videos minus overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when incoming puzzle container starts (overlap begins)
  const incomingStart = video1.duration - transitionDuration;

  // Create puzzle pieces configuration
  // 3x3 grid layout with center-outward reveal pattern
  const pieces = [
    // Center piece (appears first at 0s relative to incoming container)
    { row: 1, col: 1, id: 'center', order: 0, relativeStart: 0 },
    // Adjacent pieces (appear at 0.2s)
    { row: 0, col: 1, id: 'top', order: 1, relativeStart: pieceStagger },
    { row: 1, col: 0, id: 'left', order: 1, relativeStart: pieceStagger },
    { row: 2, col: 1, id: 'right', order: 1, relativeStart: pieceStagger },
    { row: 1, col: 2, id: 'bottom', order: 1, relativeStart: pieceStagger },
    // Corner pieces (appear at 0.4s)
    { row: 0, col: 0, id: 'topleft', order: 2, relativeStart: pieceStagger * 2 },
    { row: 2, col: 0, id: 'topright', order: 2, relativeStart: pieceStagger * 2 },
    { row: 0, col: 2, id: 'bottomleft', order: 2, relativeStart: pieceStagger * 2 },
    { row: 2, col: 2, id: 'bottomright', order: 2, relativeStart: pieceStagger * 2 },
  ];

  // Create puzzle piece components
  const puzzlePieces: RenderableComponentData[] = pieces.map((piece) => {
    const pieceAnimationDuration = 0.4; // Each piece takes 0.4s to animate in
    const pieceDuration = video2.duration + transitionDuration - piece.relativeStart;

    // Calculate video offset position for this piece in the 3x3 grid
    const videoLeft = `-${piece.col * 100}%`;
    const videoTop = `-${piece.row * 100}%`;

    return {
      id: `puzzle-piece-${piece.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            boxShadow: `0 0 ${glowIntensity}px rgba(255, 255, 255, 0.6)`,
          },
        },
      },
      context: {
        timing: {
          start: piece.relativeStart,
          duration: pieceDuration,
        },
      },
      effects: [
        {
          id: `piece-${piece.id}-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: pieceAnimationDuration,
            mode: 'provider',
            targetIds: [`puzzle-piece-${piece.id}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `piece-${piece.id}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'absolute w-[300%] h-[300%]',
            style: {
              left: videoLeft,
              top: videoTop,
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: pieceDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (static background with blur effect during transition)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: incomingStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${blurAmount}px)`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming puzzle container (3x3 grid with z-index: 20)
    {
      id: 'incoming-puzzle-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 grid grid-cols-3 grid-rows-3',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: puzzlePieces,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'puzzle-reveal-transition-container',
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
  id: 'puzzle-reveal-transition',
  title: 'Puzzle Reveal Transition',
  description: 'Dynamic puzzle reveal transition where the incoming video is revealed through animated puzzle piece cutouts that grow from the center outward. Features a 2 second overlap with sequential piece animations every 200ms, subtle glow effects on piece edges, and a light blur on the outgoing video during transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'puzzle', 'reveal', 'video', 'animated', 'geometric'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    pieceStagger: 0.2,
    glowIntensity: 20,
    blurAmount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const puzzleRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};