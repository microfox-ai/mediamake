/**
 * Jigsaw Puzzle Assembly Transition Preset
 *
 * This preset creates a jigsaw puzzle assembly transition where the incoming video
 * assembles piece by piece like solving a puzzle. Pieces float in from random positions
 * outside the frame, rotating and finding their correct positions. The outgoing video
 * dissolves into puzzle piece shapes that drift away with physics-like motion.
 *
 * Features:
 * - **Complex Puzzle Shapes**: SVG clip-paths with curved edges and interlocking tabs
 * - **Physics-like Motion**: Pieces float in/out with rotation and bezier curves
 * - **3D Puzzle Effect**: Drop shadows and highlights for depth
 * - **Satisfying Snap**: Spring-like animation when pieces lock into place
 * - **Staggered Timing**: 100ms stagger between pieces for organic assembly
 * - **2.5 Second Overlap**: Smooth transition period between videos
 *
 * Use cases:
 * - Creative video transitions with puzzle assembly effect
 * - Revealing content piece by piece
 * - Educational content showing "putting pieces together"
 * - Dynamic intros/outros with puzzle metaphor
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the puzzle transition overlap in seconds'),
  pieceCount: z
    .number()
    .min(4)
    .max(20)
    .default(12)
    .describe('Number of puzzle pieces (4-20)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each piece animation in seconds'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of drop shadows (0-1)'),
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
    pieceCount,
    staggerDelay,
    shadowIntensity,
  } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to generate random off-screen starting positions
  const generateRandomStartPosition = (index: number) => {
    const positions = [
      { x: 200, y: -180 },
      { x: -180, y: 150 },
      { x: 220, y: 200 },
      { x: -200, y: -150 },
      { x: 250, y: 0 },
      { x: -250, y: 100 },
      { x: 180, y: -200 },
      { x: -150, y: 220 },
      { x: 300, y: -100 },
      { x: -300, y: 50 },
      { x: 200, y: 250 },
      { x: -220, y: -180 },
    ];
    return positions[index % positions.length];
  };

  // Helper function to generate random outgoing directions
  const generateRandomEndPosition = (index: number) => {
    const positions = [
      { x: -150, y: -120 },
      { x: 180, y: 140 },
      { x: -200, y: 180 },
      { x: 220, y: -160 },
      { x: -180, y: 100 },
      { x: 200, y: -200 },
      { x: -250, y: 150 },
      { x: 250, y: -80 },
      { x: -160, y: 220 },
      { x: 180, y: -180 },
      { x: -220, y: 120 },
      { x: 240, y: 200 },
    ];
    return positions[index % positions.length];
  };

  // Helper function to generate random rotation values
  const generateRandomRotation = (index: number, isStart: boolean) => {
    const rotations = [60, -55, 70, -65, 50, -75, 65, -60, 55, -70, 75, -50];
    return isStart ? rotations[index % rotations.length] : rotations[(index + 6) % rotations.length];
  };

  // Helper function to generate puzzle piece SVG paths
  const generatePuzzlePiecePath = (index: number, cols: number, rows: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const pieceWidth = 100 / cols;
    const pieceHeight = 100 / rows;
    const x = col * pieceWidth;
    const y = row * pieceHeight;

    // Tab settings
    const tabSize = 3;
    const tabDepth = 2.5;
    const hasTopTab = row > 0 && (index % 3 === 0);
    const hasRightTab = col < cols - 1 && (index % 3 === 1);
    const hasBottomTab = row < rows - 1 && (index % 3 === 2);
    const hasLeftTab = col > 0 && (index % 3 === 0);

    let path = `M ${x},${y}`;

    // Top edge
    if (hasTopTab) {
      path += ` L ${x + pieceWidth / 2 - tabSize},${y}`;
      path += ` Q ${x + pieceWidth / 2 - tabSize},${y - tabDepth} ${x + pieceWidth / 2},${y - tabDepth}`;
      path += ` Q ${x + pieceWidth / 2 + tabSize},${y - tabDepth} ${x + pieceWidth / 2 + tabSize},${y}`;
    }
    path += ` L ${x + pieceWidth},${y}`;

    // Right edge
    if (hasRightTab) {
      path += ` L ${x + pieceWidth},${y + pieceHeight / 2 - tabSize}`;
      path += ` Q ${x + pieceWidth + tabDepth},${y + pieceHeight / 2 - tabSize} ${x + pieceWidth + tabDepth},${y + pieceHeight / 2}`;
      path += ` Q ${x + pieceWidth + tabDepth},${y + pieceHeight / 2 + tabSize} ${x + pieceWidth},${y + pieceHeight / 2 + tabSize}`;
    }
    path += ` L ${x + pieceWidth},${y + pieceHeight}`;

    // Bottom edge
    if (hasBottomTab) {
      path += ` L ${x + pieceWidth / 2 + tabSize},${y + pieceHeight}`;
      path += ` Q ${x + pieceWidth / 2 + tabSize},${y + pieceHeight + tabDepth} ${x + pieceWidth / 2},${y + pieceHeight + tabDepth}`;
      path += ` Q ${x + pieceWidth / 2 - tabSize},${y + pieceHeight + tabDepth} ${x + pieceWidth / 2 - tabSize},${y + pieceHeight}`;
    }
    path += ` L ${x},${y + pieceHeight}`;

    // Left edge
    if (hasLeftTab) {
      path += ` L ${x},${y + pieceHeight / 2 + tabSize}`;
      path += ` Q ${x - tabDepth},${y + pieceHeight / 2 + tabSize} ${x - tabDepth},${y + pieceHeight / 2}`;
      path += ` Q ${x - tabDepth},${y + pieceHeight / 2 - tabSize} ${x},${y + pieceHeight / 2 - tabSize}`;
    }
    path += ` Z`;

    return path;
  };

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(pieceCount));
  const rows = Math.ceil(pieceCount / cols);

  // Generate SVG definitions for puzzle pieces
  const svgDefs = Array.from({ length: pieceCount }, (_, i) => {
    const path = generatePuzzlePiecePath(i, cols, rows);
    return `
      <clipPath id="puzzle-piece-${i}" clipPathUnits="objectBoundingBox">
        <path d="${path}" transform="scale(0.01, 0.01)" />
      </clipPath>
    `;
  }).join('');

  // SVG definitions container
  const svgDefsContainer: RenderableComponentData = {
    id: 'puzzle-svg-defs',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg style="position: absolute; width: 0; height: 0;"><defs>${svgDefs}</defs></svg>`,
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
  };

  // Generate outgoing puzzle pieces
  const outgoingPieces: RenderableComponentData[] = Array.from({ length: pieceCount }, (_, i) => {
    const endPos = generateRandomEndPosition(i);
    const endRotation = generateRandomRotation(i, false);
    const pieceDelay = i * staggerDelay;

    return {
      id: `outgoing-piece-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        style: {
          clipPath: `url(#puzzle-piece-${i})`,
          filter: `drop-shadow(0px ${8 * shadowIntensity}px ${16 * shadowIntensity}px rgba(0,0,0,${0.5 * shadowIntensity}))`,
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
          id: `outgoing-transform-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            easingValues: [0.68, -0.55, 0.265, 1.55],
            start: video1.duration - transitionDuration + pieceDelay,
            duration: transitionDuration - pieceDelay,
            mode: 'provider',
            targetIds: [`outgoing-piece-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: endPos.x, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: endPos.y, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: endRotation, prog: 1 },
            ],
          },
        },
        {
          id: `outgoing-opacity-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: video1.duration - transitionDuration + pieceDelay + 0.5,
            duration: Math.max(0.5, transitionDuration - pieceDelay - 0.5),
            mode: 'provider',
            targetIds: [`outgoing-piece-${i}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  });

  // Generate incoming puzzle pieces
  const incomingPieces: RenderableComponentData[] = Array.from({ length: pieceCount }, (_, i) => {
    const startPos = generateRandomStartPosition(i);
    const startRotation = generateRandomRotation(i, true);
    const pieceDelay = i * staggerDelay;
    const animDuration = transitionDuration - pieceDelay - 0.2;

    return {
      id: `incoming-piece-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        style: {
          clipPath: `url(#puzzle-piece-${i})`,
          filter: `drop-shadow(0px ${8 * shadowIntensity}px ${16 * shadowIntensity}px rgba(0,0,0,${0.5 * shadowIntensity}))`,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration + pieceDelay,
          duration: transitionDuration - pieceDelay + video2.duration,
        },
      },
      effects: [
        {
          id: `incoming-transform-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            easingValues: [0.68, -0.55, 0.265, 1.55],
            start: 0,
            duration: animDuration,
            mode: 'provider',
            targetIds: [`incoming-piece-${i}`],
            ranges: [
              { key: 'translateX', val: startPos.x, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: startPos.y, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: startRotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `incoming-opacity-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [`incoming-piece-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: `incoming-snap-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            easingValues: [0.68, -0.55, 0.265, 1.55],
            start: animDuration - 0.3,
            duration: 0.3,
            mode: 'provider',
            targetIds: [`incoming-piece-${i}`],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.05, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'jigsaw-puzzle-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      svgDefsContainer,
      ...outgoingPieces,
      ...incomingPieces,
    ] as RenderableComponentData[],
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
  id: 'jigsaw-puzzle-transition',
  title: 'Jigsaw Puzzle Assembly Transition',
  description:
    'A transition effect where the incoming video assembles piece by piece like solving a jigsaw puzzle. Puzzle pieces float in from random off-screen positions, rotating and finding their correct positions with physics-like motion. The outgoing video dissolves into puzzle piece shapes that drift away. Features interlocking curved puzzle edges, 3D-style shadows, and satisfying snap animations when pieces lock into place.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'puzzle', 'jigsaw', 'assembly', 'creative'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.5,
    pieceCount: 12,
    staggerDelay: 0.1,
    shadowIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const jigsawPuzzleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
