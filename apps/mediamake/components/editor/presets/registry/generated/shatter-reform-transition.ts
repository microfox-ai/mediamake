/**
 * Shatter and Reform Transition Preset
 *
 * This preset creates a dramatic shatter-to-reform transition effect between two videos.
 * The outgoing video shatters into 25 triangular shards that explosively scatter outward
 * with physics-based motion (rotation, scale, translation). The incoming video's shards
 * then fly in from the edges and magnetically reassemble like a puzzle.
 *
 * Features:
 * - 25 triangular shards with unique clip-path polygons
 * - Explosive shatter with cubic-bezier(0.55, 0.055, 0.675, 0.19)
 * - Magnetic reform with cubic-bezier(0.215, 0.61, 0.355, 1)
 * - Individual rotation, scale, and trajectory per shard
 * - Staggered timing (0.02s per shard) for organic motion
 * - Subtle glow effects (drop-shadow) during movement
 * - Total duration = video1.duration + video2.duration - 2.5s overlap
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
    .describe('Duration of the shatter/reform transition overlap in seconds'),
  shardCount: z
    .number()
    .min(20)
    .max(30)
    .default(25)
    .describe('Number of triangular shards (20-30 recommended)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, shardCount } = params;

  // Helper: Generate triangular clip-path polygons for shards
  const generateShardClipPaths = (count: number): string[] => {
    const clipPaths: string[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellWidth;
      const y = row * cellHeight;

      // Create triangular shards by dividing each cell into two triangles
      const isUpperTriangle = Math.random() > 0.5;
      if (isUpperTriangle) {
        clipPaths.push(
          `polygon(${x}% ${y}%, ${x + cellWidth}% ${y}%, ${x}% ${y + cellHeight}%)`,
        );
      } else {
        clipPaths.push(
          `polygon(${x + cellWidth}% ${y}%, ${x + cellWidth}% ${y + cellHeight}%, ${x}% ${y + cellHeight}%)`,
        );
      }
    }

    return clipPaths;
  };

  // Helper: Generate random trajectory values for shatter effect
  const generateShatterTrajectory = () => {
    return {
      translateX: (Math.random() - 0.5) * 1000, // -500 to 500
      translateY: (Math.random() - 0.5) * 1000,
      rotate: Math.random() * 720, // 0 to 720 degrees
      scale: 0, // Scale to 0
    };
  };

  // Helper: Generate random start positions for reform effect
  const generateReformStartPosition = () => {
    return {
      translateX: (Math.random() - 0.5) * 1000,
      translateY: (Math.random() - 0.5) * 1000,
      rotate: Math.random() * 720,
      scale: 0,
    };
  };

  const clipPaths = generateShardClipPaths(shardCount);

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Shatter phase starts at (video1.duration - transitionDuration)
  const shatterStartTime = video1.duration - transitionDuration;

  // Create outgoing video shards (shatter effect)
  const outgoingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const trajectory = generateShatterTrajectory();
    const staggerDelay = i * 0.02; // 0.02s stagger per shard

    outgoingShards.push({
      id: `shard-out-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full',
        fit: 'cover',
        style: {
          clipPath: clipPaths[i],
          filter: 'drop-shadow(0 0 10px rgba(100, 200, 255, 0.8))',
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
          id: `shatter-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', // Explosive ease
            start: shatterStartTime + staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`shard-out-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: trajectory.translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: trajectory.translateY, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: trajectory.rotate, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: trajectory.scale, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video shards (reform effect)
  const incomingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const startPosition = generateReformStartPosition();
    const staggerDelay = i * 0.02;

    incomingShards.push({
      id: `shard-in-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full',
        fit: 'cover',
        style: {
          clipPath: clipPaths[i],
          filter: 'drop-shadow(0 0 10px rgba(100, 200, 255, 0.8))',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: `reform-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.215, 0.61, 0.355, 1)', // Magnetic ease
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`shard-in-${i}`],
            ranges: [
              { key: 'translateX', val: startPosition.translateX, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: startPosition.translateY, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: startPosition.rotate, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: startPosition.scale, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create shatter layer container
  const shatterLayer: RenderableComponentData = {
    id: 'shatter-layer',
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
    childrenData: outgoingShards,
  };

  // Create reform layer container
  const reformLayer: RenderableComponentData = {
    id: 'reform-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: incomingShards,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'shatter-reform-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [shatterLayer, reformLayer],
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
  id: 'shatter-reform-transition',
  title: 'Shatter and Reform Transition',
  description:
    'A cinematic transition where the outgoing video shatters into triangular shards that scatter outward with explosive physics-based motion, while the incoming video shards fly in from edges and magnetically reassemble. Features individual rotation, scale, trajectory, staggered timing, and glowing edge effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shatter', 'reform', 'physics', 'cinematic', 'video'],
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
    shardCount: 25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shatterReformTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
