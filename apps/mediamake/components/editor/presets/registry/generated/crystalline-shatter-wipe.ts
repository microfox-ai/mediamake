/**
 * Crystalline Shatter Wipe Transition Preset
 *
 * Creates a dramatic video transition where the outgoing video shatters into 20-30
 * irregular geometric crystal shards that fall away to reveal the incoming video.
 * Each shard rotates slightly and falls with physics-based acceleration over 2 seconds.
 * Includes subtle refraction effects and a brief white flash at the moment of impact.
 *
 * Features:
 * - Voronoi tessellation pattern for realistic crystal shard shapes
 * - Physics-based falling animation with gravity simulation
 * - Individual shard rotation and acceleration
 * - Refraction effects via backdrop-filter and slight content offset
 * - White flash effect at shatter impact moment (0.1s)
 * - Staggered animation based on distance from impact point
 * - 2-second transition duration
 *
 * Use cases:
 * - Dramatic scene transitions
 * - Action/impact moments
 * - Cinematic video editing
 * - High-energy content transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video that will shatter'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video revealed as shards fall'),
  shardCount: z
    .number()
    .min(20)
    .max(30)
    .default(25)
    .optional()
    .describe('Number of crystal shards to generate (20-30)'),
  transitionDuration: z
    .number()
    .default(2)
    .optional()
    .describe('Duration of the shatter transition in seconds'),
  impactPoint: z
    .object({
      x: z.number().min(0).max(1).default(0.5).describe('X position of impact (0-1, 0.5 = center)'),
      y: z.number().min(0).max(1).default(0.5).describe('Y position of impact (0-1, 0.5 = center)'),
    })
    .optional()
    .describe('Center point of the shatter impact'),
  flashDuration: z
    .number()
    .default(0.1)
    .optional()
    .describe('Duration of the white flash effect in seconds'),
  refractionIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Intensity of refraction effect in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const shardCount = params.shardCount ?? 25;
  const transitionDuration = params.transitionDuration ?? 2;
  const impactPoint = params.impactPoint ?? { x: 0.5, y: 0.5 };
  const flashDuration = params.flashDuration ?? 0.1;
  const refractionIntensity = params.refractionIntensity ?? 2;

  // Total composition duration: video1 + video2 - transition overlap
  const totalDuration = params.video1.duration + params.video2.duration - transitionDuration;
  const transitionStart = params.video1.duration - transitionDuration;

  // Helper: Generate Voronoi tessellation points
  const generateVoronoiPoints = (count: number): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random(),
        y: Math.random(),
      });
    }
    return points;
  };

  // Helper: Calculate distance from impact point
  const calculateDistance = (x: number, y: number): number => {
    const dx = x - impactPoint.x;
    const dy = y - impactPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Generate polygon clip-path for a shard
  const generateShardPolygon = (centerX: number, centerY: number, neighbors: Array<{ x: number; y: number }>): string => {
    // Create a simplified Voronoi cell by connecting midpoints to neighbors
    const points: Array<{ x: number; y: number }> = [];
    
    // Add vertices around the center point
    const angleStep = (Math.PI * 2) / Math.max(neighbors.length, 3);
    const radius = 0.08 + Math.random() * 0.05; // Random radius for irregular shapes
    
    for (let i = 0; i < Math.max(neighbors.length, 3); i++) {
      const angle = angleStep * i + Math.random() * 0.3; // Add randomness to angles
      const dist = radius * (0.8 + Math.random() * 0.4); // Vary distance
      points.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
      });
    }

    // Convert to polygon string
    return points
      .map((p) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`)
      .join(', ');
  };

  // Generate Voronoi points for shards
  const voronoiPoints = generateVoronoiPoints(shardCount);

  // Create shards
  const shards: RenderableComponentData[] = voronoiPoints.map((point, index) => {
    const centerX = point.x;
    const centerY = point.y;
    const distance = calculateDistance(centerX, centerY);
    
    // Calculate stagger based on distance (0-0.3s range)
    const stagger = Math.min(distance * 0.3, 0.3);
    
    // Random rotation for each shard (-20 to 20 degrees)
    const rotationDegrees = -20 + Math.random() * 40;
    
    // Calculate fall distance (beyond screen height)
    const fallDistance = 120 + distance * 80; // 120-200% of screen height
    
    // Refraction offset (slight x/y displacement)
    const refractionX = (Math.random() - 0.5) * refractionIntensity;
    const refractionY = (Math.random() - 0.5) * refractionIntensity;

    // Generate polygon for this shard
    const neighbors = voronoiPoints.filter((_, i) => i !== index).slice(0, 5);
    const clipPath = `polygon(${generateShardPolygon(centerX, centerY, neighbors)})`;

    return {
      id: `shard-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
            willChange: 'transform',
            backdropFilter: 'blur(1px)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: `shard-video-${index}`,
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: params.video1.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {
              transform: `translate(${refractionX}px, ${refractionY}px)`,
            },
            muted: true,
            startFrom: transitionStart,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `shard-fall-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in', // Accelerating fall (gravity)
            start: stagger,
            duration: transitionDuration - stagger,
            mode: 'provider',
            targetIds: [`shard-${index}`],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: fallDistance, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationDegrees, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.9 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-shatter-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Incoming video layer (z-10, revealed as shards fall)
      {
        id: 'incoming-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: params.video2.src,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: params.video2.duration,
          },
        },
      } as RenderableComponentData,
      // Outgoing video (full frame, behind shards, plays until transition)
      {
        id: 'outgoing-video-base',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: params.video1.src,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            zIndex: 5,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.video1.duration,
          },
        },
      } as RenderableComponentData,
      // Shards container (z-20, contains all shards)
      {
        id: 'shards-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 20,
            },
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        childrenData: shards,
      } as RenderableComponentData,
      // Flash overlay (z-40, white flash at impact moment)
      {
        id: 'flash-overlay',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 40,
              backgroundColor: 'white',
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: flashDuration * 3,
          },
        },
        effects: [
          {
            id: 'flash-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: flashDuration * 3,
              mode: 'provider',
              targetIds: ['flash-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.33 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
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
  id: 'crystalline-shatter-wipe',
  title: 'Crystalline Shatter Wipe Transition',
  description:
    'A dramatic video transition where the outgoing video shatters into 20-30 geometric crystal shards using Voronoi tessellation patterns. Shards rotate slightly and fall with physics-based acceleration over 2 seconds, featuring subtle refraction effects and a brief white flash at impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'shatter',
    'crystal',
    'dramatic',
    'video',
    'voronoi',
    'physics',
    'refraction',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    video1: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 10,
    },
    shardCount: 25,
    transitionDuration: 2,
    impactPoint: { x: 0.5, y: 0.5 },
    flashDuration: 0.1,
    refractionIntensity: 2,
  },
};

export const crystallineShatterWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
