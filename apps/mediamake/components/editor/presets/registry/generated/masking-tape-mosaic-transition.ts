/**
 * Masking Tape Mosaic Transition Preset
 *
 * A transition effect where a 10x10 grid of masking tape squares randomly dissolve
 * to reveal incoming video. Tape squares have varied textures and shades, disappear
 * in random clusters with elastic popping animations, and some leave residue marks
 * that fade slowly.
 *
 * Features:
 * - **10x10 Grid**: 100 masking tape squares covering the entire frame
 * - **Texture Variation**: Each square has slightly different shades (opacity 0.7-0.95) and brightness (90-110%)
 * - **Random Cluster Animation**: Squares grouped into 20 clusters of 5, each cluster animates at random times
 * - **Elastic Pop Effect**: Squares scale from 1.0 to 1.2 to 0 with elastic.out easing and random rotation
 * - **Residue Marks**: 30% of squares leave small residue marks that fade over 500ms
 * - **Subtle Blur**: Blur filter applied during scale animation for smooth dissolution
 * - **Incoming Video Reveal**: Incoming video appears beneath as squares disappear
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding texture and organic feel to video cuts
 * - Building creative mosaic-style reveals
 * - Creating memorable transition effects with character
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media (not used in this transition)'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media (covered by tape squares)'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media (revealed as tape dissolves)'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of transition in seconds (default: 2.2s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Seeded random number generator for consistent randomness
  const createSeededRandom = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  const random = createSeededRandom(12345);

  // Calculate BaseLayout duration (no overlap, tape covers entire duration)
  const baseLayoutDuration = transitionDuration;

  // Determine component IDs
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate 10x10 grid of tape squares (100 total)
  const gridSize = 10;
  const totalSquares = gridSize * gridSize;

  // Create random clusters (20 clusters of 5 squares each)
  const numClusters = 20;
  const squaresPerCluster = 5;
  const allSquareIndices = Array.from({ length: totalSquares }, (_, i) => i);
  
  // Shuffle square indices using seeded random
  const shuffleArray = (array: number[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledIndices = shuffleArray(allSquareIndices);
  
  // Create clusters
  const clusters: number[][] = [];
  for (let i = 0; i < numClusters; i++) {
    const clusterStart = i * squaresPerCluster;
    clusters.push(shuffledIndices.slice(clusterStart, clusterStart + squaresPerCluster));
  }

  // Generate random start times for clusters (0-1.8s range)
  const clusterStartTimes = clusters.map(() => random() * 1.8);

  // Determine which squares leave residue (30%)
  const residueSquares = new Set(
    shuffledIndices.slice(0, Math.floor(totalSquares * 0.3))
  );

  // Create tape square components
  const tapeSquares: RenderableComponentData[] = [];
  const residueMarks: RenderableComponentData[] = [];

  for (let i = 0; i < totalSquares; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const squareId = `tape-square-${i}`;

    // Find which cluster this square belongs to
    let clusterIndex = -1;
    for (let c = 0; c < clusters.length; c++) {
      if (clusters[c].includes(i)) {
        clusterIndex = c;
        break;
      }
    }

    // Random properties for tape texture
    const opacity = 0.7 + random() * 0.25; // 0.7-0.95
    const brightness = 90 + random() * 20; // 90-110%
    const rotation = (random() - 0.5) * 90; // ±45deg

    // Cluster animation start time
    const animationStart = clusterIndex >= 0 ? clusterStartTimes[clusterIndex] : 0;

    // Create tape square
    tapeSquares.push({
      id: squareId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-color: #fef3c7;"></div>`,
        className: 'absolute',
        style: {
          left: `${col * 10}%`,
          top: `${row * 10}%`,
          width: '10%',
          height: '10%',
          opacity: opacity,
          filter: `brightness(${brightness}%)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `effect-${squareId}`,
          componentId: 'generic',
          data: {
            type: 'elastic.out',
            start: animationStart,
            duration: 0.3,
            mode: 'provider',
            targetIds: [squareId],
            ranges: [
              // Scale animation: 1.0 -> 1.2 -> 0
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.4 },
              { key: 'scale', val: 0, prog: 1 },
              // Rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
              // Fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Blur during animation
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: 4, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // Create residue mark if this square leaves one
    if (residueSquares.has(i)) {
      const residueId = `residue-${i}`;
      const centerLeft = col * 10 + 5 - 1; // Center horizontally (5% + offset for 2% width)
      const centerTop = row * 10 + 5 - 1; // Center vertically
      const residueStart = animationStart + 0.3; // Start after square disappears

      residueMarks.push({
        id: residueId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-color: #fef3c7;"></div>`,
          className: 'absolute',
          style: {
            left: `${centerLeft}%`,
            top: `${centerTop}%`,
            width: '2%',
            height: '2%',
            opacity: 0.4,
            filter: 'blur(1px)',
          },
        },
        context: {
          timing: {
            start: residueStart,
            duration: 0.5,
          },
        },
        effects: [
          {
            id: `effect-${residueId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0, // Relative to residue start
              duration: 0.5,
              mode: 'provider',
              targetIds: [residueId],
              ranges: [
                { key: 'opacity', val: 0.4, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Build final composition
  const childrenData: RenderableComponentData[] = [
    // Incoming video at z-0 (bottom layer)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    // Tape grid overlay (z-10)
    {
      id: 'tape-grid-overlay',
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
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [...tapeSquares, ...residueMarks],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-mosaic-transition-container',
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
  id: 'masking-tape-mosaic-transition',
  title: 'Masking Tape Mosaic Transition',
  description:
    'A transition effect where a 10x10 grid of masking tape squares randomly dissolve to reveal incoming video. Tape squares have varied textures and shades, disappear in random clusters with elastic popping animations, and some leave residue marks that fade slowly.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'mosaic', 'tape', 'creative', 'texture', 'artistic'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
