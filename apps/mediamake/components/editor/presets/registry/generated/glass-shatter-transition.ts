/**
 * Glass Shatter Transition Preset
 *
 * This preset creates a glass shatter transition effect where the outgoing video
 * shatters into crystalline shards that scatter outward, then reforms as a mosaic
 * that reveals the incoming video.
 *
 * Features:
 * - **2-second overlap period**: Shatter effect (0-1s), mosaic reformation (1-2s)
 * - **12-16 duplicate layers**: Each with unique clip-path polygons for shard shapes
 * - **Staggered timing**: Individual shard animations with slight timing variations
 * - **Transform effects**: Scale, rotate, translateX/Y for scatter positions
 * - **Blur transitions**: Adds glass-like quality to shards
 * - **Inverse reformation**: Incoming video pieces animate from scattered to complete
 *
 * Use cases:
 * - Dramatic video transitions with shatter/reformation effects
 * - Creating crystalline visual breaks between content
 * - Adding cinematic glass-breaking transitions
 * - Building dynamic mosaic-reveal effects
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
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds (shatter + reform)'),
  shardCount: z
    .number()
    .min(12)
    .max(16)
    .default(12)
    .describe('Number of shards to create (12-16)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, shardCount } = params;

  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Timing for shatter (0-1s of overlap) and reform (1-2s of overlap)
  const shatterStart = video1.duration - overlapDuration;
  const shatterDuration = overlapDuration / 2; // First half (0-1s)
  const reformStart = overlapDuration / 2; // Second half starts at 1s relative to incoming video
  const reformDuration = overlapDuration / 2;

  // Helper: Generate triangular clip-path polygons for shards
  const generateShardClipPaths = (count: number): string[] => {
    const clipPaths: string[] = [];
    
    // Create a grid-like pattern of triangular shards
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Calculate grid positions as percentages
      const x1 = (col / cols) * 100;
      const x2 = ((col + 1) / cols) * 100;
      const y1 = (row / rows) * 100;
      const y2 = ((row + 1) / rows) * 100;
      const xMid = (x1 + x2) / 2;
      const yMid = (y1 + y2) / 2;
      
      // Create triangular polygon (alternating pattern)
      if ((row + col) % 2 === 0) {
        // Upper-left triangle
        clipPaths.push(`polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${xMid}% ${yMid}%)`);
      } else {
        // Lower-right triangle
        clipPaths.push(`polygon(${x2}% ${y2}%, ${x1}% ${y2}%, ${xMid}% ${yMid}%)`);
      }
    }
    
    return clipPaths;
  };

  // Helper: Generate scatter positions (translateX, translateY)
  const generateScatterPositions = (count: number): Array<{ x: number; y: number }> => {
    const positions: Array<{ x: number; y: number }> = [];
    const centerX = 0;
    const centerY = 0;
    
    for (let i = 0; i < count; i++) {
      // Scatter in circular pattern with randomization
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 150 + Math.random() * 100;
      
      positions.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    }
    
    return positions;
  };

  // Helper: Generate rotation values
  const generateRotations = (count: number): number[] => {
    return Array.from({ length: count }, () => 
      Math.random() > 0.5 
        ? Math.random() * 60 + 15  // Positive rotation 15-75 degrees
        : -(Math.random() * 60 + 15) // Negative rotation -75 to -15 degrees
    );
  };

  // Helper: Generate staggered timing offsets (0 to 0.15s variations)
  const generateTimingOffsets = (count: number): number[] => {
    return Array.from({ length: count }, () => Math.random() * 0.15);
  };

  const clipPaths = generateShardClipPaths(shardCount);
  const scatterPositions = generateScatterPositions(shardCount);
  const rotations = generateRotations(shardCount);
  const timingOffsets = generateTimingOffsets(shardCount);

  // Create outgoing shards
  const outgoingShards: RenderableComponentData[] = Array.from(
    { length: shardCount },
    (_, index) => {
      const shardId = `outgoing-shard-${index + 1}`;
      const position = scatterPositions[index];
      const rotation = rotations[index];
      const offset = timingOffsets[index];

      return {
        id: shardId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'absolute inset-0 object-cover',
          style: {
            clipPath: clipPaths[index],
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
            id: `shatter-effect-${index + 1}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [shardId],
              type: 'ease-out',
              start: shatterStart - offset,
              duration: shatterDuration,
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.3, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotation, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: position.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: position.y, prog: 1 },
                { key: 'blur', val: 0, prog: 0 },
                { key: 'blur', val: 2, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Create incoming pieces (inverse of outgoing shards)
  const incomingPieces: RenderableComponentData[] = Array.from(
    { length: shardCount },
    (_, index) => {
      const pieceId = `incoming-piece-${index + 1}`;
      const position = scatterPositions[index];
      const rotation = rotations[index];
      const offset = timingOffsets[index];

      return {
        id: pieceId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'absolute inset-0 object-cover',
          style: {
            clipPath: clipPaths[index],
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
            id: `reform-effect-${index + 1}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [pieceId],
              type: 'ease-in',
              start: reformStart + offset,
              duration: reformDuration,
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0.3, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'rotate', val: rotation, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                { key: 'translateX', val: position.x, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: position.y, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'blur', val: 4, prog: 0 },
                { key: 'blur', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Outgoing video group container
  const outgoingVideoGroup: RenderableComponentData = {
    id: 'outgoing-video-group',
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
        duration: video1.duration,
      },
    },
    childrenData: outgoingShards,
  };

  // Incoming video group container (starts at overlap)
  const incomingVideoGroup: RenderableComponentData = {
    id: 'incoming-video-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
        },
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
    id: 'glass-shatter-transition-root',
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
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoGroup, incomingVideoGroup],
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
  id: 'glass-shatter-transition',
  title: 'Glass Shatter Transition',
  description:
    'Advanced glass shatter transition with crystalline shards scattering and reforming as a mosaic. Features 12-16 outgoing video layers with unique clip-path polygons, staggered scatter animations with rotation and blur, and 12-16 incoming video layers with inverse clip-paths reforming from scattered positions. Uses a 2-second overlap period where shatter happens 0-1s and mosaic reformation 1-2s.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shatter', 'glass', 'mosaic', 'dramatic', 'crystalline'],
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
    shardCount: 12,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glassShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
