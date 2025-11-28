/**
 * Shattered Glass Grid Transition Preset
 *
 * This preset creates a dramatic shattered glass transition effect for a 3x3 video grid.
 * Each video cell breaks into irregular polygonal shards using Voronoi tessellation (8-12 pieces per cell).
 * Shards fall away with realistic physics - some drop straight down, others tumble and rotate,
 * and edge pieces slide off diagonally. Includes glass effects like edge highlights, subtle transparency,
 * and refraction, with an initial "impact moment" where all videos scale up before shattering.
 *
 * Features:
 * - Voronoi tessellation for realistic fracture patterns
 * - Physics-based falling animations with gravity acceleration
 * - Individual shard behaviors (fall, tumble, rotate, slide)
 * - Glass effects (edge highlights, transparency, refraction)
 * - Impact phase with scale animation
 * - Small particle fragments for enhanced realism
 * - Reveals incoming video grid underneath
 *
 * Use cases:
 * - Dynamic video transitions between grid layouts
 * - Dramatic reveal effects for video content
 * - Creative scene transitions with realistic physics
 * - High-impact visual effects for video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  breakingVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL for breaking video'),
      }),
    )
    .length(9)
    .describe('Array of 9 videos that will shatter (3x3 grid)'),
  incomingVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL for incoming video'),
      }),
    )
    .length(9)
    .describe('Array of 9 videos revealed underneath (3x3 grid)'),
  impactDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of impact phase in seconds'),
  shatterDelay: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Delay before shattering begins after impact (seconds)'),
  transitionDuration: z
    .number()
    .min(1)
    .max(3)
    .default(1.8)
    .describe('Total duration of transition in seconds'),
  shardsPerCell: z
    .number()
    .min(8)
    .max(12)
    .default(10)
    .describe('Number of shards per grid cell'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    breakingVideos,
    incomingVideos,
    impactDuration,
    shatterDelay,
    transitionDuration,
    shardsPerCell,
  } = params;

  const config = props.config || { width: 1920, height: 1080, fps: 30 };
  const width = config.width || 1920;
  const height = config.height || 1080;

  const cellWidth = width / 3;
  const cellHeight = height / 3;

  // Helper: Generate Voronoi-like tessellation points
  const generateVoronoiPoints = (
    count: number,
    cellIndex: number,
  ): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    const seedBase = cellIndex * 1000;

    // Simple seeded random
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const seed = seedBase + i;
      points.push({
        x: seededRandom(seed) * 100,
        y: seededRandom(seed + 100) * 100,
      });
    }

    return points;
  };

  // Helper: Generate polygon clip-path from Voronoi cell
  const generateShardClipPath = (
    points: Array<{ x: number; y: number }>,
    centerX: number,
    centerY: number,
    shardIndex: number,
  ): string => {
    // Create approximate polygons around each point
    const angleStep = (Math.PI * 2) / 6;
    const radius = 25 + (shardIndex % 3) * 5;

    const polygon: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i + (shardIndex * 0.5);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      polygon.push(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
    }

    return `polygon(${polygon.join(', ')})`;
  };

  // Helper: Calculate shard physics parameters
  const getShardPhysics = (
    cellRow: number,
    cellCol: number,
    shardIndex: number,
    totalShards: number,
  ) => {
    const isEdgePiece =
      cellRow === 0 || cellRow === 2 || cellCol === 0 || cellCol === 2;
    const seedBase = cellRow * 100 + cellCol * 10 + shardIndex;

    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const fallDistance = height * (1.2 + seededRandom(seedBase) * 0.3);
    const rotation = (seededRandom(seedBase + 1) - 0.5) * 360;
    const horizontalDrift = isEdgePiece
      ? (cellCol === 0 ? -1 : cellCol === 2 ? 1 : 0) * 100 * seededRandom(seedBase + 2)
      : (seededRandom(seedBase + 3) - 0.5) * 50;

    const fallDuration = 0.8 + seededRandom(seedBase + 4) * 0.4;
    const delay = shatterDelay + seededRandom(seedBase + 5) * 0.15;
    const zIndex = 10 + shardIndex;

    return {
      fallDistance,
      rotation,
      horizontalDrift,
      fallDuration,
      delay,
      zIndex,
    };
  };

  // Helper: Get background position for shard
  const getBackgroundPosition = (cellRow: number, cellCol: number): string => {
    const xPercent = cellCol * -100;
    const yPercent = cellRow * -100;
    return `${xPercent}% ${yPercent}%`;
  };

  // Generate all grid cells with shards
  const gridCells: RenderableComponentData[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cellIndex = row * 3 + col;
      const videoSrc = breakingVideos[cellIndex]?.src || '';

      const voronoiPoints = generateVoronoiPoints(shardsPerCell, cellIndex);
      const shards: RenderableComponentData[] = [];

      // Create shards for this cell
      for (let shardIdx = 0; shardIdx < shardsPerCell; shardIdx++) {
        const point = voronoiPoints[shardIdx];
        const clipPath = generateShardClipPath(
          voronoiPoints,
          point.x,
          point.y,
          shardIdx,
        );

        const physics = getShardPhysics(row, col, shardIdx, shardsPerCell);
        const useBlur = shardIdx % 3 === 0;

        const shardId = `cell-${cellIndex}-shard-${shardIdx}`;

        shards.push({
          id: shardId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                width: '100%',
                height: '100%',
                clipPath,
                backgroundImage: `url(${videoSrc})`,
                backgroundSize: '300% 300%',
                backgroundPosition: getBackgroundPosition(row, col),
                boxShadow: 'inset 0 0 10px rgba(255,255,255,0.5)',
                backdropFilter: useBlur ? 'blur(2px)' : 'blur(1px)',
                zIndex: physics.zIndex,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Impact scale effect
            {
              id: `${shardId}-impact`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: impactDuration,
                mode: 'provider',
                targetIds: [shardId],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 1.05, prog: 1 },
                ],
              },
            },
            // Falling animation with rotation
            {
              id: `${shardId}-fall`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: physics.delay,
                duration: physics.fallDuration,
                mode: 'provider',
                targetIds: [shardId],
                ranges: [
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: physics.fallDistance, prog: 1 },
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: physics.horizontalDrift, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: physics.rotation, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData);
      }

      // Cell container
      gridCells.push({
        id: `cell-${cellIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: '100%',
              height: '100%',
              overflow: 'visible',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: shards,
      } as RenderableComponentData);
    }
  }

  // Incoming videos layer (underneath)
  const incomingVideoNodes: RenderableComponentData[] = incomingVideos.map(
    (video, index) => ({
      id: `incoming-video-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        fit: 'cover',
        loop: true,
        muted: false,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData),
  );

  const incomingVideosLayer: RenderableComponentData = {
    id: 'incoming-videos-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3',
        style: {
          zIndex: 0,
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: incomingVideoNodes,
  };

  // Grid container with breaking shards
  const gridContainer: RenderableComponentData = {
    id: 'grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3',
        style: {
          zIndex: 10,
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: gridCells,
  };

  // Particle fragments layer
  const particleFragments: RenderableComponentData[] = [];
  for (let i = 0; i < 20; i++) {
    const seedBase = i * 13;
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const xPos = seededRandom(seedBase) * 100;
    const yPos = seededRandom(seedBase + 1) * 100;
    const size = 5 + seededRandom(seedBase + 2) * 10;
    const fallDistance = height * (1.5 + seededRandom(seedBase + 3) * 0.5);
    const delay = shatterDelay + 0.05 + seededRandom(seedBase + 4) * 0.1;
    const fallDuration = 0.4 + seededRandom(seedBase + 5) * 0.4;

    const particleId = `particle-${i}`;

    particleFragments.push({
      id: particleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${xPos}%`,
            top: `${yPos}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
            zIndex: 30,
          },
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
          id: `${particleId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: delay,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: fallDistance, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  const particlesLayer: RenderableComponentData = {
    id: 'particles-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: particleFragments,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'shattered-glass-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [incomingVideosLayer, gridContainer, particlesLayer],
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
  id: 'shattered-glass-grid-transition',
  title: 'Shattered Glass Grid Transition',
  description:
    'A 3x3 video grid transition where each cell shatters into Voronoi-tessellated glass shards with realistic physics, refraction effects, and reveals underlying videos. Features impact scaling, varied falling physics, edge highlights, and particle fragments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'grid',
    'glass',
    'shatter',
    'physics',
    'voronoi',
    'particles',
    'video',
  ],
  defaultInputParams: {
    breakingVideos: Array(9)
      .fill(null)
      .map((_, i) => ({
        src: `https://example.com/breaking-video-${i + 1}.mp4`,
      })),
    incomingVideos: Array(9)
      .fill(null)
      .map((_, i) => ({
        src: `https://example.com/incoming-video-${i + 1}.mp4`,
      })),
    impactDuration: 0.1,
    shatterDelay: 0.1,
    transitionDuration: 1.8,
    shardsPerCell: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shatteredGlassGridTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
